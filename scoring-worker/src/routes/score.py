from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Response, status
from pydantic import TypeAdapter, ValidationError

from src.hashing import HashService
from src.scoring import BatchResponse, CarrierInput, ScoreResult, ScoringService
from src.scoring.constants import (
    CAUTION_TIER_MIN,
    SAFE_TIER_MIN,
    get_weights_dict,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["score"])
scoring_service = ScoringService()
hash_service = HashService()


@router.get("/weights")
def get_weights() -> dict[str, Any]:
    """Return current factor weights and tier thresholds."""
    return {
        "weights": get_weights_dict(),
        "tiers": {
            "SAFE_min": SAFE_TIER_MIN,
            "CAUTION_min": CAUTION_TIER_MIN,
            "RISK": "< CAUTION_min",
        },
    }


@router.post("", response_model=ScoreResult, status_code=status.HTTP_200_OK)
def score_single(carrier: CarrierInput) -> ScoreResult:
    total_score, tier, breakdown, explanations = scoring_service.score_carrier(carrier)
    return ScoreResult(
        dot_number=carrier.dot_number,
        legal_name=carrier.legal_name,
        total_score=total_score,
        tier=tier,
        breakdown=breakdown,
        content_hash=hash_service.compute_hash(carrier),
        authority_status=carrier.authority_status or "Unknown",
        raw_data=carrier.model_dump(mode="python"),
        changed=False,
        explanations=explanations,
    )


@router.post("/batch", response_model=BatchResponse, status_code=status.HTTP_200_OK)
def score_batch(response: Response, payload: dict[str, Any] = Body(...)) -> BatchResponse:
    records_raw = payload.get("records")
    if not isinstance(records_raw, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="records must be a list",
        )

    previous_hashes_raw = payload.get("previous_hashes")
    previous_hashes: dict[str, str] = {}
    try:
        if previous_hashes_raw is not None:
            previous_hashes = TypeAdapter(dict[str, str]).validate_python(previous_hashes_raw)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="previous_hashes must be an object mapping dot_number to hash",
        ) from exc

    results: list[ScoreResult] = []
    errors: list[dict[str, str]] = []
    for index, raw_record in enumerate(records_raw):
        try:
            carrier = CarrierInput.model_validate(raw_record)
            total_score, tier, breakdown, explanations = scoring_service.score_carrier(carrier)
            current_hash = hash_service.compute_hash(carrier)
            previous_hash = previous_hashes.get(carrier.dot_number)
            results.append(
                ScoreResult(
                    dot_number=carrier.dot_number,
                    legal_name=carrier.legal_name,
                    total_score=total_score,
                    tier=tier,
                    breakdown=breakdown,
                    content_hash=current_hash,
                    authority_status=carrier.authority_status or "Unknown",
                    raw_data=carrier.model_dump(mode="python"),
                    changed=hash_service.has_changed(carrier, previous_hash),
                    explanations=explanations,
                )
            )
        except ValidationError as exc:
            dot_number = "unknown"
            if isinstance(raw_record, dict):
                dot_value = raw_record.get("dot_number")
                if dot_value is not None:
                    dot_number = str(dot_value)
            errors.append({"dot_number": dot_number, "reason": str(exc)})
            logger.warning("Invalid batch record at index %s: %s", index, exc)

    if errors:
        response.status_code = status.HTTP_207_MULTI_STATUS

    return BatchResponse(
        results=results,
        total=len(records_raw),
        processed=len(results),
        errors=errors,
    )
