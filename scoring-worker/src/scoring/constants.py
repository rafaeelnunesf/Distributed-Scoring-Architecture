"""Constants used by the carrier scoring algorithm."""

import os

# Configurable weights (must sum to 100); read from env with defaults
WEIGHT_SAFETY_RATING = float(os.getenv("WEIGHT_SAFETY_RATING", "25"))
WEIGHT_OOS_PCT = float(os.getenv("WEIGHT_OOS_PCT", "20"))
WEIGHT_CRASH_TOTAL = float(os.getenv("WEIGHT_CRASH_TOTAL", "20"))
WEIGHT_DRIVER_OOS = float(os.getenv("WEIGHT_DRIVER_OOS", "15"))
WEIGHT_INSURANCE = float(os.getenv("WEIGHT_INSURANCE", "10"))
WEIGHT_AUTHORITY = float(os.getenv("WEIGHT_AUTHORITY", "10"))

# Tier thresholds
SAFE_TIER_MIN = 70.0
CAUTION_TIER_MIN = 40.0

SAFETY_RATING_POINTS = {
    "satisfactory": 25.0,
    "conditional": 12.0,
    "unsatisfactory": 0.0,
}
SAFETY_RATING_NEUTRAL = 12.0

OOS_THRESHOLDS = (
    (0.05, 20.0),
    (0.10, 14.0),
    (0.20, 8.0),
)
OOS_ABOVE_MAX = 0.0
OOS_NEUTRAL = 10.0

CRASH_THRESHOLDS = (
    (0, 20.0),
    (2, 14.0),
    (5, 7.0),
    (10, 3.0),
)
CRASH_ABOVE_MAX = 0.0
CRASH_NEUTRAL = 10.0

DRIVER_OOS_THRESHOLDS = (
    (0.05, 15.0),
    (0.10, 10.0),
    (0.20, 5.0),
)
DRIVER_OOS_ABOVE_MAX = 0.0
DRIVER_OOS_NEUTRAL = 7.0

INSURANCE_POINTS = {
    "active": 10.0,
    "inactive": 0.0,
}
INSURANCE_NEUTRAL = 5.0

AUTHORITY_POINTS = {
    "active": 10.0,
    "inactive": 3.0,
    "revoked": 0.0,
}
AUTHORITY_NEUTRAL = 5.0


def get_weights_sum() -> float:
    return (
        WEIGHT_SAFETY_RATING
        + WEIGHT_OOS_PCT
        + WEIGHT_CRASH_TOTAL
        + WEIGHT_DRIVER_OOS
        + WEIGHT_INSURANCE
        + WEIGHT_AUTHORITY
    )


def get_weights_dict() -> dict[str, float]:
    return {
        "safety_rating": WEIGHT_SAFETY_RATING,
        "oos_pct": WEIGHT_OOS_PCT,
        "crash_total": WEIGHT_CRASH_TOTAL,
        "driver_oos": WEIGHT_DRIVER_OOS,
        "insurance": WEIGHT_INSURANCE,
        "authority": WEIGHT_AUTHORITY,
    }
