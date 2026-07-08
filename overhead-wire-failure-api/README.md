# Overhead Wire Failure Prediction API

A **Docker-based FastAPI** service that trains and serves an **XGBoost** binary-classification model to predict failure risk in overhead railway wires.

## Features

| Feature | Detail |
|---|---|
| Algorithm | XGBoost (binary logistic) |
| Training data | Synthetic sensor telemetry (configurable size) |
| Risk levels | LOW / MEDIUM / HIGH / CRITICAL |
| Persistence | Trained model survives container restarts via Docker volume |
| API docs | Auto-generated Swagger UI at `/docs` |

---

## Project Structure

```
overhead-wire-failure-api/
├── app/
│   ├── __init__.py
│   ├── main.py        # FastAPI routes
│   ├── model.py       # XGBoost training & inference
│   └── schemas.py     # Pydantic request / response models
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Build & Run

```bash
cd overhead-wire-failure-api
docker compose up --build
```

The API will be available at `http://localhost:8000`.

### 2. Interactive Docs

Open `http://localhost:8000/docs` in your browser.

---

## API Endpoints

### `GET /health`
Liveness probe.

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

### `POST /train`
Train a new XGBoost model on synthetic overhead-wire sensor data.

**Request body (all fields optional):**
```json
{
  "n_samples": 2000,
  "test_size": 0.2,
  "n_estimators": 200,
  "max_depth": 6,
  "learning_rate": 0.1
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"n_samples": 3000, "n_estimators": 300}'
```

**Response:**
```json
{
  "message": "Model trained successfully.",
  "model_version": "20240101120000-a1b2c3",
  "accuracy": 0.89,
  "roc_auc": 0.94,
  "f1_score": 0.87,
  "feature_importances": {
    "temperature_c": 0.12,
    "age_years": 0.18,
    ...
  }
}
```

---

### `POST /predict`
Predict failure probability for one or more wire-sensor readings.

**Input features:**

| Field | Unit | Description |
|---|---|---|
| `temperature_c` | °C | Wire temperature |
| `tension_kn` | kN | Wire tension |
| `vibration_hz` | Hz | Vibration frequency |
| `current_a` | A | Electrical current |
| `wind_speed_ms` | m/s | Wind speed |
| `age_years` | years | Age of wire section |
| `last_maintenance_days` | days | Days since last maintenance |
| `sag_mm` | mm | Wire sag |
| `corrosion_index` | 0–1 | Corrosion severity |
| `ice_load_kg` | kg | Ice accumulation load |

**Example:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "readings": [{
      "temperature_c": 60,
      "tension_kn": 8,
      "vibration_hz": 5.2,
      "current_a": 450,
      "wind_speed_ms": 12,
      "age_years": 25,
      "last_maintenance_days": 400,
      "sag_mm": 80,
      "corrosion_index": 0.7,
      "ice_load_kg": 15
    }]
  }'
```

**Response:**
```json
{
  "model_version": "20240101120000-a1b2c3",
  "results": [{
    "index": 0,
    "failure_probability": 0.82,
    "predicted_failure": true,
    "risk_level": "CRITICAL"
  }]
}
```

---

### `GET /model/info`
Returns current model version and input feature list.

---

## Risk Level Thresholds

| Risk Level | Failure Probability |
|---|---|
| LOW | < 30 % |
| MEDIUM | 30 % – 55 % |
| HIGH | 55 % – 75 % |
| CRITICAL | ≥ 75 % |

---

## Development (without Docker)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```
