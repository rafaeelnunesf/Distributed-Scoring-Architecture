"""Content hash and change detection for carrier records."""

import hashlib
import json

from src.scoring.models import CarrierInput


class HashService:
    """Service responsible for canonical payload hashing."""

    HASH_FIELDS = [
        "dot_number",
        "legal_name",
        "safety_rating",
        "oos_rate",
        "crash_total",
        "driver_oos_rate",
        "insurance_status",
        "authority_status",
    ]

    def compute_hash(self, carrier: CarrierInput) -> str:
        """Compute canonical SHA-256 hash for a carrier payload."""

        payload = carrier.model_dump()
        normalized = {
            field: self._normalize_value(payload.get(field))
            for field in self.HASH_FIELDS
        }
        canonical_json = json.dumps(
            normalized,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        )
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def has_changed(self, carrier: CarrierInput, previous_hash: str | None) -> bool:
        """Return True if the current hash differs from the previous hash."""

        if not previous_hash:
            return True
        return self.compute_hash(carrier) != previous_hash

    def _normalize_value(self, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value
