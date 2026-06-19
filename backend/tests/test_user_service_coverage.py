import asyncio
import base64
import json
import uuid
from functools import wraps
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock, Mock

import pytest
from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.domains.user import service
from app.domains.user.models import GenderEnum, SubscriptionPlan, SubscriptionTypeEnum, User
from app.domains.user.repository import SubscriptionPlanRepository, UserRepository
from app.domains.user.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SocialLoginRequest,
    UpdateProfileRequest,
)


def async_test(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        return asyncio.run(function(*args, **kwargs))
    return wrapper


def make_user(**overrides):
    values = {
        "id": uuid.uuid4(),
        "email": "user@example.com",
        "password_hash": "hashed",
        "age": 30,
        "gender": GenderEnum.male,
        "health_goal": "fitness",
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def make_plan(**overrides):
    values = {
        "id": uuid.uuid4(),
        "type": SubscriptionTypeEnum.free,
        "daily_ai_limit": 3,
        "total_usage": 1,
        "today_usage": 1,
        "renewal_date": date.today(),
        "check_remaining_count": Mock(return_value=True),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


@async_test
async def test_register_rejects_duplicate(monkeypatch):
    monkeypatch.setattr(service._user_repo, "get_by_email", AsyncMock(return_value=make_user()))
    with pytest.raises(HTTPException) as exc:
        await service.register_user(RegisterRequest(email="user@example.com", password="password1"), object())
    assert exc.value.status_code == 409


@async_test
async def test_register_creates_user_and_tokens(monkeypatch):
    user = make_user()
    create = AsyncMock(return_value=user)
    monkeypatch.setattr(service._user_repo, "get_by_email", AsyncMock(return_value=None))
    monkeypatch.setattr(service._user_repo, "create", create)
    monkeypatch.setattr(service, "_hash_password", Mock(return_value="digest"))
    response = await service.register_user(
        RegisterRequest(email=user.email, password="password1", age=30, gender="male"), object()
    )
    assert response.user.id == user.id
    assert jwt.decode(response.access_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])["type"] == "access"
    assert jwt.decode(response.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])["type"] == "refresh"
    assert create.await_args.kwargs["password_hash"] == "digest"


@async_test
@pytest.mark.parametrize("user,password_ok,status_code", [
    (None, True, 401),
    (make_user(), False, 401),
    (make_user(is_active=False), True, 403),
])
async def test_login_rejections(monkeypatch, user, password_ok, status_code):
    monkeypatch.setattr(service._user_repo, "get_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr(service, "_verify_password", Mock(return_value=password_ok))
    with pytest.raises(HTTPException) as exc:
        await service.login_user(LoginRequest(email="user@example.com", password="bad"), object())
    assert exc.value.status_code == status_code


@async_test
async def test_login_success(monkeypatch):
    user = make_user()
    monkeypatch.setattr(service._user_repo, "get_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr(service, "_verify_password", Mock(return_value=True))
    assert (await service.login_user(LoginRequest(email=user.email, password="password1"), object())).user.email == user.email


@async_test
@pytest.mark.parametrize("payload", [
    {"sub": "abc", "type": "access"},
    {"type": "refresh"},
])
async def test_refresh_rejects_wrong_claims(payload):
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        await service.refresh_access_token(RefreshRequest(refresh_token=token), object())
    assert exc.value.status_code == 401


@async_test
async def test_refresh_rejects_invalid_or_inactive_user(monkeypatch):
    monkeypatch.setattr(service._user_repo, "get_by_id", AsyncMock(return_value=make_user(is_active=False)))
    token = service._create_refresh_token(str(uuid.uuid4()))
    with pytest.raises(HTTPException):
        await service.refresh_access_token(RefreshRequest(refresh_token=token), object())
    with pytest.raises(HTTPException):
        await service.refresh_access_token(RefreshRequest(refresh_token="not-a-token"), object())


@async_test
async def test_refresh_success(monkeypatch):
    user = make_user()
    monkeypatch.setattr(service._user_repo, "get_by_id", AsyncMock(return_value=user))
    response = await service.refresh_access_token(
        RefreshRequest(refresh_token=service._create_refresh_token(str(user.id))), object()
    )
    assert response.expires_in == settings.JWT_EXPIRE_MINUTES * 60


@async_test
async def test_profile_crud_paths(monkeypatch):
    monkeypatch.setattr(service._user_repo, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(HTTPException):
        await service.get_profile("missing", object())
    with pytest.raises(HTTPException):
        await service.update_profile("missing", UpdateProfileRequest(age=31), object())

    user = User(id=uuid.uuid4(), email="user@example.com", password_hash="x", age=30,
                gender=GenderEnum.male, health_goal="old", created_at=datetime.now(timezone.utc))
    monkeypatch.setattr(service._user_repo, "get_by_id", AsyncMock(return_value=user))
    monkeypatch.setattr(service._user_repo, "save", AsyncMock(return_value=user))
    assert (await service.get_profile(str(user.id), object())).email == user.email
    updated = await service.update_profile(
        str(user.id), UpdateProfileRequest(age=31, gender=GenderEnum.female, health_goal="new"), object()
    )
    assert (updated.age, updated.gender, updated.health_goal) == (31, GenderEnum.female, "new")


@async_test
async def test_subscription_queries(monkeypatch):
    monkeypatch.setattr(service._plan_repo, "get_by_user_id", AsyncMock(return_value=None))
    with pytest.raises(HTTPException):
        await service.get_subscription_plan("missing", object())
    with pytest.raises(HTTPException):
        await service.get_subscription_limit("missing", object())

    plan = make_plan(today_usage=5, daily_ai_limit=3, check_remaining_count=Mock(return_value=False))
    monkeypatch.setattr(service._plan_repo, "get_by_user_id", AsyncMock(return_value=plan))
    assert (await service.get_subscription_plan("id", object())).id == plan.id
    limit = await service.get_subscription_limit("id", object())
    assert not limit.has_remaining and limit.remaining == 0


class FakeResponse:
    def __init__(self, status_code, data):
        self.status_code = status_code
        self._data = data
    def json(self):
        return self._data


class FakeClient:
    response = None
    async def __aenter__(self):
        return self
    async def __aexit__(self, *args):
        return None
    async def get(self, *args, **kwargs):
        return self.response


@async_test
async def test_social_token_verifiers(monkeypatch):
    monkeypatch.setattr(service.httpx, "AsyncClient", FakeClient)
    FakeClient.response = FakeResponse(200, {"sub": "g1", "email": "g@example.com"})
    assert await service._verify_google_token("token") == ("g1", "g@example.com")
    FakeClient.response = FakeResponse(401, {})
    with pytest.raises(HTTPException):
        await service._verify_google_token("bad")

    payload = base64.urlsafe_b64encode(json.dumps({"sub": "a1", "email": "a@example.com"}).encode()).decode().rstrip("=")
    assert await service._verify_apple_token(f"x.{payload}.y") == ("a1", "a@example.com")
    for token in ("bad", "x.e30.y"):
        with pytest.raises(HTTPException):
            await service._verify_apple_token(token)

    FakeClient.response = FakeResponse(200, {"id": 7, "kakao_account": {"email": "k@example.com"}})
    assert await service._verify_kakao_token("token") == ("7", "k@example.com")
    FakeClient.response = FakeResponse(500, {})
    with pytest.raises(HTTPException):
        await service._verify_kakao_token("bad")


@async_test
@pytest.mark.parametrize("provider,verifier", [
    ("google", "_verify_google_token"),
    ("apple", "_verify_apple_token"),
    ("kakao", "_verify_kakao_token"),
])
async def test_social_login_provider_existing_user(monkeypatch, provider, verifier):
    user = make_user()
    monkeypatch.setattr(service, verifier, AsyncMock(return_value=("social", user.email)))
    monkeypatch.setattr(service._user_repo, "get_by_social", AsyncMock(return_value=user))
    result = await service.social_login_user(SocialLoginRequest(provider=provider, id_token="token"), object())
    assert result.user.id == user.id


@async_test
async def test_social_login_links_email_creates_fallback_and_rejects_inactive(monkeypatch):
    linked = make_user()
    monkeypatch.setattr(service, "_verify_google_token", AsyncMock(return_value=("social", linked.email)))
    monkeypatch.setattr(service._user_repo, "get_by_social", AsyncMock(return_value=None))
    monkeypatch.setattr(service._user_repo, "get_by_email", AsyncMock(return_value=linked))
    save = AsyncMock(return_value=linked)
    monkeypatch.setattr(service._user_repo, "save", save)
    await service.social_login_user(SocialLoginRequest(provider="google", id_token="token"), object())
    assert linked.social_provider == "google" and save.await_count == 1

    created = make_user(email="kakao_social@social.kelpus.com")
    monkeypatch.setattr(service, "_verify_kakao_token", AsyncMock(return_value=("social", None)))
    monkeypatch.setattr(service._user_repo, "get_by_social", AsyncMock(return_value=None))
    create = AsyncMock(return_value=created)
    monkeypatch.setattr(service._user_repo, "create_social", create)
    await service.social_login_user(SocialLoginRequest(provider="kakao", id_token="token"), object())
    assert create.await_args.args[0] == "kakao_social@social.kelpus.com"

    created.is_active = False
    with pytest.raises(HTTPException) as exc:
        await service.social_login_user(SocialLoginRequest(provider="kakao", id_token="token"), object())
    assert exc.value.status_code == 403


@async_test
async def test_delete_account_paths(monkeypatch):
    monkeypatch.setattr(service._user_repo, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(HTTPException):
        await service.delete_account("missing", object())
    user = make_user()
    delete = AsyncMock()
    monkeypatch.setattr(service._user_repo, "get_by_id", AsyncMock(return_value=user))
    monkeypatch.setattr(service._user_repo, "delete", delete)
    await service.delete_account(str(user.id), object())
    delete.assert_awaited_once_with(user, ANY)


def test_user_and_subscription_model_branches():
    user = User(id=uuid.uuid4(), email="u@example.com", age=20, gender=None, health_goal="old")
    assert user.update_profile() is user
    user.update_profile(age=21, gender=GenderEnum.female, health_goal="new")
    assert user.get_stats_summary()["gender"] == "female"
    user.gender = None
    assert user.get_stats_summary()["gender"] is None

    plan = SubscriptionPlan(daily_ai_limit=2, today_usage=2, total_usage=4, last_usage_date=date.today())
    assert not plan.check_remaining_count()
    plan.last_usage_date = None
    assert plan.check_remaining_count() and plan.today_usage == 0
    plan.update_usage()
    assert (plan.today_usage, plan.total_usage) == (1, 5)
    plan.last_usage_date = None
    plan.update_usage()
    assert plan.today_usage == 1


class ScalarResult:
    def __init__(self, value): self.value = value
    def scalar_one_or_none(self): return self.value


@async_test
async def test_user_repositories_cover_crud_paths():
    db = SimpleNamespace(
        execute=AsyncMock(side_effect=[ScalarResult("by-id"), ScalarResult("by-email"), ScalarResult("social"), ScalarResult("plan")]),
        add=Mock(), flush=AsyncMock(), refresh=AsyncMock(), delete=AsyncMock(),
    )
    users = UserRepository()
    plans = SubscriptionPlanRepository()
    uid = uuid.uuid4()
    assert await users.get_by_id(uid, db) == "by-id"
    assert await users.get_by_email("u@example.com", db) == "by-email"
    created = await users.create("u@example.com", "hash", 20, "male", "goal", db)
    assert created.email == "u@example.com"
    assert await users.get_by_social("google", "s1", db) == "social"
    social = await users.create_social("s@example.com", "google", "s1", db)
    assert social.social_id == "s1"
    await users.save(created, db)
    await users.delete(created, db)
    assert await plans.get_by_user_id(uid, db) == "plan"
    await plans.save(SubscriptionPlan(user_id=uid), db)
    assert db.flush.await_count >= 6
