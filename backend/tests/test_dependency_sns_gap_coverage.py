import asyncio
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app import dependencies
from app.config import settings
from app.domains.sns import service as sns_service
from app.domains.sns.models import VlogFeed


def run(coro): return asyncio.run(coro)


class SessionContext:
    def __init__(self, session): self.session = session
    async def __aenter__(self): return self.session
    async def __aexit__(self, *args): return None


def test_get_db_commit_and_rollback_paths():
    async def success():
        session = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())
        with patch.object(dependencies, "AsyncSessionLocal", return_value=SessionContext(session)):
            generator = dependencies.get_db()
            assert await generator.__anext__() is session
            with pytest.raises(StopAsyncIteration): await generator.__anext__()
        session.commit.assert_awaited_once(); session.rollback.assert_not_awaited()

    async def failure():
        session = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())
        with patch.object(dependencies, "AsyncSessionLocal", return_value=SessionContext(session)):
            generator = dependencies.get_db()
            await generator.__anext__()
            with pytest.raises(RuntimeError): await generator.athrow(RuntimeError("boom"))
        session.rollback.assert_awaited_once()
    run(success()); run(failure())


def test_get_current_user_valid_and_invalid_claims():
    valid = jwt.encode({"sub": "user", "type": "access"}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    result = run(dependencies.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=valid), object()))
    assert result["user_id"] == "user"
    missing = jwt.encode({"type": "access"}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    for token in (missing, "invalid"):
        with pytest.raises(HTTPException) as exc:
            run(dependencies.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token), object()))
        assert exc.value.status_code == 401


def test_check_subscription_all_paths():
    repo = SimpleNamespace(get_by_user_id=AsyncMock(return_value=None))
    with patch("app.domains.user.repository.SubscriptionPlanRepository", return_value=repo):
        with pytest.raises(HTTPException) as exc: run(dependencies.check_subscription({"user_id": "u"}, object()))
        assert exc.value.status_code == 404
    for remaining, expected in [(False, 402), (True, None)]:
        repo = SimpleNamespace(get_by_user_id=AsyncMock(return_value=SimpleNamespace(check_remaining_count=lambda: remaining)))
        with patch("app.domains.user.repository.SubscriptionPlanRepository", return_value=repo):
            if expected:
                with pytest.raises(HTTPException) as exc: run(dependencies.check_subscription({"user_id": "u"}, object()))
                assert exc.value.status_code == expected
            else:
                assert run(dependencies.check_subscription({"user_id": "u"}, object()))["user_id"] == "u"


def feed():
    return VlogFeed(id="f1", original_url="https://example.com", author_account="author", hashtags=["run"],
                    like_count=2, platform="instagram", crawled_at=datetime.now(timezone.utc))


def test_sns_feed_cache_hit_miss_and_failures():
    cached = {"items": [], "total": 0, "from_cache": True, "page": 1, "page_size": 20}
    redis = SimpleNamespace(get=AsyncMock(return_value=json.dumps(cached)), setex=AsyncMock())
    with patch.object(sns_service._feed_repo, "list_recent", AsyncMock()) as repo:
        assert run(sns_service.get_feed_list(1, 20, object(), redis)).from_cache
        repo.assert_not_awaited()

    redis = SimpleNamespace(get=AsyncMock(return_value=None), setex=AsyncMock())
    with patch.object(sns_service._feed_repo, "list_recent", AsyncMock(return_value=([feed()], 1))):
        response = run(sns_service.get_feed_list(1, 20, object(), redis))
    assert response.total == 1 and redis.setex.await_count == 1

    redis = SimpleNamespace(get=AsyncMock(side_effect=RuntimeError("down")), setex=AsyncMock(side_effect=RuntimeError("down")))
    with patch.object(sns_service._feed_repo, "list_recent", AsyncMock(return_value=([], 0))):
        assert run(sns_service.get_feed_list(2, 5, object(), redis)).total == 0
    with patch.object(sns_service._feed_repo, "list_recent", AsyncMock(return_value=([], 0))):
        assert run(sns_service.get_feed_list(1, 10, object(), None)).total == 0


def test_sns_model_branches():
    item = feed(); assert item.display_feed_info()["crawled_at"]
    item.crawled_at = None; assert item.display_feed_info()["crawled_at"] is None
    item.like_count = 1; item.register_like(-5); assert item.like_count == 0
