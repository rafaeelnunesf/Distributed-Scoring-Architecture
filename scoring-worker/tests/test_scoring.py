import pytest

from src.scoring.models import CarrierInput
from src.scoring.service import ScoringService


def build_carrier(**overrides: object) -> CarrierInput:
    payload: dict[str, object] = {
        "dot_number": "123456",
        "legal_name": "Carrier Test",
    }
    payload.update(overrides)
    return CarrierInput(**payload)


def test_perfect_carrier_scores_100_and_safe() -> None:
    service = ScoringService()
    carrier = build_carrier(
        safety_rating="Satisfactory",
        oos_rate=0.01,
        crash_total=0,
        driver_oos_rate=0.01,
        insurance_status="Active",
        authority_status="Active",
    )

    total, tier, breakdown, _ = service.score_carrier(carrier)

    assert total == 100.0
    assert tier == "SAFE"
    assert breakdown.safety_rating == 25.0
    assert breakdown.oos_pct == 20.0
    assert breakdown.crash_total == 20.0
    assert breakdown.driver_oos == 15.0
    assert breakdown.insurance == 10.0
    assert breakdown.authority == 10.0


def test_all_optional_none_results_in_neutral_score() -> None:
    service = ScoringService()
    carrier = build_carrier()

    total, tier, breakdown, _ = service.score_carrier(carrier)

    assert total == 49.0
    assert tier == "CAUTION"
    assert breakdown.safety_rating == 12.0
    assert breakdown.oos_pct == 10.0
    assert breakdown.crash_total == 10.0
    assert breakdown.driver_oos == 7.0
    assert breakdown.insurance == 5.0
    assert breakdown.authority == 5.0


def test_very_risky_carrier_results_in_risk_tier() -> None:
    service = ScoringService()
    carrier = build_carrier(
        safety_rating="Unsatisfactory",
        oos_rate=0.25,
        crash_total=11,
        driver_oos_rate=0.25,
        insurance_status="Inactive",
        authority_status="Revoked",
    )

    total, tier, _, _ = service.score_carrier(carrier)

    assert total == 0.0
    assert tier == "RISK"


@pytest.mark.parametrize(
    ("overrides", "field_name", "expected"),
    [
        ({"safety_rating": "Satisfactory"}, "safety_rating", 25.0),
        ({"oos_rate": 0.08}, "oos_pct", 14.0),
        ({"crash_total": 4}, "crash_total", 7.0),
        ({"driver_oos_rate": 0.08}, "driver_oos", 10.0),
        ({"insurance_status": "Active"}, "insurance", 10.0),
        ({"authority_status": "Inactive"}, "authority", 3.0),
    ],
)
def test_each_factor_isolated(
    overrides: dict[str, object], field_name: str, expected: float
) -> None:
    service = ScoringService()
    carrier = build_carrier(**overrides)

    _, _, breakdown, _ = service.score_carrier(carrier)

    assert getattr(breakdown, field_name) == expected


@pytest.mark.parametrize(
    ("rate", "expected"),
    [
        (0.05, 20.0),
        (0.10, 14.0),
        (0.20, 8.0),
    ],
)
def test_oos_rate_boundaries(rate: float, expected: float) -> None:
    service = ScoringService()
    carrier = build_carrier(oos_rate=rate)

    _, _, breakdown, _ = service.score_carrier(carrier)

    assert breakdown.oos_pct == expected


def test_percentage_rate_inputs_are_normalized() -> None:
    service = ScoringService()
    carrier = build_carrier(oos_rate=18.4, driver_oos_rate=4.7)

    _, _, breakdown, _ = service.score_carrier(carrier)

    assert breakdown.oos_pct == 8.0
    assert breakdown.driver_oos == 15.0


@pytest.mark.parametrize(
    ("crashes", "expected"),
    [
        (0, 20.0),
        (1, 14.0),
        (3, 7.0),
        (6, 3.0),
        (10, 3.0),
        (11, 0.0),
    ],
)
def test_crash_total_boundaries(crashes: int, expected: float) -> None:
    service = ScoringService()
    carrier = build_carrier(crash_total=crashes)

    _, _, breakdown, _ = service.score_carrier(carrier)

    assert breakdown.crash_total == expected


def test_tier_boundaries_exactly_70_40_39() -> None:
    service = ScoringService()

    score_70, tier_70, _, _ = service.score_carrier(
        build_carrier(safety_rating="Satisfactory", oos_rate=0.10, crash_total=1)
    )
    score_40, tier_40, _, _ = service.score_carrier(
        build_carrier(
            safety_rating="Conditional",
            oos_rate=0.20,
            crash_total=3,
            driver_oos_rate=0.20,
            authority_status="Inactive",
        )
    )
    score_39, tier_39, _, _ = service.score_carrier(
        build_carrier(
            safety_rating="Conditional",
            oos_rate=0.20,
            crash_total=3,
            insurance_status="Inactive",
        )
    )

    assert score_70 == 70.0
    assert tier_70 == "SAFE"
    assert score_40 == 40.0
    assert tier_40 == "CAUTION"
    assert score_39 == 39.0
    assert tier_39 == "RISK"
