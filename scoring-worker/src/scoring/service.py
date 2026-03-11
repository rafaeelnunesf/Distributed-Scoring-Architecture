"""Scoring algorithm implementation for carrier records."""

from src.scoring.constants import (
    AUTHORITY_NEUTRAL,
    AUTHORITY_POINTS,
    CAUTION_TIER_MIN,
    CRASH_ABOVE_MAX,
    CRASH_NEUTRAL,
    CRASH_THRESHOLDS,
    DRIVER_OOS_ABOVE_MAX,
    DRIVER_OOS_NEUTRAL,
    DRIVER_OOS_THRESHOLDS,
    INSURANCE_NEUTRAL,
    INSURANCE_POINTS,
    OOS_ABOVE_MAX,
    OOS_NEUTRAL,
    OOS_THRESHOLDS,
    SAFE_TIER_MIN,
    SAFETY_RATING_NEUTRAL,
    SAFETY_RATING_POINTS,
    WEIGHT_AUTHORITY,
    WEIGHT_CRASH_TOTAL,
    WEIGHT_DRIVER_OOS,
    WEIGHT_INSURANCE,
    WEIGHT_OOS_PCT,
    WEIGHT_SAFETY_RATING,
    get_weights_sum,
)
from src.scoring.models import (
    CarrierInput,
    FactorExplanation,
    ScoreBreakdown,
)

# Max raw points per factor (used for scaling when weights are configurable)
MAX_SAFETY = 25.0
MAX_OOS = 20.0
MAX_CRASH = 20.0
MAX_DRIVER_OOS = 15.0
MAX_INSURANCE = 10.0
MAX_AUTHORITY = 10.0


def _check_weights() -> None:
    total = get_weights_sum()
    if abs(total - 100.0) > 0.01:
        raise ValueError(f"Scoring weights must sum to 100, got {total}")


# Validate on module load
_check_weights()


class ScoringService:
    """Service responsible for risk scoring."""

    def score_carrier(
        self, carrier: CarrierInput
    ) -> tuple[float, str, ScoreBreakdown, list[FactorExplanation]]:
        """Return total score, tier, breakdown and explanations for a single carrier."""
        breakdown = ScoreBreakdown(
            safety_rating=self._score_safety_rating(carrier.safety_rating),
            oos_pct=self._score_oos_rate(carrier.oos_rate),
            crash_total=self._score_crash_total(carrier.crash_total),
            driver_oos=self._score_driver_oos(carrier.driver_oos_rate),
            insurance=self._score_insurance(carrier.insurance_status),
            authority=self._score_authority(carrier.authority_status),
        )
        explanations = self._build_explanations(carrier, breakdown)
        total_score = self._weighted_total(breakdown)
        return total_score, self._resolve_tier(total_score), breakdown, explanations

    def score_batch(
        self, records: list[CarrierInput]
    ) -> list[tuple[float, str, ScoreBreakdown, list[FactorExplanation]]]:
        """Return scored results for multiple carriers."""
        return [self.score_carrier(record) for record in records]

    def _weighted_total(self, breakdown: ScoreBreakdown) -> float:
        return round(
            (breakdown.safety_rating / MAX_SAFETY) * WEIGHT_SAFETY_RATING
            + (breakdown.oos_pct / MAX_OOS) * WEIGHT_OOS_PCT
            + (breakdown.crash_total / MAX_CRASH) * WEIGHT_CRASH_TOTAL
            + (breakdown.driver_oos / MAX_DRIVER_OOS) * WEIGHT_DRIVER_OOS
            + (breakdown.insurance / MAX_INSURANCE) * WEIGHT_INSURANCE
            + (breakdown.authority / MAX_AUTHORITY) * WEIGHT_AUTHORITY,
            2,
        )

    def _build_explanations(
        self, carrier: CarrierInput, breakdown: ScoreBreakdown
    ) -> list[FactorExplanation]:
        return [
            FactorExplanation(
                factor="safety_rating",
                points=breakdown.safety_rating,
                max_points=MAX_SAFETY,
                weight_pct=WEIGHT_SAFETY_RATING,
                input_value=carrier.safety_rating,
                description=self._describe_safety_rating(carrier.safety_rating, breakdown.safety_rating),
            ),
            FactorExplanation(
                factor="oos_pct",
                points=breakdown.oos_pct,
                max_points=MAX_OOS,
                weight_pct=WEIGHT_OOS_PCT,
                input_value=carrier.oos_rate,
                description=self._describe_oos(carrier.oos_rate, breakdown.oos_pct),
            ),
            FactorExplanation(
                factor="crash_total",
                points=breakdown.crash_total,
                max_points=MAX_CRASH,
                weight_pct=WEIGHT_CRASH_TOTAL,
                input_value=carrier.crash_total,
                description=self._describe_crash(carrier.crash_total, breakdown.crash_total),
            ),
            FactorExplanation(
                factor="driver_oos",
                points=breakdown.driver_oos,
                max_points=MAX_DRIVER_OOS,
                weight_pct=WEIGHT_DRIVER_OOS,
                input_value=carrier.driver_oos_rate,
                description=self._describe_driver_oos(carrier.driver_oos_rate, breakdown.driver_oos),
            ),
            FactorExplanation(
                factor="insurance",
                points=breakdown.insurance,
                max_points=MAX_INSURANCE,
                weight_pct=WEIGHT_INSURANCE,
                input_value=carrier.insurance_status,
                description=self._describe_insurance(carrier.insurance_status, breakdown.insurance),
            ),
            FactorExplanation(
                factor="authority",
                points=breakdown.authority,
                max_points=MAX_AUTHORITY,
                weight_pct=WEIGHT_AUTHORITY,
                input_value=carrier.authority_status,
                description=self._describe_authority(carrier.authority_status, breakdown.authority),
            ),
        ]

    def _describe_safety_rating(self, value: str | None, points: float) -> str:
        if not value:
            return "No safety rating — neutral points applied."
        v = value.strip().lower()
        if v == "satisfactory":
            return "Satisfactory safety rating — full points."
        if v == "conditional":
            return "Conditional safety rating — partial points."
        if v == "unsatisfactory":
            return "Unsatisfactory safety rating — zero points."
        return f"Unknown rating '{value}' — neutral points."

    def _describe_oos(self, value: float | None, points: float) -> str:
        if value is None:
            return "No OOS rate — neutral points applied."
        pct = value if value <= 1 else value / 100
        if pct <= 0.05:
            return f"OOS rate {pct:.1%} is below 5% threshold — full points."
        if pct <= 0.10:
            return f"OOS rate {pct:.1%} is 5–10% — partial points."
        if pct <= 0.20:
            return f"OOS rate {pct:.1%} is 10–20% — reduced points."
        return f"OOS rate {pct:.1%} exceeds 20% — zero points."

    def _describe_crash(self, value: int | None, points: float) -> str:
        if value is None:
            return "No crash data — neutral points applied."
        if value <= 0:
            return "Zero crashes — full points."
        if value <= 2:
            return f"{value} crash(es) — high points."
        if value <= 5:
            return f"{value} crashes — partial points."
        if value <= 10:
            return f"{value} crashes — reduced points."
        return f"{value} crashes — zero points."

    def _describe_driver_oos(self, value: float | None, points: float) -> str:
        if value is None:
            return "No driver OOS rate — neutral points applied."
        pct = value if value <= 1 else value / 100
        if pct <= 0.05:
            return f"Driver OOS rate {pct:.1%} is below 5% — full points."
        if pct <= 0.10:
            return f"Driver OOS rate {pct:.1%} is 5–10% — partial points."
        if pct <= 0.20:
            return f"Driver OOS rate {pct:.1%} is 10–20% — reduced points."
        return f"Driver OOS rate {pct:.1%} exceeds 20% — zero points."

    def _describe_insurance(self, value: str | None, points: float) -> str:
        if not value:
            return "No insurance status — neutral points applied."
        v = value.strip().lower()
        if v == "active":
            return "Insurance active — full points."
        if v == "inactive":
            return "Insurance inactive — zero points."
        return f"Unknown insurance status — neutral points."

    def _describe_authority(self, value: str | None, points: float) -> str:
        if not value:
            return "No authority status — neutral points applied."
        v = value.strip().lower()
        if v == "active":
            return "Authority active — full points."
        if v == "inactive":
            return "Authority inactive — partial points."
        if v == "revoked":
            return "Authority revoked — zero points."
        return f"Unknown authority status — neutral points."

    def _normalize_rate(self, value: float | None) -> float | None:
        if value is None:
            return None
        return value / 100 if value > 1 else value

    def _score_safety_rating(self, value: str | None) -> float:
        if not value:
            return SAFETY_RATING_NEUTRAL
        return SAFETY_RATING_POINTS.get(value.strip().lower(), SAFETY_RATING_NEUTRAL)

    def _score_oos_rate(self, value: float | None) -> float:
        normalized = self._normalize_rate(value)
        if normalized is None:
            return OOS_NEUTRAL
        for threshold, points in OOS_THRESHOLDS:
            if normalized <= threshold:
                return points
        return OOS_ABOVE_MAX

    def _score_crash_total(self, value: int | None) -> float:
        if value is None:
            return CRASH_NEUTRAL
        for threshold, points in CRASH_THRESHOLDS:
            if value <= threshold:
                return points
        return CRASH_ABOVE_MAX

    def _score_driver_oos(self, value: float | None) -> float:
        normalized = self._normalize_rate(value)
        if normalized is None:
            return DRIVER_OOS_NEUTRAL
        for threshold, points in DRIVER_OOS_THRESHOLDS:
            if normalized <= threshold:
                return points
        return DRIVER_OOS_ABOVE_MAX

    def _score_insurance(self, value: str | None) -> float:
        if not value:
            return INSURANCE_NEUTRAL
        return INSURANCE_POINTS.get(value.strip().lower(), INSURANCE_NEUTRAL)

    def _score_authority(self, value: str | None) -> float:
        if not value:
            return AUTHORITY_NEUTRAL
        return AUTHORITY_POINTS.get(value.strip().lower(), AUTHORITY_NEUTRAL)

    def _resolve_tier(self, total_score: float) -> str:
        if total_score >= SAFE_TIER_MIN:
            return "SAFE"
        if total_score >= CAUTION_TIER_MIN:
            return "CAUTION"
        return "RISK"
