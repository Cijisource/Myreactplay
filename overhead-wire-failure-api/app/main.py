"""
FastAPI application – Overhead Wire Failure Prediction
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app.schemas import (
    PredictionRequest,
    PredictionResponse,
    PredictionResult,
    TrainRequest,
    TrainResponse,
)
from app import model as ml

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warn on startup if no trained model exists yet."""
    try:
        _, _, version = ml.load_artifacts()
        logger.info("Loaded existing model (version=%s)", version)
    except FileNotFoundError:
        logger.warning("No pre-trained model found. POST /train to create one.")
    yield


app = FastAPI(
    title="Overhead Wire Failure Prediction API",
    description=(
        "Train and serve an XGBoost binary-classification model that predicts "
        "failure risk for overhead railway wires based on sensor telemetry."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe."""
    return {"status": "ok"}


# ──────────────────────────────────────────────────────────────────────────────
# Training
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/train", response_model=TrainResponse, tags=["Model"])
def train(request: TrainRequest):
    """
    Generate synthetic overhead-wire sensor data and train an XGBoost
    failure-prediction model.  The trained model is persisted to the
    `/app/models` volume so it survives container restarts.
    """
    try:
        result = ml.train_model(
            n_samples=request.n_samples,
            test_size=request.test_size,
            n_estimators=request.n_estimators,
            max_depth=request.max_depth,
            learning_rate=request.learning_rate,
        )
    except Exception as exc:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return TrainResponse(
        message="Model trained successfully.",
        model_version=result["version"],
        accuracy=result["accuracy"],
        roc_auc=result["roc_auc"],
        f1_score=result["f1_score"],
        feature_importances=result["feature_importances"],
    )


# ──────────────────────────────────────────────────────────────────────────────
# Prediction
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse, tags=["Model"])
def predict(request: PredictionRequest):
    """
    Predict failure probability for one or more wire-sensor readings.
    Returns a risk level (LOW / MEDIUM / HIGH / CRITICAL) per reading.
    """
    if not request.readings:
        raise HTTPException(status_code=422, detail="'readings' must not be empty.")

    readings_dicts = [r.model_dump() for r in request.readings]

    try:
        raw_results, version = ml.predict(readings_dicts)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return PredictionResponse(
        model_version=version,
        results=[PredictionResult(**r) for r in raw_results],
    )


# ──────────────────────────────────────────────────────────────────────────────
# Model info
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/model/info", tags=["Model"])
def model_info():
    """Return current model version and feature list."""
    try:
        _, _, version = ml.load_artifacts()
    except FileNotFoundError:
        return JSONResponse(
            status_code=409,
            content={"detail": "No model trained yet. POST /train first."},
        )
    return {
        "model_version": version,
        "features": ml.FEATURE_COLUMNS,
        "algorithm": "XGBoost (binary:logistic)",
    }
