import json
import logging
import os
import re
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

import db

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

FETCH_INTERVAL_SECONDS = int(os.getenv("FETCH_INTERVAL_SECONDS", "600"))
JOB_NAME = "blynk_fetch_loop"

DEVICE_CONFIG = [
    {
        "device_name": os.getenv("BLYNK_DEVICE_1_NAME", "Sintex Tank"),
        "api_token": os.getenv("BLYNK_DEVICE_1_TOKEN", "2NMuxK5u-e8X0yB7nF0Ye459GIGH21jC"),
        "api_url": os.getenv(
            "BLYNK_DEVICE_1_URL",
            "https://blynk.cloud/external/api/get?token=2NMuxK5u-e8X0yB7nF0Ye459GIGH21jC&V1&V2&V3&V4&V6&V9",
        ),
        "pins": (os.getenv("BLYNK_DEVICE_1_PINS", "V1,V2,V3,V4,V6,V9").split(",")),
    },
    {
        "device_name": os.getenv("BLYNK_DEVICE_2_NAME", "Main Tank"),
        "api_token": os.getenv("BLYNK_DEVICE_2_TOKEN", "w-R8a_nmrqsPSdWhD7WFTKn02G6ptVtu"),
        "api_url": os.getenv(
            "BLYNK_DEVICE_2_URL",
            "https://blynk.cloud/external/api/get?token=w-R8a_nmrqsPSdWhD7WFTKn02G6ptVtu&V10&V14&V13",
        ),
        "pins": (os.getenv("BLYNK_DEVICE_2_PINS", "V10,V14,V13").split(",")),
    },
]


def utc_now(cfg: dict) -> datetime:
    """Azure SQL DATETIME2 has no zone, so store naive UTC there."""
    now = datetime.now(timezone.utc)
    return now.replace(tzinfo=None) if db.is_azure(cfg) else now


def naive_for(cfg: dict, value: datetime) -> datetime:
    if db.is_azure(cfg) and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def initialize_database(cfg: dict) -> None:
    script = db.schema_path(cfg).read_text(encoding="utf-8-sig")
    # T-SQL scripts are split into batches on GO lines; Postgres runs as one script.
    batches = re.split(r"^\s*GO\s*$", script, flags=re.MULTILINE | re.IGNORECASE) if db.is_azure(cfg) else [script]
    conn = db.connect(cfg)
    try:
        if not db.is_azure(cfg):
            conn.autocommit = True
        cur = conn.cursor()
        for batch in batches:
            if batch.strip():
                cur.execute(batch)
        conn.commit()
    finally:
        conn.close()
    logging.info("Database schema initialized (%s)", cfg["backend"])


def set_job_status(cfg: dict, status: str, started_at=None, finished_at=None, last_error_message: str | None = None) -> None:
    now = utc_now(cfg)
    started_at = naive_for(cfg, started_at) if started_at else now
    finished_at = naive_for(cfg, finished_at) if finished_at else now
    success_at = finished_at if status == "success" else None
    error_at = finished_at if status == "error" else None

    conn = db.connect(cfg)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE blynk_job_status
            SET status = %s,
                started_at = %s,
                finished_at = %s,
                last_success_at = COALESCE(%s, last_success_at),
                last_error_at = COALESCE(%s, last_error_at),
                last_error_message = COALESCE(%s, last_error_message),
                updated_at = %s
            WHERE job_name = %s
            """,
            (status, started_at, finished_at, success_at, error_at, last_error_message, now, JOB_NAME),
        )
        if cur.rowcount == 0:
            cur.execute(
                """
                INSERT INTO blynk_job_status (
                    job_name, status, started_at, finished_at,
                    last_success_at, last_error_at, last_error_message, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (JOB_NAME, status, started_at, finished_at, success_at, error_at, last_error_message, now),
            )
        conn.commit()
    finally:
        conn.close()
    logging.info("Job status updated: %s (%s)", status, JOB_NAME)


def parse_numeric(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).strip()
    if cleaned.lower() in {"null", "none", "nan"}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def fetch_values(api_url: str, expected_pins):
    response = requests.get(api_url, timeout=25)
    response.raise_for_status()
    payload = response.json()

    if isinstance(payload, list):
        if len(payload) != len(expected_pins):
            raise ValueError(
                f"Unexpected response size for {api_url}: expected {len(expected_pins)}, received {len(payload)}"
            )
        return {pin_name: value for pin_name, value in zip(expected_pins, payload)}

    if isinstance(payload, dict):
        normalized = {}
        for pin_name in expected_pins:
            for key, value in payload.items():
                if str(key).upper() == pin_name.upper():
                    normalized[pin_name] = value
                    break
            if pin_name not in normalized:
                normalized[pin_name] = payload.get(pin_name) or payload.get(pin_name.lower())
        return normalized

    raise ValueError(f"Unsupported Blynk payload type for {api_url}: {type(payload).__name__}")


def upsert_device(conn, cfg: dict, config: dict) -> int:
    now = utc_now(cfg)
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE blynk_devices
        SET device_name = %s, api_url = %s, is_active = %s, updated_at = %s, last_seen_at = %s
        WHERE api_token = %s
        """,
        (config["device_name"], config["api_url"], True, now, now, config["api_token"]),
    )
    if cur.rowcount == 0:
        cur.execute(
            """
            INSERT INTO blynk_devices (device_name, api_token, api_url, is_active, updated_at, last_seen_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (config["device_name"], config["api_token"], config["api_url"], True, now, now),
        )
    cur.execute("SELECT id FROM blynk_devices WHERE api_token = %s", (config["api_token"],))
    result = cur.fetchone()
    if result is None:
        raise RuntimeError(f"Failed to upsert device {config['device_name']}")
    return int(result[0])


def ensure_pin(conn, cfg: dict, device_id: int, pin_name: str) -> int:
    now = utc_now(cfg)
    cur = conn.cursor()
    cur.execute(
        "UPDATE blynk_pins SET pin_label = %s, updated_at = %s WHERE device_id = %s AND pin_name = %s",
        (pin_name, now, device_id, pin_name),
    )
    if cur.rowcount == 0:
        cur.execute(
            "INSERT INTO blynk_pins (device_id, pin_name, pin_label, updated_at) VALUES (%s, %s, %s, %s)",
            (device_id, pin_name, pin_name, now),
        )
    cur.execute("SELECT id FROM blynk_pins WHERE device_id = %s AND pin_name = %s", (device_id, pin_name))
    result = cur.fetchone()
    if result is None:
        raise RuntimeError(f"Failed to upsert pin {device_id}:{pin_name}")
    return int(result[0])


def persist_readings(conn, cfg: dict, device_id: int, values_by_pin: dict, api_url: str) -> None:
    now = utc_now(cfg)
    cur = conn.cursor()
    for pin_name, raw_value in values_by_pin.items():
        pin_id = ensure_pin(conn, cfg, device_id, pin_name)
        cur.execute(
            """
            INSERT INTO blynk_readings (
                device_id, pin_id, pin_name, value_numeric, value_raw, raw_payload, fetched_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                device_id,
                pin_id,
                pin_name,
                parse_numeric(raw_value),
                str(raw_value) if raw_value is not None else None,
                json.dumps({"api_url": api_url, "pin_name": pin_name, "value": raw_value}),
                now,
            ),
        )


def fetch_device_data(cfg: dict, config: dict):
    values_by_pin = fetch_values(config["api_url"], config["pins"])
    conn = db.connect(cfg)
    try:
        device_id = upsert_device(conn, cfg, config)
        persist_readings(conn, cfg, device_id, values_by_pin, config["api_url"])
        conn.commit()
    finally:
        conn.close()
    logging.info("Fetched %s readings for %s", len(values_by_pin), config["device_name"])


def run_cycle(cfg: dict) -> None:
    start_time = datetime.now(timezone.utc)
    set_job_status(cfg, "running", started_at=start_time, finished_at=start_time)
    try:
        for config in DEVICE_CONFIG:
            fetch_device_data(cfg, config)
        set_job_status(cfg, "success", started_at=start_time, finished_at=datetime.now(timezone.utc))
    except Exception as exc:
        logging.exception("Blynk fetch loop failed: %s", exc)
        set_job_status(
            cfg,
            "error",
            started_at=start_time,
            finished_at=datetime.now(timezone.utc),
            last_error_message=str(exc),
        )


def main() -> None:
    initialized_for = None
    while True:
        # Re-read the saved configuration every cycle so changes from the dashboard apply without a restart.
        cfg = db.load_config()
        try:
            if initialized_for != cfg:
                initialize_database(cfg)
                initialized_for = cfg
            run_cycle(cfg)
        except Exception as exc:
            logging.exception("Cycle skipped, database unavailable: %s", exc)
        logging.info("Waiting %s seconds before next refresh", FETCH_INTERVAL_SECONDS)
        time.sleep(FETCH_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
