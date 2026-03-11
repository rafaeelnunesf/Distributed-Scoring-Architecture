"""Pydantic models for the scoring service."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class FactorExplanation(BaseModel):
    """Per-factor explainability for the score."""

    factor: str
    points: float
    max_points: float
    weight_pct: float
    input_value: str | float | int | None
    description: str


class CarrierInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    dot_number: str = Field(..., min_length=1)
    legal_name: str = Field(..., min_length=1)
    safety_rating: str | None = None
    oos_rate: float | None = Field(default=None, ge=0.0, le=100.0)
    crash_total: int | None = Field(default=None, ge=0)
    driver_oos_rate: float | None = Field(default=None, ge=0.0, le=100.0)
    insurance_status: str | None = None
    authority_status: str | None = None


class ScoreBreakdown(BaseModel):
    safety_rating: float = Field(..., ge=0.0, le=25.0)
    oos_pct: float = Field(..., ge=0.0, le=20.0)
    crash_total: float = Field(..., ge=0.0, le=20.0)
    driver_oos: float = Field(..., ge=0.0, le=15.0)
    insurance: float = Field(..., ge=0.0, le=10.0)
    authority: float = Field(..., ge=0.0, le=10.0)


class ScoreResult(BaseModel):
    dot_number: str
    legal_name: str
    total_score: float = Field(..., ge=0.0, le=100.0)
    tier: Literal["SAFE", "CAUTION", "RISK"]
    breakdown: ScoreBreakdown
    content_hash: str
    authority_status: str
    raw_data: dict[str, Any]
    changed: bool
    explanations: list[FactorExplanation] = Field(default_factory=list)
    risk_narrative: str | None = None  # Placeholder for future LLM-generated summary


class BatchRequest(BaseModel):
    records: list[CarrierInput]
    previous_hashes: dict[str, str] | None = None


class BatchResponse(BaseModel):
    results: list[ScoreResult]
    total: int
    processed: int
    errors: list[dict[str, str]]
