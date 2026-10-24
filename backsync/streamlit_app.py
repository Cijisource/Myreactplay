import os

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

import db

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "blynkdb")
DB_USER = os.getenv("DB_USER", "blynk")
DB_PASSWORD = os.getenv("DB_PASSWORD", "blynkpass")
FETCH_INTERVAL_SECONDS = int(os.getenv("FETCH_INTERVAL_SECONDS", "600"))

TANK_PIN_MAP = {
    "Sintex Tank": {"primary_pin": "V4", "level_pin": "V9", "max_ft": 3.5, "secondary_pins": ["V1", "V2", "V3", "V6"]},
    "Main Tank": {"primary_pin": "V10", "level_pin": "V14", "max_ft": 3.0, "secondary_pins": ["V13"]},
}

PIN_LABELS = {
    "V1": "Water Level",
    "V2": "Temperature",
    "V3": "Flow Rate",
    "V4": "Pump Status",
    "V6": "Battery / Voltage",
    "V9": "Storage Level",
    "V10": "Tank Level",
    "V13": "Overflow / Alarm",
    "V14": "Storage Level",
}


def get_db_connection():
    return db.connect()


@st.cache_data(ttl=15)
def get_job_status() -> pd.DataFrame:
    top, limit = ("TOP 1", "") if db.is_azure() else ("", "LIMIT 1")
    with get_db_connection() as conn:
        return pd.read_sql(
            f"""
            SELECT {top} job_name, status, started_at, finished_at, last_success_at, last_error_at, last_error_message, updated_at
            FROM blynk_job_status
            WHERE job_name = 'blynk_fetch_loop'
            ORDER BY updated_at DESC
            {limit}
            """,
            conn,
        )


@st.cache_data(ttl=30)
def get_health_24h() -> pd.DataFrame:
    if db.is_azure():
        minute_bucket = "DATEADD(minute, DATEDIFF(minute, 0, r.fetched_at), 0)"
        cutoff = "DATEADD(hour, -24, SYSUTCDATETIME())"
    else:
        minute_bucket = "date_trunc('minute', r.fetched_at)"
        cutoff = "NOW() - INTERVAL '24 hours'"
    with get_db_connection() as conn:
        return pd.read_sql(
            f"""
            SELECT d.device_name,
                   COUNT(DISTINCT {minute_bucket}) AS cycles,
                   SUM(CASE WHEN r.value_numeric IS NULL THEN 1 ELSE 0 END) AS null_readings,
                   MAX(r.fetched_at) AS last_fetch
            FROM blynk_readings r
            INNER JOIN blynk_devices d ON d.id = r.device_id
            WHERE r.fetched_at >= {cutoff}
            GROUP BY d.device_name
            """,
            conn,
        )


@st.cache_data(ttl=30)
def get_devices() -> pd.DataFrame:
    with get_db_connection() as conn:
        return pd.read_sql(
            """
            SELECT id, device_name, api_token, api_url, is_active, last_seen_at, created_at
            FROM blynk_devices
            ORDER BY device_name
            """,
            conn,
        )


@st.cache_data(ttl=30)
def get_latest_readings() -> pd.DataFrame:
    with get_db_connection() as conn:
        return pd.read_sql(
            """
            WITH latest AS (
                SELECT device_id, pin_name, MAX(fetched_at) AS fetched_at
                FROM blynk_readings
                GROUP BY device_id, pin_name
            )
            SELECT r.device_id,
                   d.device_name,
                   r.pin_name,
                   COALESCE(r.value_numeric, 0) AS value_numeric,
                   r.value_raw,
                   r.fetched_at,
                   r.raw_payload
            FROM blynk_readings r
            INNER JOIN latest l
                ON r.device_id = l.device_id
               AND r.pin_name = l.pin_name
               AND r.fetched_at = l.fetched_at
            INNER JOIN blynk_devices d
                ON d.id = r.device_id
            ORDER BY d.device_name, r.pin_name
            """,
            conn,
        )


def clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, value))


def format_value(value):
    if value is None or pd.isna(value):
        return "N/A"
    return f"{float(value):.2f}"


def get_pin_value(device_name, pin_name, readings_df):
    if readings_df.empty:
        return None
    match = readings_df[(readings_df["device_name"] == device_name) & (readings_df["pin_name"] == pin_name)]
    if match.empty:
        return None
    return float(match.iloc[0]["value_numeric"])


def status_for_level(value):
    if value is None:
        return "Unknown", "#cbd5e1", "No reading"
    if value < 20:
        return "Low level alert", "#ef4444", "Immediate attention"
    if value < 60:
        return "Warning", "#f59e0b", "Monitor closely"
    return "Healthy", "#22c55e", "Operating normally"


def tank_fill_html(value, label, unit="%", color="#36d399", max_value=100.0):
    raw = float(value) if value is not None else 0.0
    percent = clamp(raw / max_value * 100 if max_value > 0 else 0.0)
    return f"""
        <div class="tank-visual">
            <div class="tank-shell">
                <div class="tank-fill" style="height:{percent}%; background: linear-gradient(180deg, {color}, #1ba4ff);"></div>
            </div>
            <div class="tank-label">{label}</div>
            <div class="tank-value">{format_value(value)} {unit} <span style="font-size:0.75rem;color:#94a3b8;">/ {max_value:g} {unit}</span></div>
        </div>
    """


def gauge_html(value, label, unit="%", min_value=0, max_value=100):
    raw_value = float(value) if value is not None else 0.0
    percent = clamp(((raw_value - min_value) / (max_value - min_value)) * 100 if max_value > min_value else 0)
    color = "#22c55e" if percent >= 60 else "#f59e0b" if percent >= 35 else "#ef4444"
    return f"""
        <div class="gauge-card">
            <div class="gauge-ring" style="--fill:{percent}%; --gauge-color:{color};">
                <div class="gauge-center">
                    <div class="gauge-value">{format_value(raw_value)}</div>
                    <div class="gauge-unit">{unit}</div>
                </div>
            </div>
            <div class="gauge-label">{label}</div>
        </div>
    """


def alert_banner_html(device_name, value):
    status, color, summary = status_for_level(value)
    return f"""
    <div class="alert-banner" style="background: linear-gradient(90deg, {color}22, {color}55); border-left: 6px solid {color};">
        <div class="alert-text">{device_name}</div>
        <div class="alert-status" style="color: {color};">{status}</div>
        <div class="alert-summary">{summary}</div>
    </div>
    """


def build_tank_dashboard(device_name, readings_df):
    config = TANK_PIN_MAP.get(device_name)
    if not config:
        return ""

    primary_pin = config["primary_pin"]
    primary_value = get_pin_value(device_name, primary_pin, readings_df)
    level_value = get_pin_value(device_name, config["level_pin"], readings_df)
    level_percent = None if level_value is None else level_value / config["max_ft"] * 100
    status, color, summary = status_for_level(level_percent)
    secondary_pins = config["secondary_pins"]

    secondary_cards = []
    for pin_name in secondary_pins:
        pin_value = get_pin_value(device_name, pin_name, readings_df)
        label = PIN_LABELS.get(pin_name, pin_name)
        if pin_value is None:
            continue
        secondary_cards.append(
            f"<div class='chip'><span>{label}</span><strong>{format_value(pin_value)}</strong></div>"
        )

    content = f"""
    <style>
        .alert-banner {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 18px;
            border-radius: 14px;
            margin-bottom: 14px;
            font-weight: 700;
        }}
        .alert-text {{
            color: #f8fafc;
            font-size: 1.05rem;
        }}
        .alert-status {{
            font-size: 1.05rem;
            font-weight: 800;
        }}
        .alert-summary {{
            color: #e2e8f0;
            font-size: 0.82rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }}
        .tank-panel {{
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.97), rgba(15, 23, 42, 0.85));
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 18px;
            padding: 18px;
            margin: 12px 0 22px 0;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.3);
        }}
        .tank-header {{
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: #f8fafc;
        }}
        .tank-grid {{
            display: grid;
            grid-template-columns: 1.3fr 1fr 1.2fr;
            gap: 18px;
            align-items: center;
        }}
        .gauge-card {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }}
        .gauge-ring {{
            width: 180px;
            height: 180px;
            border-radius: 50%;
            position: relative;
            background: conic-gradient(var(--gauge-color) 0 var(--fill), #1e293b var(--fill) 100%);
            display: grid;
            place-items: center;
            box-shadow: inset 0 0 20px rgba(15, 23, 42, 0.8);
        }}
        .gauge-ring::before {{
            content: "";
            position: absolute;
            inset: 16px;
            border-radius: 50%;
            background: rgba(15, 23, 42, 0.96);
            border: 2px solid rgba(148, 163, 184, 0.35);
        }}
        .gauge-center {{
            position: relative;
            z-index: 1;
            text-align: center;
        }}
        .gauge-value {{
            font-size: 1.8rem;
            font-weight: 800;
            color: white;
        }}
        .gauge-unit {{
            font-size: 0.8rem;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .gauge-label {{
            margin-top: 12px;
            color: #dbeafe;
            font-weight: 600;
            text-align: center;
        }}
        .tank-visual {{
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
        }}
        .tank-shell {{
            width: 130px;
            height: 180px;
            border-radius: 20px 20px 26px 26px;
            border: 5px solid #94a3b8;
            background: rgba(15, 23, 42, 0.8);
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 0 18px rgba(15, 23, 42, 0.9);
        }}
        .tank-fill {{
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 0 0 18px 18px;
            background: linear-gradient(180deg, #38bdf8, #1d4ed8);
            box-shadow: inset 0 0 10px rgba(255,255,255,0.2);
            transition: height 0.6s ease;
        }}
        .tank-label {{
            margin-top: 10px;
            color: #dbeafe;
            font-weight: 600;
        }}
        .tank-value {{
            color: #f8fafc;
            font-weight: 700;
            font-size: 1.1rem;
        }}
        .chip-grid {{
            display: grid;
            grid-template-columns: repeat(2, minmax(120px, 1fr));
            gap: 12px;
        }}
        .chip {{
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.28);
            border-radius: 12px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }}
        .chip span {{
            color: #cbd5e1;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }}
        .chip strong {{
            color: #f8fafc;
            font-size: 1.2rem;
        }}
        @media (max-width: 900px) {{
            .tank-grid {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
    {alert_banner_html(device_name, level_percent)}
    <div class="tank-panel">
        <div class="tank-header">{device_name}</div>
        <div class="tank-grid">
            {gauge_html(primary_value, 'Tank Level', '%', 0, 100)}
            {tank_fill_html(level_value, 'Storage Level', 'ft', color, config["max_ft"])}
            <div>
                <div class="chip-grid">
                    {''.join(secondary_cards) or '<div class="chip"><span>STATUS</span><strong>Waiting</strong></div>'}
                </div>
            </div>
        </div>
    </div>
    """
    return content


st.set_page_config(page_title="Blynk Tank Monitor", layout="wide")
def render_config_page():
    st.title("Database configuration")
    st.caption("Choose where readings are stored. The fetcher picks up changes on its next cycle.")

    current = db.load_config()
    labels = {db.POSTGRES: "PostgreSQL", db.AZURE_SQL: "Azure SQL Database"}
    backend = st.radio(
        "Database type",
        list(labels),
        format_func=labels.get,
        index=list(labels).index(current["backend"]),
        horizontal=True,
    )
    same_backend = backend == current["backend"]
    default_port = int(current["port"]) if same_backend else db.DEFAULT_PORTS[backend]

    host_help = "e.g. myserver.database.windows.net" if backend == db.AZURE_SQL else "e.g. db"
    host = st.text_input("Server", value=current["host"] if same_backend else "", help=host_help)
    port = st.number_input("Port", min_value=1, max_value=65535, value=default_port, step=1)
    database = st.text_input("Database", value=current["database"] if same_backend else "")
    user = st.text_input("Username", value=current["user"] if same_backend else "")
    password = st.text_input(
        "Password",
        type="password",
        help="Leave blank to keep the saved password.",
    )

    if backend == db.AZURE_SQL:
        st.info(
            "Allow this machine's IP in the Azure SQL server firewall and use a SQL login. "
            "Tables are created automatically if missing."
        )

    candidate = {
        "backend": backend,
        "host": host.strip(),
        "port": int(port),
        "database": database.strip(),
        "user": user.strip(),
        "password": password or (current["password"] if same_backend else ""),
    }

    col_test, col_save, col_reset = st.columns(3)
    if col_test.button("Test connection", use_container_width=True):
        try:
            with st.spinner("Connecting..."):
                st.success(db.test_connection(candidate))
        except Exception as exc:
            st.error(f"Connection failed: {exc}")

    if col_save.button("Save", type="primary", use_container_width=True):
        if not all([candidate["host"], candidate["database"], candidate["user"], candidate["password"]]):
            st.error("Server, database, username and password are required.")
        else:
            try:
                db.test_connection(candidate)
                db.save_config(candidate)
                st.cache_data.clear()
                st.success("Saved. The dashboard and fetcher will use the new database.")
            except Exception as exc:
                st.error(f"Not saved, connection failed: {exc}")

    if col_reset.button("Reset to defaults", use_container_width=True):
        db.reset_config()
        st.cache_data.clear()
        st.success("Reverted to the environment/default PostgreSQL settings.")

    active = db.load_config()
    st.caption(f"Active: {labels[active['backend']]} · {active['host']}:{active['port']} / {active['database']}")


def render_logs_page():
    st.title("Container logs")

    try:
        import docker

        client = docker.from_env()
        containers = sorted(client.containers.list(all=True), key=lambda c: c.name)
    except Exception as exc:
        st.error(
            f"Cannot reach Docker: {exc}. The dashboard container needs "
            "`/var/run/docker.sock` mounted (see docker-compose.yml)."
        )
        return

    if not containers:
        st.info("No containers found.")
        return

    names = [c.name for c in containers]
    col_pick, col_tail, col_filter = st.columns([2, 1, 2])
    selected = col_pick.selectbox("Container", ["All containers"] + names)
    tail = col_tail.number_input("Lines", min_value=10, max_value=5000, value=200, step=50)
    keyword = col_filter.text_input("Filter", placeholder="e.g. ERROR")
    st.button("Refresh")

    targets = containers if selected == "All containers" else [c for c in containers if c.name == selected]
    for container in targets:
        label = f"{container.name} · {container.status}"
        with st.expander(label, expanded=len(targets) == 1):
            try:
                raw = container.logs(tail=int(tail), timestamps=True).decode("utf-8", errors="replace")
            except Exception as exc:
                st.error(f"Could not read logs: {exc}")
                continue
            lines = raw.splitlines()
            if keyword:
                lines = [line for line in lines if keyword.lower() in line.lower()]
            st.code("\n".join(lines) or "No log output.", language="log")


page = st.sidebar.radio("View", ["Dashboard", "Logs", "Configuration"])
if page == "Logs":
    render_logs_page()
    st.stop()
if page == "Configuration":
    render_config_page()
    st.stop()

st.title("Blynk tank monitoring")

try:
    devices = get_devices()
    latest = get_latest_readings()
    job_state = get_job_status()
except Exception as exc:
    st.error(f"Unable to connect to database: {exc}")
    st.stop()

if devices.empty:
    st.warning("No devices have been registered yet.")
    st.stop()

latest = latest.copy()
latest["label"] = latest["pin_name"].map(PIN_LABELS).fillna(latest["pin_name"])
latest["fetched_at"] = pd.to_datetime(latest["fetched_at"])

GREEN, BLUE, AMBER, RED, GREY = "#22c55e", "#38bdf8", "#f59e0b", "#ef4444", "#94a3b8"
now_utc = pd.Timestamp.now(tz="UTC")


def to_utc(value):
    if value is None or pd.isna(value):
        return None
    ts = pd.Timestamp(value)
    return ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")


def tile_html(title, value, subtitle, color):
    return f"""
    <div class="tile" style="border-top: 5px solid {color};">
        <div class="tile-title">{title}</div>
        <div class="tile-value" style="color:{color};">{value}</div>
        <div class="tile-sub">{subtitle}</div>
    </div>
    """


def tiles_page(body, height):
    css = """
    <style>
        body { margin: 0; font-family: sans-serif; }
        .tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
        .tile { background: #0f172a; border-radius: 14px; padding: 16px 18px; }
        .tile-title { color: #94a3b8; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .tile-value { font-size: 1.9rem; font-weight: 800; margin: 6px 0; }
        .tile-sub { color: #cbd5e1; font-size: 0.82rem; }
    </style>
    """
    components.html(css + f'<div class="tile-grid">{body}</div>', height=height)


interval_seconds = max(int(FETCH_INTERVAL_SECONDS), 1)
job_row = job_state.iloc[0] if not job_state.empty else None

job_status = str(job_row["status"]).lower() if job_row is not None else "unknown"
last_success = to_utc(job_row["last_success_at"]) if job_row is not None else None
last_error = to_utc(job_row["last_error_at"]) if job_row is not None else None
last_started = to_utc(job_row["started_at"]) if job_row is not None else None
last_error_message = job_row["last_error_message"] if job_row is not None else None

next_run = None
if last_started is not None:
    next_run = last_started + pd.Timedelta(seconds=interval_seconds)

overdue = next_run is not None and job_status != "running" and now_utc > next_run + pd.Timedelta(seconds=interval_seconds / 2)

if job_status == "running":
    state_label, state_color, state_sub = "RUNNING", BLUE, "Fetch cycle in progress"
elif job_status == "error":
    state_label, state_color, state_sub = "FAILED", RED, "Last cycle failed"
elif job_status == "success" and not overdue:
    state_label, state_color, state_sub = "HEALTHY", GREEN, "Last cycle succeeded"
elif overdue:
    state_label, state_color, state_sub = "STALLED", AMBER, "Scheduler missed its refresh"
else:
    state_label, state_color, state_sub = "UNKNOWN", GREY, "No scheduler status yet"

last_fetch_text = last_success.strftime("%Y-%m-%d %H:%M:%S UTC") if last_success is not None else "N/A"
error_text = str(last_error_message)[:90] if last_error_message and pd.notna(last_error_message) else "No errors recorded"

st.subheader("Scheduler")
countdown_target_ms = int(next_run.timestamp() * 1000) if next_run is not None else 0
countdown_tile = f"""
<div class="tile" style="border-top: 5px solid {BLUE};">
    <div class="tile-title">Next refresh in</div>
    <div class="tile-value" id="cd" style="color:{BLUE};">--:--</div>
    <div class="tile-sub">Every {interval_seconds // 60} min</div>
</div>
<script>
    const target = {countdown_target_ms};
    const el = document.getElementById("cd");
    function tick() {{
        if (!target) {{ el.textContent = "N/A"; return; }}
        const diff = Math.floor((target - Date.now()) / 1000);
        if (diff <= 0) {{ el.textContent = "Due now"; return; }}
        const m = String(Math.floor(diff / 60)).padStart(2, "0");
        const s = String(diff % 60).padStart(2, "0");
        el.textContent = m + ":" + s;
    }}
    tick();
    setInterval(tick, 1000);
</script>
"""
tiles_page(
    tile_html("Job status", state_label, state_sub, state_color)
    + countdown_tile
    + tile_html("Last successful fetch", last_fetch_text.split(" ")[1] if last_success is not None else "N/A", last_fetch_text, GREEN if last_success is not None else GREY)
    + tile_html("Last error", last_error.strftime("%H:%M:%S") if last_error is not None else "None", error_text, RED if last_error is not None else GREEN),
    150,
)

st.subheader("Last 24h health")
try:
    health = get_health_24h()
except Exception as exc:
    st.error(f"Unable to load 24h health: {exc}")
    health = pd.DataFrame()

expected_cycles = max(int(24 * 3600 / interval_seconds), 1)
health_tiles = ""
total_cycles = 0
for device_name in devices["device_name"]:
    match = health[health["device_name"] == device_name] if not health.empty else health
    cycles = int(match.iloc[0]["cycles"]) if not match.empty else 0
    missing = int(match.iloc[0]["null_readings"]) if not match.empty else 0
    last_seen = to_utc(match.iloc[0]["last_fetch"]) if not match.empty else None
    total_cycles += cycles
    uptime = min(cycles / expected_cycles * 100, 100)
    age_min = (now_utc - last_seen).total_seconds() / 60 if last_seen is not None else None
    stale = age_min is None or age_min > interval_seconds / 60 * 2
    color = RED if stale else GREEN if uptime >= 90 else AMBER
    label = "STALE" if stale else "HEALTHY" if uptime >= 90 else "DEGRADED"
    age_text = f"last data {age_min:.0f} min ago" if age_min is not None else "no data"
    health_tiles += tile_html(
        device_name,
        f"{uptime:.0f}%",
        f"{label} | {cycles}/{expected_cycles} fetches | {missing} empty | {age_text}",
        color,
    )

overall_uptime = min(total_cycles / (expected_cycles * max(len(devices), 1)) * 100, 100)
health_tiles = tile_html(
    "Overall fetch success (24h)",
    f"{overall_uptime:.0f}%",
    f"{total_cycles} fetch cycles recorded",
    GREEN if overall_uptime >= 90 else AMBER if overall_uptime >= 60 else RED,
) + health_tiles
tiles_page(health_tiles, 160)

st.subheader("Tank overview")
for device_name in ["Sintex Tank", "Main Tank"]:
    if device_name in latest["device_name"].unique():
        components.html(build_tank_dashboard(device_name, latest), height=480, scrolling=False)

st.subheader("Last fetch values")
value_tiles = ""
for _, r in latest.iterrows():
    value_tiles += tile_html(
        f"{r['device_name']} · {r['label']}",
        format_value(r["value_numeric"]),
        f"{r['pin_name']} · {to_utc(r['fetched_at']).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        BLUE,
    )
rows_needed = max((len(latest) + 3) // 4, 1)
tiles_page(value_tiles, 150 * rows_needed)
