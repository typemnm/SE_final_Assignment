import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.dependencies import get_current_user, get_db
from app.domains.health.schemas import HealthConnectGroupCounts, HealthConnectSyncResponse
from app.main import app


def success_response(created=4, skipped=0, failed=0, status="success"):
    groups = {
        "running": HealthConnectGroupCounts(created=1 if created else 0, skipped=0, failed=0, errors=[]),
        "nutrition": HealthConnectGroupCounts(created=1 if created else 0, skipped=skipped, failed=0, errors=[]),
        "dailyActivity": HealthConnectGroupCounts(created=1 if created else 0, skipped=0, failed=0, errors=[]),
        "heartRate": HealthConnectGroupCounts(created=1 if created else 0, skipped=0, failed=failed, errors=["boom"] if failed else []),
    }
    return HealthConnectSyncResponse(
        status=status,
        total=HealthConnectGroupCounts(created=created, skipped=skipped, failed=failed, errors=[]),
        groups=groups,
    )


class HealthSyncApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def _override_auth_and_db(self):
        async def fake_current_user():
            return {"user_id": "11111111-1111-1111-1111-111111111111"}

        async def fake_db():
            yield object()

        app.dependency_overrides[get_current_user] = fake_current_user
        app.dependency_overrides[get_db] = fake_db

    def test_sync_requires_authentication(self):
        response = self.client.post("/api/v1/health/sync", json={})
        self.assertIn(response.status_code, {401, 403})

    def test_invalid_top_level_envelope_returns_422(self):
        self._override_auth_and_db()
        response = self.client.post(
            "/api/v1/health/sync",
            json={
                "platform": "health_connect",
                "syncedAt": "2026-06-11T00:00:00Z",
                "running": {"not": "an array"},
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_success_response_contract(self):
        self._override_auth_and_db()

        async def fake_sync_health_data(user_id, envelope, db):
            self.assertEqual(user_id, "11111111-1111-1111-1111-111111111111")
            self.assertEqual(envelope.platform, "health_connect")
            return success_response(created=4, status="success")

        with patch("app.domains.health.service.sync_health_data", fake_sync_health_data):
            response = self.client.post(
                "/api/v1/health/sync",
                json={
                    "platform": "health_connect",
                    "syncedAt": "2026-06-11T00:00:00Z",
                    "running": [],
                    "nutrition": [],
                    "dailyActivity": [],
                    "heartRate": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertEqual(response.json()["total"]["created"], 4)

    def test_replay_can_report_skipped_counts(self):
        self._override_auth_and_db()

        async def fake_sync_health_data(user_id, envelope, db):
            return success_response(created=0, skipped=4, status="success")

        with patch("app.domains.health.service.sync_health_data", fake_sync_health_data):
            response = self.client.post(
                "/api/v1/health/sync",
                json={"platform": "health_connect", "syncedAt": "2026-06-11T00:00:00Z"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total"]["skipped"], 4)

    def test_partial_failure_response_contract(self):
        self._override_auth_and_db()

        async def fake_sync_health_data(user_id, envelope, db):
            return success_response(created=3, failed=1, status="partial_success")

        with patch("app.domains.health.service.sync_health_data", fake_sync_health_data):
            response = self.client.post(
                "/api/v1/health/sync",
                json={"platform": "health_connect", "syncedAt": "2026-06-11T00:00:00Z"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "partial_success")
        self.assertEqual(body["groups"]["heartRate"]["failed"], 1)
        self.assertEqual(body["groups"]["heartRate"]["errors"], ["boom"])


if __name__ == "__main__":
    unittest.main()
