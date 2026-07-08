"""
XGBoost model training and inference for overhead-wire failure prediction.
"""

import os
import logging
import pickle
import uuid
from datetime import datetime
from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    "temperature_c",
    "tension_kn",
    "vibration_hz",
    "current_a",
    "wind_speed_ms",
    "age_years",
    "last_maintenance_days",
    "sag_mm",
    "corrosion_index",
    "ice_load_kg",
]

MODEL_PATH = os.getenv("MODEL_PATH", "/app/models/wire_failure_model.pkl")
SCALER_PATH = os.getenv("SCALER_PATH", "/app/models/wire_failure_scaler.pkl")
VERSION_PATH = os.getenv("VERSION_PATH", "/app/models/model_version.txt")


# ──────────────────────────────────────────────────────────────────────────────
# Synthetic data generation
# ──────────────────────────────────────────────────────────────────────────────

def _generate_synthetic_data(n_samples: int, random_state: int = 42) -> pd.DataFrame:
    """
    Generate realistic synthetic sensor data for overhead railway wires.
    Failure label is derived from a domain-informed risk formula so the
    XGBoost model can learn meaningful feature relationships.
    """
    rng = np.random.default_rng(random_state)

    df = pd.DataFrame(
        {
            "temperature_c": rng.normal(35, 20, n_samples).clip(-20, 120),
            "tension_kn": rng.normal(15, 5, n_samples).clip(2, 35),
            "vibration_hz": rng.exponential(2, n_samples).clip(0, 20),
            "current_a": rng.normal(300, 80, n_samples).clip(50, 700),
            "wind_speed_ms": rng.exponential(5, n_samples).clip(0, 40),
            "age_years": rng.uniform(0, 40, n_samples),
            "last_maintenance_days": rng.uniform(0, 730, n_samples),
            "sag_mm": rng.normal(50, 15, n_samples).clip(0, 150),
            "corrosion_index": rng.beta(2, 5, n_samples),
            "ice_load_kg": rng.exponential(3, n_samples).clip(0, 50),
        }
    )

    # Risk score derived from domain knowledge
    risk = (
        0.02 * df["temperature_c"].clip(0, None)
        + 0.03 * df["age_years"]
        + 0.002 * df["last_maintenance_days"]
        + 0.15 * df["corrosion_index"]
        + 0.01 * df["vibration_hz"]
        + 0.005 * df["wind_speed_ms"]
        + 0.002 * df["ice_load_kg"]
        - 0.05 * df["tension_kn"].clip(0, None)
        + rng.normal(0, 0.3, n_samples)
    )

    # Sigmoid to get failure probability, then threshold
    prob = 1 / (1 + np.exp(-risk))
    df["failure"] = (prob > 0.55).astype(int)
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Training
# ──────────────────────────────────────────────────────────────────────────────

def train_model(
    n_samples: int = 2000,
    test_size: float = 0.2,
    n_estimators: int = 200,
    max_depth: int = 6,
    learning_rate: float = 0.1,
) -> dict:
    logger.info("Generating %d synthetic training samples …", n_samples)
    df = _generate_synthetic_data(n_samples)

    X = df[FEATURE_COLUMNS].values
    y = df["failure"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train_s,
        y_train,
        eval_set=[(X_test_s, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test_s)
    y_prob = model.predict_proba(X_test_s)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "f1_score": float(f1_score(y_test, y_pred)),
    }

    feature_importances = dict(
        zip(FEATURE_COLUMNS, model.feature_importances_.tolist())
    )

    version = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

    _persist(model, scaler, version)

    logger.info("Training complete. Metrics: %s", metrics)
    return {**metrics, "feature_importances": feature_importances, "version": version}


def _persist(model, scaler, version: str) -> None:
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as fh:
        pickle.dump(model, fh)
    with open(SCALER_PATH, "wb") as fh:
        pickle.dump(scaler, fh)
    with open(VERSION_PATH, "w") as fh:
        fh.write(version)
    logger.info("Model persisted (version=%s)", version)


# ──────────────────────────────────────────────────────────────────────────────
# Inference helpers
# ──────────────────────────────────────────────────────────────────────────────

def load_artifacts() -> Tuple[object, object, str]:
    """Load model, scaler and version from disk. Raises FileNotFoundError if not trained yet."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "No trained model found. POST /train first to train a model."
        )
    with open(MODEL_PATH, "rb") as fh:
        model = pickle.load(fh)
    with open(SCALER_PATH, "rb") as fh:
        scaler = pickle.load(fh)
    version = open(VERSION_PATH).read().strip() if os.path.exists(VERSION_PATH) else "unknown"
    return model, scaler, version


def _risk_level(prob: float) -> str:
    if prob < 0.3:
        return "LOW"
    if prob < 0.55:
        return "MEDIUM"
    if prob < 0.75:
        return "HIGH"
    return "CRITICAL"


def predict(readings: list) -> Tuple[list, str]:
    """
    Run inference on a list of WireSensorReading dicts.
    Returns (list_of_result_dicts, model_version).
    """
    model, scaler, version = load_artifacts()

    rows = [
        [r[col] for col in FEATURE_COLUMNS]
        for r in readings
    ]
    X = np.array(rows, dtype=float)
    X_s = scaler.transform(X)

    probs = model.predict_proba(X_s)[:, 1]

    results = [
        {
            "index": i,
            "failure_probability": float(p),
            "predicted_failure": bool(p >= 0.5),
            "risk_level": _risk_level(float(p)),
        }
        for i, p in enumerate(probs)
    ]
    return results, version
