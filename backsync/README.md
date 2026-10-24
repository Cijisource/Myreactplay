# Blynk tank monitor

Polls two Blynk devices every 10 minutes, stores the readings in a database (PostgreSQL or Azure SQL), and shows a live Streamlit dashboard with job health, tank visuals, container logs and a database configuration screen.

## Contents

- [Architecture](#architecture)
- [Project layout](#project-layout)
- [Quick start](#quick-start)
- [Devices and pins](#devices-and-pins)
- [Fetcher](#fetcher)
- [Database schema](#database-schema)
- [Dashboard](#dashboard)
- [Configuration screen](#configuration-screen-postgresql-or-azure-sql)
- [Logs screen](#logs-screen)
- [Environment variables](#environment-variables)
- [Publish images to Docker Hub](#publish-images-to-docker-hub)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

## Architecture

| Service | Container | Purpose |
|---|---|---|
| `db` | `blynk-db` | PostgreSQL 16, the default storage |
| `app` | `blynk-fetcher` | Python job that fetches the Blynk pins every `FETCH_INTERVAL_SECONDS` (600 s) |
| `dashboard` | `blynk-dashboard` | Streamlit UI on port 8501 |

The fetcher and the dashboard share an `app_config` volume mounted at `/data`. It holds the database settings saved from the Configuration screen.

## Project layout

| File | Purpose |
|---|---|
| `app.py` | Fetch loop, job status tracking, portable upserts for both databases |
| `db.py` | Connection factory, saved/env configuration, backend selection |
| `streamlit_app.py` | Dashboard, Configuration screen and Logs screen |
| `database/schema.sql` | PostgreSQL schema (`IF NOT EXISTS`) |
| `database/schema_mssql.sql` | Azure SQL schema (`IF OBJECT_ID ... IS NULL`, batches split on `GO`) |
| `Dockerfile`, `Dockerfile.streamlit` | Fetcher and dashboard images |
| `docker-compose.yml` | The three services and volumes |
| `build_and_push.sh` | Build and push both images to Docker Hub |
| `.env`, `.env.example` | Database and Blynk configuration |

## Quick start

```bash
cp .env.example .env
docker compose up --build -d
docker compose logs -f app
```

Dashboard: http://localhost:8501

## Devices and pins

| Device | Token env var | Pins fetched |
|---|---|---|
| Sintex Tank | `BLYNK_DEVICE_1_TOKEN` | V1, V2, V3, V4, V6, V9 |
| Main Tank | `BLYNK_DEVICE_2_TOKEN` | V10, V14, V13 |

Pins shown on the dashboard:

| Device | Tank Level gauge (%) | Storage Level bottle (ft) | Bottle maximum | Info chips |
|---|---|---|---|---|
| Sintex Tank | V4 | V9 | 3.5 ft | V1, V2, V3, V6 |
| Main Tank | V10 | V14 | 3.0 ft | V13 |

Storage Level is assumed to be reported in feet by V9 and V14, and is used without conversion.

## Fetcher

- Runs a cycle every `FETCH_INTERVAL_SECONDS`, calling each device's Blynk URL and storing one row per pin.
- Records job state in `blynk_job_status`: `running` at the start, then `success` or `error` with the error message.
- Re-reads the saved database configuration at the start of every cycle. Changes made on the Configuration screen apply without a restart.
- Creates the tables on first connection to a database (`IF NOT EXISTS` semantics).
- Uses plain UPDATE-then-INSERT instead of `ON CONFLICT`, so the same code works on PostgreSQL and Azure SQL. Timestamps are stored in UTC.
- If the database is unreachable, the cycle is skipped and retried on the next one.

## Database schema

| Table | Contents |
|---|---|
| `blynk_devices` | Device name, token, API URL, last seen |
| `blynk_pins` | Pins per device |
| `blynk_readings` | Timestamped values (numeric, raw, payload) |
| `blynk_job_status` | Job state (running / success / error), last success, last error and message |

## Dashboard

Pick **Dashboard**, **Logs** or **Configuration** in the sidebar.

The Dashboard view uses tiles only, with no raw tables.

- **Scheduler tiles**
  - Job status: RUNNING, FAILED, HEALTHY, or STALLED when no new cycle started within 1.5x the interval.
  - Live countdown to the next refresh (last cycle start plus the interval). It shows "Due now" once that passes.
  - Last successful fetch and last error, with a short message.
- **Last 24h health**
  - One overall tile and one tile per device.
  - The success rate is the number of distinct fetch cycles with data in the last 24 h divided by the number expected.
  - Each tile shows the fetch count, empty readings and how long ago data last arrived.
  - A device is STALE if its data is older than twice the interval, DEGRADED below 90%, otherwise HEALTHY.
- **Tank panels**
  - Tank Level gauge, Storage Level bottle in feet (with the tank maximum) and info chips.
  - The alert banner follows Storage Level as a share of the tank maximum: below 20% is a low level alert, below 60% is a warning, 60% and above is healthy.
- **Last fetch values:** one tile per pin with its latest value and timestamp.

The 24h success rate is derived from stored readings, because failed cycles are not stored per cycle.

## Configuration screen (PostgreSQL or Azure SQL)

1. Choose **PostgreSQL** or **Azure SQL Database**.
2. Enter server (for example `myserver.database.windows.net`), port, database, username and password. A blank password keeps the saved one.
3. **Test connection**, then **Save**. Saving tests the connection first.
4. The fetcher picks it up on its next cycle and creates the tables if missing.

**Reset to defaults** goes back to the `DB_*` environment variables (the bundled PostgreSQL).

- Settings are saved to `/data/db_config.json` on the `app_config` volume.
- Azure SQL needs your IP allowed in the server firewall and a SQL login.
- Switching database does not migrate existing history.

## Logs screen

Shows the logs of every container on the Docker host, or one you select.

- Controls: container selector (default "All containers"), line count, text filter (for example `ERROR`) and a Refresh button.
- Each container is shown in its own expander with its status. Lines are timestamped.
- Needs `/var/run/docker.sock` mounted into the dashboard container, which `docker-compose.yml` already does.
- The list includes every container on the host, not only this stack's.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` | `db` | Database server |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `blynkdb` | Database name |
| `DB_USER` | `blynk` | Database user |
| `DB_PASSWORD` | `blynkpass` | Database password |
| `FETCH_INTERVAL_SECONDS` | `600` | Fetch interval, also used for the countdown and health maths |
| `DB_CONFIG_PATH` | `/data/db_config.json` | Where the saved configuration lives |
| `BLYNK_DEVICE_{1,2}_NAME` | Sintex Tank / Main Tank | Device label |
| `BLYNK_DEVICE_{1,2}_TOKEN` | see `.env.example` | Blynk token |
| `BLYNK_DEVICE_{1,2}_URL` | see `.env.example` | Blynk API URL |
| `BLYNK_DEVICE_{1,2}_PINS` | see above | Pins to store |

## Publish images to Docker Hub

```bash
chmod +x build_and_push.sh
DOCKERHUB_USER=myuser ./build_and_push.sh [tag]
```

Builds and pushes `<user>/blynk-fetcher` and `<user>/blynk-dashboard` (plus `latest` when a tag is given). Set `DOCKERHUB_TOKEN` to log in non-interactively, otherwise it uses your existing `docker login`.

## Security notes

- The Blynk tokens are in `.env` and as defaults in `app.py`. `.env` is git-ignored, but the defaults are in source, so do not publish the code or images publicly without removing them.
- The Configuration screen stores the database password in plain text on the `app_config` volume.
- Mounting `/var/run/docker.sock` gives the dashboard container control of Docker on the host. Keep port 8501 on a trusted network or put it behind authentication.
- The dashboard has no login of its own.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `syntax error at or near "CREATE"` | The schema file had a UTF-8 BOM. It is stripped and the fetcher reads with `utf-8-sig`. Rebuild the fetcher. |
| `pip install` fails during build | Check every pin in `requirements.txt` exists for Python 3.12 on Linux. |
| Logs page: "Cannot reach Docker" | Mount `/var/run/docker.sock` into the dashboard container. On Docker Desktop for Windows the mount may not work. |
| Azure SQL connection fails | Allow your IP in the server firewall, and use a SQL login. |
| Dashboard shows STALLED | The fetcher has not started a cycle within 1.5x the interval. Check `docker compose logs app`. |
| Docker was not tested | The code was syntax-checked and the configuration logic was tested with a stub, but the full stack has not been run end to end. |
