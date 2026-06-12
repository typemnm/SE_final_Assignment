import asyncio
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.dependencies import get_current_user, get_db
from app.domains.diet import service
from app.domains.diet.models import DataSourceEnum, HealthConnectExportStatusEnum
from app.domains.diet.repository import DietRecordRepository, latest_analysis_rows
from app.domains.diet.schemas import (
    DietDeleteResponse,
    DietHealthConnectExportableRecord,
    DietHealthConnectExportStatusResponse,
    DietHealthConnectExportStatusUpdateRequest,
)
from app.main import app


def run(coro):
    return asyncio.run(coro)


class FakeDb:
    def __init__(self):
        self.events = []

    async def flush(self):
        self.events.append("flush")

    async def refresh(self, record):
        self.events.append(("refresh", record.id))


class DietHealthConnectExportApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = "11111111-1111-1111-1111-111111111111"
        self.record_id = uuid.UUID("22222222-2222-2222-2222-222222222222")
        self.analysis_id = uuid.UUID("33333333-3333-3333-3333-333333333333")
        self.recorded_at = datetime(2026, 6, 11, 1, 0, tzinfo=timezone.utc)

    def tearDown(self):
        app.dependency_overrides.clear()

    def _override_auth_and_db(self):
        async def fake_current_user():
            return {"user_id": self.user_id}

        async def fake_db():
            yield object()

        app.dependency_overrides[get_current_user] = fake_current_user
        app.dependency_overrides[get_db] = fake_db

    def test_exportable_requires_authentication(self):
        response = self.client.get("/api/v1/diet/exportable")
        self.assertIn(response.status_code, {401, 403})

    def test_exportable_endpoint_returns_current_user_records(self):
        self._override_auth_and_db()

        async def fake_list(user_id, db):
            self.assertEqual(user_id, self.user_id)
            return [
                DietHealthConnectExportableRecord(
                    record_id=self.record_id,
                    analysis_id=self.analysis_id,
                    recorded_at=self.recorded_at,
                    analyzed_at=self.recorded_at + timedelta(minutes=5),
                    diet_image_url="/static/diet_uploads/meal.jpg",
                    total_calories=640,
                    carb_ratio=50,
                    protein_ratio=25,
                    fat_ratio=25,
                    nutrition_data={"calories": 640, "protein": 40},
                    health_connect_client_record_id=None,
                    health_connect_record_id=None,
                    health_connect_record_version=None,
                    health_connect_export_status=HealthConnectExportStatusEnum.not_exported,
                    health_connect_exported_at=None,
                    health_connect_last_error=None,
                )
            ]

        with patch("app.domains.diet.service.list_health_connect_exportable_diets", fake_list):
            response = self.client.get("/api/v1/diet/exportable")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["record_id"], str(self.record_id))
        self.assertEqual(body[0]["analysis_id"], str(self.analysis_id))
        self.assertEqual(body[0]["health_connect_export_status"], "not_exported")

    def test_status_update_endpoint_persists_health_connect_metadata(self):
        self._override_auth_and_db()
        exported_at = "2026-06-11T01:10:00Z"

        async def fake_update(user_id, record_id, req, db):
            self.assertEqual(user_id, self.user_id)
            self.assertEqual(record_id, str(self.record_id))
            self.assertEqual(req.client_record_id, f"kelpus:diet:{self.record_id}")
            self.assertEqual(req.record_id, "device-local-record-id")
            self.assertEqual(req.record_version, 42)
            self.assertEqual(req.status, HealthConnectExportStatusEnum.exported)
            return DietHealthConnectExportStatusResponse(
                record_id=self.record_id,
                health_connect_client_record_id=req.client_record_id,
                health_connect_record_id=req.record_id,
                health_connect_record_version=req.record_version,
                health_connect_export_status=req.status,
                health_connect_exported_at=req.exported_at,
                health_connect_last_error=None,
            )

        with patch("app.domains.diet.service.update_health_connect_export_status", fake_update):
            response = self.client.patch(
                f"/api/v1/diet/{self.record_id}/health-connect-export",
                json={
                    "client_record_id": f"kelpus:diet:{self.record_id}",
                    "record_id": "device-local-record-id",
                    "record_version": 42,
                    "status": "exported",
                    "exported_at": exported_at,
                    "last_error": None,
                },
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["record_id"], str(self.record_id))
        self.assertEqual(body["health_connect_client_record_id"], f"kelpus:diet:{self.record_id}")
        self.assertEqual(body["health_connect_record_version"], 42)
        self.assertEqual(body["health_connect_export_status"], "exported")

    def test_status_update_cross_user_rejection_returns_404(self):
        self._override_auth_and_db()

        async def fake_update(user_id, record_id, req, db):
            raise HTTPException(status_code=404, detail="식단 기록을 찾을 수 없습니다.")

        with patch("app.domains.diet.service.update_health_connect_export_status", fake_update):
            response = self.client.patch(
                f"/api/v1/diet/{self.record_id}/health-connect-export",
                json={
                    "client_record_id": f"kelpus:diet:{self.record_id}",
                    "record_version": 1,
                    "status": "failed",
                    "last_error": "no ownership",
                },
            )

        self.assertEqual(response.status_code, 404)

    def test_delete_endpoint_returns_metadata_for_client_cleanup(self):
        self._override_auth_and_db()

        async def fake_delete(user_id, record_id, db):
            self.assertEqual(user_id, self.user_id)
            self.assertEqual(record_id, str(self.record_id))
            return DietDeleteResponse(
                record_id=self.record_id,
                deleted=True,
                health_connect_client_record_id=f"kelpus:diet:{self.record_id}",
                health_connect_record_id="device-local-record-id",
                health_connect_export_status=HealthConnectExportStatusEnum.deleted,
            )

        with patch("app.domains.diet.service.delete_diet_record", fake_delete):
            response = self.client.delete(f"/api/v1/diet/{self.record_id}")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["deleted"])
        self.assertEqual(body["health_connect_export_status"], "deleted")


class DietHealthConnectExportServiceTest(unittest.TestCase):
    def test_latest_analysis_rows_keeps_only_newest_analysis_per_diet_record(self):
        record_a = SimpleNamespace(
            id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            recorded_at=datetime(2026, 6, 11, 1, 0, tzinfo=timezone.utc),
        )
        record_b = SimpleNamespace(
            id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            recorded_at=datetime(2026, 6, 11, 2, 0, tzinfo=timezone.utc),
        )
        older = SimpleNamespace(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            analyzed_at=datetime(2026, 6, 11, 1, 5, tzinfo=timezone.utc),
        )
        newer = SimpleNamespace(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            analyzed_at=datetime(2026, 6, 11, 1, 10, tzinfo=timezone.utc),
        )
        only = SimpleNamespace(
            id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
            analyzed_at=datetime(2026, 6, 11, 2, 5, tzinfo=timezone.utc),
        )

        rows = latest_analysis_rows(
            [
                (record_a, older),
                (record_b, only),
                (record_a, newer),
            ]
        )

        self.assertEqual([row[0].id for row in rows], [record_b.id, record_a.id])
        self.assertEqual(rows[1][1].id, newer.id)

    def test_repository_exportable_query_excludes_inbound_health_connect_records(self):
        class FakeResult:
            def all(self):
                return []

        class FakeExecuteDb:
            def __init__(self):
                self.statement = None

            async def execute(self, statement):
                self.statement = statement
                return FakeResult()

        db = FakeExecuteDb()
        repo = DietRecordRepository()

        rows = run(
            repo.list_exportable_health_connect_nutrition(
                "11111111-1111-1111-1111-111111111111",
                db,
            )
        )

        compiled = str(db.statement)
        self.assertEqual(rows, [])
        self.assertIn("diet_records.data_source !=", compiled)
        params = db.statement.compile().params
        self.assertIn(DataSourceEnum.health_connect, params.values())

    def test_repository_status_update_preserves_inbound_external_id(self):
        record = SimpleNamespace(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            external_id="inbound-health-connect-id",
            health_connect_client_record_id=None,
            health_connect_record_id=None,
            health_connect_record_version=None,
            health_connect_export_status=HealthConnectExportStatusEnum.not_exported,
            health_connect_exported_at=None,
            health_connect_last_error=None,
        )
        repo = DietRecordRepository()

        async def fake_get_by_id_for_user(record_id, user_id, db):
            self.assertEqual(record_id, record.id)
            return record

        repo.get_by_id_for_user = fake_get_by_id_for_user
        exported_at = datetime(2026, 6, 11, 3, 0, tzinfo=timezone.utc)

        updated = run(
            repo.update_health_connect_export_status(
                record.id,
                "11111111-1111-1111-1111-111111111111",
                client_record_id=f"kelpus:diet:{record.id}",
                health_connect_record_id="device-local-record-id",
                record_version=7,
                export_status=HealthConnectExportStatusEnum.exported,
                exported_at=exported_at,
                last_error=None,
                db=FakeDb(),
            )
        )

        self.assertIs(updated, record)
        self.assertEqual(record.external_id, "inbound-health-connect-id")
        self.assertEqual(record.health_connect_client_record_id, f"kelpus:diet:{record.id}")
        self.assertEqual(record.health_connect_record_id, "device-local-record-id")
        self.assertEqual(record.health_connect_record_version, 7)
        self.assertEqual(record.health_connect_export_status, HealthConnectExportStatusEnum.exported)

    def test_repository_failed_status_preserves_existing_uuid_and_version(self):
        record = SimpleNamespace(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            external_id="inbound-health-connect-id",
            health_connect_client_record_id="kelpus:diet:222",
            health_connect_record_id="existing-device-record-id",
            health_connect_record_version=1781140000,
            health_connect_export_status=HealthConnectExportStatusEnum.exported,
            health_connect_exported_at=datetime(2026, 6, 11, 3, 0, tzinfo=timezone.utc),
            health_connect_last_error=None,
        )
        repo = DietRecordRepository()

        async def fake_get_by_id_for_user(record_id, user_id, db):
            return record

        repo.get_by_id_for_user = fake_get_by_id_for_user

        updated = run(
            repo.update_health_connect_export_status(
                record.id,
                "11111111-1111-1111-1111-111111111111",
                client_record_id="kelpus:diet:222",
                health_connect_record_id=None,
                record_version=None,
                export_status=HealthConnectExportStatusEnum.permission_required,
                exported_at=None,
                last_error="permission revoked",
                db=FakeDb(),
            )
        )

        self.assertIs(updated, record)
        self.assertEqual(record.health_connect_record_id, "existing-device-record-id")
        self.assertEqual(record.health_connect_record_version, 1781140000)
        self.assertEqual(
            record.health_connect_export_status,
            HealthConnectExportStatusEnum.permission_required,
        )
        self.assertEqual(record.health_connect_last_error, "permission revoked")

    def test_service_status_update_sanitizes_error_and_maps_missing_record_to_404(self):
        record = SimpleNamespace(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            health_connect_client_record_id=None,
            health_connect_record_id=None,
            health_connect_record_version=None,
            health_connect_export_status=HealthConnectExportStatusEnum.failed,
            health_connect_exported_at=None,
            health_connect_last_error=None,
        )

        class FakeRepo:
            async def update_health_connect_export_status(
                self,
                record_id,
                user_id,
                *,
                client_record_id,
                health_connect_record_id,
                record_version,
                export_status,
                exported_at,
                last_error,
                db,
            ):
                record.health_connect_client_record_id = client_record_id
                record.health_connect_record_id = health_connect_record_id
                record.health_connect_record_version = record_version
                record.health_connect_export_status = export_status
                record.health_connect_exported_at = exported_at
                record.health_connect_last_error = last_error
                return None if record_id == "foreign" else record

        request = DietHealthConnectExportStatusUpdateRequest(
            client_record_id="kelpus:diet:222",
            record_id=None,
            record_version=2,
            status=HealthConnectExportStatusEnum.failed,
            last_error="  permission\nrequired  " + ("x" * 600),
        )

        with patch.object(service, "_diet_record_repo", FakeRepo()):
            response = run(
                service.update_health_connect_export_status(
                    "11111111-1111-1111-1111-111111111111",
                    str(record.id),
                    request,
                    object(),
                )
            )
            with self.assertRaises(HTTPException) as ctx:
                run(
                    service.update_health_connect_export_status(
                        "11111111-1111-1111-1111-111111111111",
                        "foreign",
                        request,
                        object(),
                    )
                )

        self.assertEqual(response.record_id, record.id)
        self.assertEqual(response.health_connect_last_error[:19], "permission required")
        self.assertLessEqual(len(response.health_connect_last_error), 500)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
