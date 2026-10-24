# Blynk tank monitor

Polls two Blynk devices every 10 minutes, stores readings in a database, and shows a live Streamlit dashboard.

| Service | Container | Purpose |
|---|---|---|
| `db` | `blynk-db` | PostgreSQL 16 (default storage) |
| `app` | `blynk-fetcher` | Python job that fetches Blynk pins every `FETCH_INTERVAL_SECONDS` (600) |
| `dashboard` | `blynk-dashboard` | Streamlit UI on port 8501 |

## Devices and pins

| Device | Token env var | Pins |
|---|---|---|
| Sintex Tank | `BLYNK_DEVICE_1_TOKEN` | V1, V2, V3, V4, V6, V9 |
| Main Tank | `BLYNK_DEVICE_2_TOKEN` | V10, V14, V13 |

On the dashboard:

- **Tank Level gauge (%):** V4 (Sintex Tank) and V10 (Main Tank).
- **Storage Level bottle (ft):** V9 (Sintex Tank, max 3.5 ft) and V14 (Main Tank, max 3 ft).
- **Alerts:** based on Storage Level as a share of the tank maximum. Below 20% is a low level alert, below 60% is a warning, and 60% and above is healthy.

## Database schema

Tables are created automatically with `IF NOT EXISTS` semantics.

- `blynk_devices`: device name, token, API URL
- `blynk_pins`: pins per device
- `blynk_readings`: timestamped values (numeric, raw, payload)
- `blynk_job_status`: fetch job state (running / success / error), last success and last error

Schemas: `database/schema.sql` (PostgreSQL) and `database/schema_mssql.sql` (Azure SQL).

## Dashboard

- Job status tile: RUNNING, FAILED, HEALTHY or STALLED
- Countdown to the next refresh, last successful fetch, last error
- Last 24h health: fetch success rate per device and overall
- Tank gauges and storage bottles with alert banners
- Latest value tiles, with no raw tables
- **Logs** page (sidebar): view, filter and refresh logs of every container (or one)

## Configuration screen (PostgreSQL or Azure SQL)

Open the dashboard and pick **Configuration** in the sidebar.

1. Choose **PostgreSQL** or **Azure SQL Database**.
2. Enter server (for example `myserver.database.windows.net`), port, database, username and password.
3. **Test connection**, then **Save**. Saving tests the connection first.
4. The fetcher re-reads the settings every cycle, creates the tables if missing, and starts writing to the new database. No restart is needed.

**Reset to defaults** goes back to the `DB_*` environment variables (the bundled PostgreSQL).

Notes:

- Settings are saved to `/data/db_config.json` on the shared `app_config` volume. The password is stored there in plain text, so protect the volume.
- Azure SQL needs your IP allowed in the server firewall and a SQL login.
- Switching database does not migrate existing history.

## Run

```bash
cp .env.example .env
docker compose up --build -d
docker compose logs -f app
```

Dashboard: http://localhost:8501

## Environment variables

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `FETCH_INTERVAL_SECONDS`, `DB_CONFIG_PATH` (default `/data/db_config.json`), and `BLYNK_DEVICE_{1,2}_{NAME,TOKEN,URL,PINS}`.

## Publish images

```bash
chmod +x build_and_push.sh
DOCKERHUB_USER=myuser ./build_and_push.sh [tag]
```

Builds and pushes `<user>/blynk-fetcher` and `<user>/blynk-dashboard`. Set `DOCKERHUB_TOKEN` to log in non-interactively.
