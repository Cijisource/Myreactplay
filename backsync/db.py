import json
import os
from pathlib import Path

import psycopg2

CONFIG_PATH = Path(os.getenv("DB_CONFIG_PATH", "/data/db_config.json"))

POSTGRES = "postgres"
AZURE_SQL = "azure_sql"

DEFAULT_PORTS = {POSTGRES: 5432, AZURE_SQL: 1433}


def env_config() -> dict:
    return {
        "backend": POSTGRES,
        "host": os.getenv("DB_HOST", "db"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "database": os.getenv("DB_NAME", "blynkdb"),
        "user": os.getenv("DB_USER", "blynk"),
        "password": os.getenv("DB_PASSWORD", "blynkpass"),
    }


def load_config() -> dict:
    """Saved configuration wins; otherwise fall back to environment variables."""
    if CONFIG_PATH.exists():
        try:
            saved = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            return {**env_config(), **saved}
        except (OSError, ValueError):
            pass
    return env_config()


def save_config(cfg: dict) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")


def reset_config() -> None:
    if CONFIG_PATH.exists():
        CONFIG_PATH.unlink()


def is_azure(cfg: dict | None = None) -> bool:
    return (cfg or load_config()).get("backend") == AZURE_SQL


def connect(cfg: dict | None = None):
    cfg = cfg or load_config()
    if cfg["backend"] == AZURE_SQL:
        import pymssql

        return pymssql.connect(
            server=cfg["host"],
            port=str(cfg["port"]),
            user=cfg["user"],
            password=cfg["password"],
            database=cfg["database"],
            login_timeout=15,
            timeout=30,
        )
    return psycopg2.connect(
        host=cfg["host"],
        port=cfg["port"],
        dbname=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        connect_timeout=10,
    )


def schema_path(cfg: dict | None = None) -> Path:
    name = "schema_mssql.sql" if is_azure(cfg) else "schema.sql"
    return Path(__file__).resolve().parent / "database" / name


def test_connection(cfg: dict) -> str:
    conn = connect(cfg)
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
    finally:
        conn.close()
    return "Connection successful"
