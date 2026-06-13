import asyncio
import unittest
from uuid import UUID

from app.domains.health import service
from app.domains.health.schemas import (
    HealthConnectNutritionRecord,
    HealthConnectSyncEnvelope,
)


def run(coro):
    return asyncio.run(coro)


class FakeScalarResult:
    def __init__(self, value=None):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeNested:
    def __init__(self, db):
        self.db = db

    async def __aenter__(self):
        self.db.events.append("begin_nested")

    async def __aexit__(self, exc_type, exc, tb):
        self.db.events.append("rollback_nested" if exc else "commit_nested")
        return False


class FakeDb:
    def __init__(self, existing=None, fail_flush=False):
        self.existing = existing
        self.fail_flush = fail_flush
        self.events = []
        self.added = []

    async def execute(self, _statement):
        self.events.append("execute")
        return FakeScalarResult(self.existing)

    def begin_nested(self):
        return FakeNested(self)

    def add(self, item):
        self.events.append("add")
        self.added.append(item)

    async def flush(self):
        self.events.append("flush")
        if self.fail_flush:
            raise RuntimeError("flush failed")


class HealthSyncServiceTest(unittest.TestCase):
    def test_fallback_external_id_is_deterministic(self):
        user_id = "11111111-1111-1111-1111-111111111111"
        payload = {"recordedAt": "2026-06-10T12:00:00Z", "calories": 650, "protein": 30}

        first = service.build_fallback_external_id(user_id, "nutrition", payload)
        second = service.build_fallback_external_id(user_id, "nutrition", dict(reversed(payload.items())))

        self.assertEqual(first, second)
        self.assertTrue(first.startswith("hc:nutrition:"))

    def test_envelope_accepts_missing_external_id_for_service_fallback(self):
        envelope = HealthConnectSyncEnvelope.model_validate(
            {
                "platform": "health_connect",
                "syncedAt": "2026-06-11T00:00:00Z",
                "nutrition": [{"recordedAt": "2026-06-10T12:00:00Z", "calories": 650}],
            }
        )
        self.assertIsNone(envelope.nutrition[0].get("externalId"))

    def test_nutrition_duplicate_skips_without_savepoint(self):
        db = FakeDb(existing=object())
        parsed = HealthConnectNutritionRecord.model_validate(
            {"externalId": "hc-nutrition-1", "recordedAt": "2026-06-10T12:00:00Z", "calories": 650}
        )

        created = run(
            service._sync_nutrition(  # noqa: SLF001 - service unit coverage
                "11111111-1111-1111-1111-111111111111",
                {"externalId": "hc-nutrition-1", "recordedAt": "2026-06-10T12:00:00Z", "calories": 650},
                parsed,
                db,
            )
        )

        self.assertFalse(created)
        self.assertEqual(db.events, ["execute"])

    def test_nutrition_create_uses_savepoint_and_health_connect_source(self):
        db = FakeDb(existing=None)
        parsed = HealthConnectNutritionRecord.model_validate(
            {"recordedAt": "2026-06-10T12:00:00Z", "calories": 650, "protein": 30}
        )

        created = run(
            service._sync_nutrition(  # noqa: SLF001 - service unit coverage
                "11111111-1111-1111-1111-111111111111",
                {"recordedAt": "2026-06-10T12:00:00Z", "calories": 650, "protein": 30},
                parsed,
                db,
            )
        )

        self.assertTrue(created)
        self.assertIn("begin_nested", db.events)
        self.assertIn("commit_nested", db.events)
        self.assertEqual(len(db.added), 1)
        self.assertEqual(str(db.added[0].user_id), "11111111-1111-1111-1111-111111111111")
        self.assertEqual(db.added[0].nutrition_data["source"], "health_connect")
        self.assertTrue(db.added[0].external_id.startswith("hc:nutrition:"))

    def test_group_processing_counts_item_validation_and_persistence_failures(self):
        counts = service._MutableCounts()  # noqa: SLF001
        db = FakeDb()

        async def handler(user_id, raw, parsed, db):
            if raw.get("boom"):
                raise RuntimeError("record failed")
            return True

        run(
            service._process_group(  # noqa: SLF001
                group="nutrition",
                raw_records=[
                    {"recordedAt": "2026-06-10T12:00:00Z", "calories": 650},
                    {"recordedAt": "2026-06-10T12:00:00Z", "calories": -1},
                    {"recordedAt": "2026-06-10T12:00:00Z", "calories": 100, "boom": True},
                ],
                schema=HealthConnectNutritionRecord,
                user_id="11111111-1111-1111-1111-111111111111",
                db=db,
                handler=handler,
                counts=counts,
            )
        )

        self.assertEqual(counts.created, 1)
        self.assertEqual(counts.failed, 2)
        self.assertEqual(counts.skipped, 0)
        self.assertIn("nutrition[1].calories", counts.errors[0])
        self.assertIn("record failed", counts.errors[1])

    def test_response_status_partial_when_created_and_failed(self):
        counts = service._empty_counts()  # noqa: SLF001
        counts["running"].created = 1
        counts["heartRate"].failed = 1

        response = service._response(counts)  # noqa: SLF001

        self.assertEqual(response.status, "partial_success")
        self.assertEqual(response.total.created, 1)
        self.assertEqual(response.total.failed, 1)


if __name__ == "__main__":
    unittest.main()
