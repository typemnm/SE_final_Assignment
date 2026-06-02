"""
사용자 도메인 비즈니스 로직 서비스.
인증(회원가입, 로그인, JWT 발급), 프로필 관리, 구독 플랜 조회를 담당한다.
"""

import base64
import json
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.domains.user.models import GenderEnum, User
from app.domains.user.repository import SubscriptionPlanRepository, UserRepository
from app.domains.user.schemas import (
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    SocialLoginRequest,
    SubscriptionLimitResponse,
    SubscriptionPlanResponse,
    TokenResponse,
    UpdateProfileRequest,
    UserInfo,
    UserProfileResponse,
)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_user_repo = UserRepository()
_plan_repo = SubscriptionPlanRepository()

_REFRESH_EXPIRE_DAYS = 7


def _hash_password(plain: str) -> str:
    """비밀번호를 bcrypt로 해싱한다."""
    return _pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    """입력된 비밀번호와 해시를 검증한다."""
    return _pwd_context.verify(plain, hashed)


def _create_access_token(user_id: str) -> tuple[str, int]:
    """
    JWT 액세스 토큰을 생성한다.

    Returns:
        (token, expires_in_seconds) 튜플.
    """
    expire_seconds = settings.JWT_EXPIRE_MINUTES * 60
    expire = datetime.now(timezone.utc) + timedelta(seconds=expire_seconds)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire_seconds


def _create_refresh_token(user_id: str) -> str:
    """
    JWT 리프레시 토큰을 생성한다 (7일 유효).

    Returns:
        refresh token 문자열.
    """
    expire = datetime.now(timezone.utc) + timedelta(days=_REFRESH_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _build_token_response(user: User) -> TokenResponse:
    """User 객체로부터 TokenResponse를 생성한다."""
    access_token, expires_in = _create_access_token(str(user.id))
    refresh_token = _create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=UserInfo(id=user.id, email=user.email),
    )


async def register_user(req: RegisterRequest, db: AsyncSession) -> TokenResponse:
    """
    신규 사용자를 등록하고 JWT 토큰을 발급한다.

    Raises:
        HTTPException(409): 이메일이 이미 존재할 경우.
    """
    existing = await _user_repo.get_by_email(req.email, db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 이메일입니다.",
        )
    password_hash = _hash_password(req.password)
    user = await _user_repo.create(
        email=req.email,
        password_hash=password_hash,
        age=req.age,
        gender=req.gender,
        health_goal=req.health_goal,
        db=db,
    )
    return _build_token_response(user)


async def login_user(req: LoginRequest, db: AsyncSession) -> TokenResponse:
    """
    이메일/비밀번호로 인증하고 JWT 토큰을 발급한다.

    Raises:
        HTTPException(401): 이메일 또는 비밀번호가 올바르지 않을 경우.
        HTTPException(403): 비활성화된 계정일 경우.
    """
    user = await _user_repo.get_by_email(req.email, db)
    if not user or not _verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다.",
        )
    return _build_token_response(user)


async def refresh_access_token(req: RefreshRequest, db: AsyncSession) -> RefreshResponse:
    """
    리프레시 토큰을 검증하고 새 액세스 토큰을 발급한다.

    Raises:
        HTTPException(401): 리프레시 토큰이 유효하지 않을 경우.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="리프레시 토큰이 유효하지 않습니다.",
    )
    try:
        payload = jwt.decode(
            req.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            raise credentials_exception
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await _user_repo.get_by_id(user_id, db)
    if not user or not user.is_active:
        raise credentials_exception

    access_token, expires_in = _create_access_token(str(user.id))
    return RefreshResponse(access_token=access_token, expires_in=expires_in)


async def get_profile(user_id: str, db: AsyncSession) -> UserProfileResponse:
    """사용자 프로필을 조회한다."""
    user = await _user_repo.get_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return UserProfileResponse.model_validate(user)


async def update_profile(
    user_id: str, req: UpdateProfileRequest, db: AsyncSession
) -> UserProfileResponse:
    """사용자 프로필을 수정한다."""
    user = await _user_repo.get_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    user.update_profile(age=req.age, gender=req.gender, health_goal=req.health_goal)
    saved = await _user_repo.save(user, db)
    return UserProfileResponse.model_validate(saved)


async def get_subscription_plan(user_id: str, db: AsyncSession) -> SubscriptionPlanResponse:
    """사용자의 구독 플랜 정보를 조회한다."""
    plan = await _plan_repo.get_by_user_id(user_id, db)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="구독 플랜을 찾을 수 없습니다."
        )
    return SubscriptionPlanResponse.model_validate(plan)


async def _verify_google_token(id_token: str) -> tuple[str, str | None]:
    """Google ID 토큰을 tokeninfo 엔드포인트로 검증한다."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google 토큰 인증 실패")
    data = resp.json()
    return data["sub"], data.get("email")


async def _verify_apple_token(identity_token: str) -> tuple[str, str | None]:
    """Apple identity token (JWT)의 페이로드를 디코딩해 sub를 추출한다."""
    parts = identity_token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Apple 토큰 형식 오류")
    padding = 4 - len(parts[1]) % 4
    payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * padding))
    sub: str | None = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Apple 토큰 검증 실패")
    return sub, payload.get("email")


async def _verify_kakao_token(access_token: str) -> tuple[str, str | None]:
    """Kakao 액세스 토큰으로 사용자 정보를 조회한다."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kakao 토큰 인증 실패")
    data = resp.json()
    social_id = str(data["id"])
    email: str | None = data.get("kakao_account", {}).get("email")
    return social_id, email


async def social_login_user(req: SocialLoginRequest, db: AsyncSession) -> TokenResponse:
    """
    소셜 제공자 토큰을 검증하고 사용자를 찾거나 생성한 후 JWT를 발급한다.

    Raises:
        HTTPException(401): 소셜 토큰 검증 실패.
        HTTPException(403): 비활성화된 계정.
    """
    provider = req.provider.value

    if provider == "google":
        social_id, email = await _verify_google_token(req.id_token)
    elif provider == "apple":
        social_id, email = await _verify_apple_token(req.id_token)
    else:
        social_id, email = await _verify_kakao_token(req.id_token)

    user = await _user_repo.get_by_social(provider, social_id, db)

    if not user and email:
        # 동일 이메일 계정이 있으면 소셜 정보를 연결
        user = await _user_repo.get_by_email(email, db)
        if user:
            user.social_provider = provider
            user.social_id = social_id
            await _user_repo.save(user, db)

    if not user:
        fallback_email = email or f"{provider}_{social_id}@social.kelpus.com"
        user = await _user_repo.create_social(fallback_email, provider, social_id, db)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="비활성화된 계정입니다.")

    return _build_token_response(user)


async def delete_account(user_id: str, db: AsyncSession) -> None:
    """현재 사용자의 계정을 영구 삭제한다."""
    user = await _user_repo.get_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    await _user_repo.delete(user, db)


async def get_subscription_limit(user_id: str, db: AsyncSession) -> SubscriptionLimitResponse:
    """잔여 AI 분석 횟수를 확인한다."""
    plan = await _plan_repo.get_by_user_id(user_id, db)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="구독 플랜을 찾을 수 없습니다."
        )
    has_remaining = plan.check_remaining_count()
    remaining = max(0, plan.daily_ai_limit - plan.today_usage)
    return SubscriptionLimitResponse(
        has_remaining=has_remaining,
        today_usage=plan.today_usage,
        daily_ai_limit=plan.daily_ai_limit,
        remaining=remaining,
    )
