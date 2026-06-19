import asyncio
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import HTTPException

from app.domains.running import service
from app.domains.running.models import Leaderboard, RunningRecord
from app.domains.running.repository import LeaderboardRepository, RunningRecordRepository
from app.domains.running.schemas import RunningSyncRequest


def run(coro): return asyncio.run(coro)


def record(**overrides):
    values = dict(id=uuid.uuid4(), user_id=uuid.uuid4(), recorded_at=datetime.now(timezone.utc),
                  distance=5.0, duration_seconds=1800, avg_pace=6.0, calories=0,
                  gps_coordinates=[{"lat": 1, "lng": 2}])
    values.update(overrides)
    return SimpleNamespace(**values)


def test_running_helpers_cover_boundaries():
    assert service._generate_split_paces([], 0, 6) == []
    assert len(service._generate_split_paces([], 0.5, 6)) == 1
    assert service._determine_badge(99.5) == "다이아몬드"
    assert service._determine_badge(96) == "플래티넘"
    assert service._determine_badge(92) == "골드"
    assert service._determine_badge(80) == "실버"
    assert service._determine_badge(60) == "브론즈"
    assert service._determine_badge(40) is None
    response = service._record_to_response(record(gps_coordinates=None, calories=0, duration_seconds=None))
    assert response.route == [] and response.calories == 325 and response.duration == 0
    assert service._record_to_response(record(calories=500)).calories == 500


def test_calculate_percentile_empty_and_clamped():
    with patch.object(service._running_repo, "count_all", AsyncMock(return_value=0)):
        assert run(service.calculate_percentile("u", object())) == 100
    with patch.object(service._running_repo, "count_all", AsyncMock(return_value=2)), \
         patch.object(service._running_repo, "get_rank", AsyncMock(return_value=3)):
        assert run(service.calculate_percentile("u", object())) == 0


def test_sync_existing_and_new_paths():
    uid = str(uuid.uuid4())
    existing = record(user_id=uuid.UUID(uid))
    req = RunningSyncRequest(distance=5, avg_pace=6, external_id="ext")
    with patch.object(service._running_repo, "get_by_external_id", AsyncMock(return_value=existing)), \
         patch.object(service, "calculate_percentile", AsyncMock(return_value=75)), \
         patch.object(service._running_repo, "get_rank", AsyncMock(return_value=2)):
        response = run(service.sync_running_record(uid, req, object()))
    assert not response.created

    created = record(user_id=uuid.UUID(uid), calories=325)
    create = AsyncMock(return_value=created)
    upsert = AsyncMock()
    req = RunningSyncRequest(distance=5, avg_pace=6, calories=0)
    with patch.object(service._running_repo, "create", create), \
         patch.object(service, "calculate_percentile", AsyncMock(return_value=99.5)), \
         patch.object(service._running_repo, "count_all", AsyncMock(return_value=10)), \
         patch.object(service._running_repo, "get_rank", AsyncMock(return_value=1)), \
         patch.object(service._leaderboard_repo, "upsert", upsert):
        response = run(service.sync_running_record(uid, req, object()))
    assert response.created and create.await_args.kwargs["calories"] == 325
    assert upsert.await_args.kwargs["badge"] == "다이아몬드"


def test_record_queries_delete_and_courses():
    uid = str(uuid.uuid4())
    mine = record(user_id=uuid.UUID(uid))
    with patch.object(service._running_repo, "list_by_user", AsyncMock(return_value=[mine])):
        assert len(run(service.get_records(uid, object()))) == 1
    for found in (None, record(user_id=uuid.uuid4())):
        with patch.object(service._running_repo, "get_by_id", AsyncMock(return_value=found)):
            with pytest.raises(HTTPException): run(service.get_record("id", uid, object()))
    with patch.object(service._running_repo, "get_by_id", AsyncMock(return_value=mine)):
        assert run(service.get_record("id", uid, object())).id == str(mine.id)
    with patch.object(service._running_repo, "delete_by_id", AsyncMock(return_value=False)):
        with pytest.raises(HTTPException): run(service.delete_record("id", uid, object()))
    with patch.object(service._running_repo, "delete_by_id", AsyncMock(return_value=True)):
        assert run(service.delete_record("id", uid, object())) is None
    assert len(run(service.get_courses())) == 5


def test_leaderboard_views_cover_current_and_missing_user():
    uid = str(uuid.uuid4())
    orm = SimpleNamespace(id=uuid.uuid4(), user_id=uuid.UUID(uid), overall_rank=1, percentile=99,
                          badge="gold", running_record=SimpleNamespace(distance=5), updated_at=datetime.now(timezone.utc))
    no_record = SimpleNamespace(id=uuid.uuid4(), user_id=uuid.uuid4(), overall_rank=2, percentile=80,
                                badge=None, running_record=None, updated_at=datetime.now(timezone.utc))
    with patch.object(service._leaderboard_repo, "list_top", AsyncMock(return_value=[orm, no_record])), \
         patch.object(service._leaderboard_repo, "count_total", AsyncMock(return_value=2)), \
         patch.object(service._leaderboard_repo, "get_by_user", AsyncMock(return_value=orm)):
        response = run(service.get_leaderboard(uid, 10, object()))
    assert response.my_rank == 1 and response.entries[1].distance == 0
    with patch.object(service._leaderboard_repo, "list_top", AsyncMock(return_value=[])), \
         patch.object(service._leaderboard_repo, "count_total", AsyncMock(return_value=0)), \
         patch.object(service._leaderboard_repo, "get_by_user", AsyncMock(return_value=None)):
        assert run(service.get_leaderboard(uid, 10, object())).my_rank is None

    rows = [{"user_id": "other", "userName": "a", "value": 10},
            {"user_id": uid, "userName": "me", "value": 8},
            {"user_id": "third", "userName": "c", "value": 6}]
    with patch.object(service._leaderboard_repo, "list_by_period_criterion", AsyncMock(return_value=rows)):
        listed = run(service.get_leaderboard_list(uid, "weekly", "distance", 10, object()))
        nearby = run(service.get_nearby_leaderboard(uid, "weekly", "distance", 1, object()))
    assert listed.myRank == 2 and nearby.myRank == 2 and len(nearby.entries) == 3
    with patch.object(service._leaderboard_repo, "list_by_period_criterion", AsyncMock(return_value=rows)):
        missing = run(service.get_nearby_leaderboard("missing", "all", "count", 2, object()))
    assert missing.myRank is None and len(missing.entries) == 2


class Result:
    def __init__(self, scalar=None, rows=None): self.scalar, self.rows = scalar, rows or []
    def scalar_one_or_none(self): return self.scalar
    def scalar_one(self): return self.scalar
    def scalars(self): return self
    def all(self): return self.rows


def test_running_repositories_all_paths():
    uid, rid = uuid.uuid4(), uuid.uuid4()
    db = SimpleNamespace(execute=AsyncMock(), add=Mock(), flush=AsyncMock(), refresh=AsyncMock(), delete=AsyncMock())
    repo = RunningRecordRepository()
    db.execute.side_effect = [Result("external"), Result(rows=["a"]), Result("id"), Result(None),
                              Result("record"), Result(0), Result(0), Result(0)]
    assert run(repo.get_by_external_id("e", uid, db)) == "external"
    made = run(repo.create(uid, 5, 6, [], 10, 20, None, None, db)); assert made.distance == 5
    assert run(repo.list_by_user(uid, db)) == ["a"]
    assert run(repo.get_by_id(rid, db)) == "id"
    assert not run(repo.delete_by_id(rid, uid, db))
    assert run(repo.delete_by_id(rid, uid, db))
    assert run(repo.count_all(db)) == 0
    assert run(repo.get_rank(uid, db)) == 1

    leader = LeaderboardRepository()
    existing = Leaderboard(id=uuid.uuid4(), user_id=uid, running_record_id=rid, overall_rank=3, percentile=50)
    db.execute.side_effect = [Result(None), Result(existing), Result(rows=[existing]), Result(existing), Result(0)]
    created = run(leader.upsert(uid, rid, 1, 99, "badge", db)); assert created.overall_rank == 1
    updated = run(leader.upsert(uid, rid, 2, 80, None, db)); assert updated.overall_rank == 2
    assert run(leader.list_top(10, db)) == [existing]
    assert run(leader.get_by_user(uid, db)) is existing
    assert run(leader.count_total(db)) == 0


def test_period_criterion_repository_branches():
    uid = uuid.uuid4()
    row = SimpleNamespace(user_id=uid, email="name@example.com", value=None)
    leader = LeaderboardRepository()
    for period in ("weekly", "monthly", "all"):
        for criterion in ("count", "total_time", "distance"):
            db = SimpleNamespace(execute=AsyncMock(return_value=Result(rows=[row])))
            result = run(leader.list_by_period_criterion(period, criterion, 5, db))
            assert result[0]["userName"] == "name" and result[0]["value"] == 0


def test_running_models_branches():
    rec = RunningRecord(); assert rec.sync_route_data([{"lat": 1}]).gps_coordinates
    lb = Leaderboard(overall_rank=0, percentile=0, updated_at=None)
    lb.calculate_percentile(0, 1); assert lb.percentile == 0
    lb.calculate_percentile(10, 1); assert lb.percentile == 90
    lb.updated_at = None; assert lb.get_rank_info()["updated_at"] is None
