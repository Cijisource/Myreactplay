from pydantic import BaseModel, Field
from typing import Optional, List


class WireSensorReading(BaseModel):
    """Single overhead-wire sensor reading used for prediction."""

    temperature_c: float = Field(..., description="Wire temperature in °C")
    tension_kn: float = Field(..., description="Wire tension in kN")
    vibration_hz: float = Field(..., description="Vibration frequency in Hz")
    current_a: float = Field(..., description="Electrical current in Amperes")
    wind_speed_ms: float = Field(..., description="Wind speed in m/s")
    age_years: float = Field(..., description="Age of the wire section in years")
    last_maintenance_days: float = Field(
        ..., description="Days since last maintenance"
    )
    sag_mm: float = Field(..., description="Wire sag measured in mm")
    corrosion_index: float = Field(
        ..., ge=0.0, le=1.0, description="Corrosion severity index [0–1]"
    )
    ice_load_kg: float = Field(..., description="Ice accumulation load in kg")


class PredictionRequest(BaseModel):
    readings: List[WireSensorReading]


class PredictionResult(BaseModel):
    index: int
    failure_probability: float = Field(..., ge=0.0, le=1.0)
    predicted_failure: bool
    risk_level: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")


class PredictionResponse(BaseModel):
    model_version: str
    results: List[PredictionResult]


class TrainRequest(BaseModel):
    n_samples: int = Field(
        default=2000, ge=100, le=50000,
        description="Number of synthetic training samples to generate"
    )
    test_size: float = Field(default=0.2, ge=0.05, le=0.5)
    n_estimators: int = Field(default=200, ge=10, le=1000)
    max_depth: int = Field(default=6, ge=2, le=12)
    learning_rate: float = Field(default=0.1, ge=0.001, le=1.0)


class TrainResponse(BaseModel):
    message: str
    model_version: str
    accuracy: float
    roc_auc: float
    f1_score: float
    feature_importances: dict
