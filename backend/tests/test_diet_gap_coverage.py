import asyncio
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.domains.diet import router, service
from app.domains.diet.models import DietAnalysisResult, DietRecord, HealthConnectExportStatusEnum
from app.domains.diet.schemas import DietAnalyzeRequest, DietSyncRequest


def run(coro):
    return asyncio.run(coro)


class Plan:
    def __init__(self, remaining=True):
        self.remaining = remaining
    def check_remaining_count(self):
        return self.remaining
    def update_usage(self):
        return self


class Db:
    def __init__(self):
        self.rollback = AsyncMock()
        self.flush = AsyncMock()


def analyze_request(record_id=None):
    return DietAnalyzeRequest(diet_image_url="https://example.com/meal.jpg", record_id=record_id)


def test_sync_os_health_diet_covers_empty_nutrition_fallback():
    record = SimpleNamespace(id=uuid.uuid4(), nutrition_data=None)
    with patch.object(service._diet_record_repo, "create_from_os_health", AsyncMock(return_value=record)):
        response = run(service.sync_os_health_diet(str(uuid.uuid4()), DietSyncRequest(raw_data={}), object()))
    assert response.record_id == record.id and response.nutrition_data == {}


def test_analyze_rejects_missing_or_exhausted_initial_plan():
    with patch.object(service._plan_repo, "get_by_user_id", AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc:
            run(service.analyze_diet(str(uuid.uuid4()), analyze_request(), Db()))
        assert exc.value.status_code == 404
    with patch.object(service._plan_repo, "get_by_user_id", AsyncMock(return_value=Plan(False))):
        with pytest.raises(HTTPException) as exc:
            run(service.analyze_diet(str(uuid.uuid4()), analyze_request(), Db()))
        assert exc.value.status_code == 402


def test_analyze_rechecks_missing_or_exhausted_plan_after_ai():
    for second, expected in [(None, 404), (Plan(False), 402)]:
        plans = AsyncMock(side_effect=[Plan(True), second])
        with patch.object(service._plan_repo, "get_by_user_id", plans), \
             patch.object(service._ai_analyzer, "analyze_image", AsyncMock(return_value={})):
            with pytest.raises(HTTPException) as exc:
                run(service.analyze_diet(str(uuid.uuid4()), analyze_request(), Db()))
            assert exc.value.status_code == expected


def test_analyze_existing_record_disappears_during_recheck():
    record_id = uuid.uuid4()
    records = AsyncMock(side_effect=[SimpleNamespace(id=record_id), None])
    with patch.object(service._plan_repo, "get_by_user_id", AsyncMock(side_effect=[Plan(), Plan()])), \
         patch.object(service._diet_record_repo, "get_by_id_for_user", records), \
         patch.object(service._ai_analyzer, "analyze_image", AsyncMock(return_value={})):
        with pytest.raises(HTTPException) as exc:
            run(service.analyze_diet(str(uuid.uuid4()), analyze_request(record_id), Db()))
        assert exc.value.status_code == 404


def test_export_helpers_cover_empty_and_populated_paths():
    assert service._sanitize_export_error(None) is None
    assert service._sanitize_export_error("  repeated\n whitespace  ") == "repeated whitespace"
    record = SimpleNamespace(
        id=uuid.uuid4(), recorded_at=datetime.now(timezone.utc), diet_image_url="url", nutrition_data={},
        health_connect_client_record_id="client", health_connect_record_id="record",
        health_connect_record_version=1, health_connect_export_status=HealthConnectExportStatusEnum.exported,
        health_connect_exported_at=datetime.now(timezone.utc), health_connect_last_error=None,
    )
    analysis = SimpleNamespace(id=uuid.uuid4(), analyzed_at=datetime.now(timezone.utc), total_calories=100,
                               carb_ratio=40, protein_ratio=30, fat_ratio=30)
    with patch.object(service._diet_record_repo, "list_exportable_health_connect_nutrition", AsyncMock(return_value=[(record, analysis)])):
        rows = run(service.list_health_connect_exportable_diets("user", object()))
    assert rows[0].analysis_id == analysis.id


def test_delete_diet_record_rejects_missing_owned_record():
    with patch.object(service._diet_record_repo, "delete_for_user", AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc:
            run(service.delete_diet_record("user", "missing", object()))
    assert exc.value.status_code == 404


def test_router_limited_upload_success_empty_and_oversize(monkeypatch):
    class Upload:
        def __init__(self, chunks): self.chunks = iter(chunks)
        async def read(self, size): return next(self.chunks)
    assert run(router._read_limited_upload(Upload([b"abc", b""]))) == b"abc"
    with pytest.raises(HTTPException) as exc:
        run(router._read_limited_upload(Upload([b""])))
    assert exc.value.status_code == 400
    monkeypatch.setattr(router, "_MAX_UPLOAD_BYTES", 2)
    with pytest.raises(HTTPException) as exc:
        run(router._read_limited_upload(Upload([b"abc"])))
    assert exc.value.status_code == 413


def test_router_upload_rejects_type_and_writes_valid_file(tmp_path, monkeypatch):
    class Upload:
        def __init__(self, content_type, chunks):
            self.content_type, self.chunks, self.closed = content_type, iter(chunks), False
        async def read(self, size): return next(self.chunks)
        async def close(self): self.closed = True

    with pytest.raises(HTTPException) as exc:
        run(router.upload_diet_image(Upload("text/plain", [b"x", b""]), {"user_id": "u"}))
    assert exc.value.status_code == 415

    monkeypatch.setattr(router, "_UPLOAD_DIR", tmp_path)
    upload = Upload("image/png", [b"png", b""])
    response = run(router.upload_diet_image(upload, {"user_id": "u"}))
    assert upload.closed and response.diet_image_url.endswith(".png")
    assert len(list(tmp_path.iterdir())) == 1 and list(tmp_path.iterdir())[0].read_bytes() == b"png"


def test_diet_model_remaining_paths():
    record = DietRecord()
    record.map_os_health_data({})
    assert record.nutrition_data["calories"] == 0
    record.map_health_connect_nutrition({}, "external")
    assert record.external_id == "external" and record.nutrition_data["fat"] == 0
    result = DietAnalysisResult(id=uuid.uuid4(), total_calories=0, carb_ratio=0, protein_ratio=0,
                                fat_ratio=0, ai_comment=None, analyzed_at=None)
    assert result.get_visualization_data()["analyzed_at"] is None
