import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest_asyncio.fixture
async def async_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def valid_carrier(dot_number: str) -> dict[str, object]:
    return {
        "dot_number": dot_number,
        "legal_name": f"Carrier {dot_number}",
        "safety_rating": "Satisfactory",
        "oos_rate": 0.03,
        "crash_total": 0,
        "driver_oos_rate": 0.02,
        "insurance_status": "Active",
        "authority_status": "Active",
    }


@pytest.mark.asyncio
async def test_post_score_valid_returns_breakdown(async_client: AsyncClient) -> None:
    response = await async_client.post("/score", json=valid_carrier("111"))
    body = response.json()

    assert response.status_code == 200
    assert body["dot_number"] == "111"
    assert body["tier"] == "SAFE"
    assert body["changed"] is False
    assert "breakdown" in body
    assert body["breakdown"]["safety_rating"] == 25.0


@pytest.mark.asyncio
async def test_post_score_invalid_returns_422(async_client: AsyncClient) -> None:
    invalid_payload = valid_carrier("222")
    invalid_payload.pop("dot_number")

    response = await async_client.post("/score", json=invalid_payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_post_score_batch_success_returns_200(async_client: AsyncClient) -> None:
    payload = {
        "records": [valid_carrier("301"), valid_carrier("302"), valid_carrier("303")],
        "previous_hashes": {},
    }

    response = await async_client.post("/score/batch", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert body["total"] == 3
    assert body["processed"] == 3
    assert len(body["results"]) == 3
    assert body["errors"] == []


@pytest.mark.asyncio
async def test_post_score_batch_partial_error_returns_207(async_client: AsyncClient) -> None:
    payload = {
        "records": [
            valid_carrier("401"),
            {"legal_name": "Invalid Without Dot"},
        ],
        "previous_hashes": {},
    }

    response = await async_client.post("/score/batch", json=payload)
    body = response.json()

    assert response.status_code == 207
    assert body["total"] == 2
    assert body["processed"] == 1
    assert len(body["results"]) == 1
    assert len(body["errors"]) == 1


@pytest.mark.asyncio
async def test_get_health_returns_ok(async_client: AsyncClient) -> None:
    response = await async_client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body.get("status") == "ok"
    assert body.get("service") == "scoring-worker"


@pytest.mark.asyncio
async def test_get_score_weights_returns_weights_and_tiers(async_client: AsyncClient) -> None:
    response = await async_client.get("/score/weights")

    assert response.status_code == 200
    body = response.json()
    assert "weights" in body
    assert "tiers" in body
    weights = body["weights"]
    assert weights.get("safety_rating") == 25.0
    assert weights.get("oos_pct") == 20.0
    assert body["tiers"].get("SAFE_min") == 70.0
    assert body["tiers"].get("CAUTION_min") == 40.0
