import hashlib
import json

from src.hashing.service import HashService
from src.scoring.models import CarrierInput


def build_carrier(**overrides: object) -> CarrierInput:
    payload: dict[str, object] = {
        "dot_number": "123456",
        "legal_name": "Carrier Test",
    }
    payload.update(overrides)
    return CarrierInput(**payload)


def test_compute_hash_is_deterministic() -> None:
    service = HashService()
    carrier = build_carrier(
        safety_rating="Satisfactory",
        oos_rate=0.05,
        crash_total=1,
        driver_oos_rate=0.05,
        insurance_status="Active",
        authority_status="Active",
    )

    assert service.compute_hash(carrier) == service.compute_hash(carrier)


def test_different_inputs_generate_different_hashes() -> None:
    service = HashService()
    carrier_a = build_carrier(insurance_status="Active")
    carrier_b = build_carrier(insurance_status="Inactive")

    assert service.compute_hash(carrier_a) != service.compute_hash(carrier_b)


def test_hash_is_case_insensitive_for_strings() -> None:
    service = HashService()
    carrier_a = build_carrier(insurance_status="Active", authority_status="Revoked")
    carrier_b = build_carrier(insurance_status="  ACTIVE  ", authority_status="revoked")

    assert service.compute_hash(carrier_a) == service.compute_hash(carrier_b)


def test_none_fields_are_included_in_canonical_payload() -> None:
    service = HashService()
    carrier = build_carrier()
    hash_value = service.compute_hash(carrier)

    expected_payload = {
        "authority_status": None,
        "crash_total": None,
        "dot_number": "123456",
        "driver_oos_rate": None,
        "insurance_status": None,
        "legal_name": "carrier test",
        "oos_rate": None,
        "safety_rating": None,
    }
    canonical = json.dumps(
        expected_payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    expected_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    assert hash_value == expected_hash


def test_field_order_does_not_change_hash() -> None:
    service = HashService()
    carrier_a = CarrierInput(
        dot_number="999",
        legal_name="Order Test",
        safety_rating="Conditional",
        oos_rate=0.1,
        crash_total=2,
        driver_oos_rate=0.1,
        insurance_status="Active",
        authority_status="Inactive",
    )
    carrier_b = CarrierInput.model_validate(
        {
            "authority_status": "Inactive",
            "insurance_status": "Active",
            "driver_oos_rate": 0.1,
            "crash_total": 2,
            "oos_rate": 0.1,
            "safety_rating": "Conditional",
            "legal_name": "Order Test",
            "dot_number": "999",
        }
    )

    assert service.compute_hash(carrier_a) == service.compute_hash(carrier_b)


def test_has_changed_is_true_when_no_previous_hash() -> None:
    service = HashService()
    carrier = build_carrier()

    assert service.has_changed(carrier, None) is True


def test_has_changed_is_false_when_hash_matches() -> None:
    service = HashService()
    carrier = build_carrier(insurance_status="Active")
    previous_hash = service.compute_hash(carrier)

    assert service.has_changed(carrier, previous_hash) is False


def test_has_changed_is_true_when_hash_differs() -> None:
    service = HashService()
    carrier = build_carrier(insurance_status="Inactive")

    assert service.has_changed(carrier, "different-hash") is True
