"""
사용자 도메인 비즈니스 로직 서비스.
인증(회원가입, 로그인, JWT 발급), 프로필 관리, 구독 플랜 조회를 담당한다.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.domains.user.models import GenderEnum, User
from app.domains.user.repository import SubscriptionPlanRepository, UserRepository
from app.domains.user.schemas import (
    LoginRequest,
    RegisterRequest,
    SubscriptionLimitResponse,
    SubscriptionPlanResponse,
    TokenResponse,
    UpdateProfileRequest,
    UserProfileResponse,
)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_user_repo = UserRepository()
_plan_repo = SubscriptionPlanRepository()


def _hash_password(plain: str) -> str:
    """비밀번호를 bcrypt로 해싱한다."""
    return _pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    """입력된 비밀번호와 해시를 검증한다."""
    return _pwd_context.verify(plain, hashed)


def _create_access_token(user_id: str) -> tuple[str, int]:
    """
    JWT 액세스 토큰을 생성한다.

    Args:
        user_id: 사용자 UUID 문자열.

    Returns:
        (token, expires_in_seconds) 튜플.
    """
    expire_seconds = settings.JWT_EXPIRE_MINUTES * 60
    expire = datetime.now(timezone.utc) + timedelta(seconds=expire_seconds)
    payload = {"sub": user_id, "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire_seconds


async def register_user(req: RegisterRequest, db: AsyncSession) -> TokenResponse:
    """
    신규 사용자를 등록하고 JWT 토큰을 발급한다.

    Args:
        req: 회원가입 요청 데이터.
        db: 비동기 DB 세션.

    Returns:
        JWT 토큰 응답.

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
    token, expires_in = _create_access_token(str(user.id))
    return TokenResponse(access_token=token, expires_in=expires_in)


async def login_user(req: LoginRequest, db: AsyncSession) -> TokenResponse:
    """
    이메일/비밀번호로 인증하고 JWT 토큰을 발급한다 (사용자_인증_요청 → 인증_토큰_발급).

    Args:
        req: 로그인 요청 데이터.
        db: 비동기 DB 세션.

    Returns:
        JWT 토큰 응답.

    Raises:
        HTTPException(401): 이메일 또는 비밀번호가 올바르지 않을 경우.
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
    token, expires_in = _create_access_token(str(user.id))
    return TokenResponse(access_token=token, expires_in=expires_in)


async def get_profile(user_id: str, db: AsyncSession) -> UserProfileResponse:
    """
    사용자 프로필을 조회한다 (통계_조회).

    Args:
        user_id: 사용자 UUID 문자열.
        db: 비동기 DB 세션.

    Returns:
        사용자 프로필 응답.

    Raises:
        HTTPException(404): 사용자를 찾을 수 없을 경우.
    """
    user = await _user_repo.get_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return UserProfileResponse.model_validate(user)


async def update_profile(
    user_id: str, req: UpdateProfileRequest, db: AsyncSession
) -> UserProfileResponse:
    """
    사용자 프로필을 수정한다 (프로필_수정).

    Args:
        user_id: 사용자 UUID 문자열.
        req: 수정 요청 데이터.
        db: 비동기 DB 세션.

    Returns:
        수정된 사용자 프로필 응답.
    """
    user = await _user_repo.get_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    user.update_profile(age=req.age, gender=req.gender, health_goal=req.health_goal)
    saved = await _user_repo.save(user, db)
    return UserProfileResponse.model_validate(saved)


async def get_subscription_plan(user_id: str, db: AsyncSession) -> SubscriptionPlanResponse:
    """
    사용자의 구독 플랜 정보를 조회한다.

    Args:
        user_id: 사용자 UUID 문자열.
        db: 비동기 DB 세션.

    Returns:
        구독 플랜 응답.
    """
    plan = await _plan_repo.get_by_user_id(user_id, db)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="구독 플랜을 찾을 수 없습니다."
        )
    return SubscriptionPlanResponse.model_validate(plan)


async def get_subscription_limit(user_id: str, db: AsyncSession) -> SubscriptionLimitResponse:
    """
    잔여 AI 분석 횟수를 확인한다 (잔여_횟수_확인).

    Args:
        user_id: 사용자 UUID 문자열.
        db: 비동기 DB 세션.

    Returns:
        잔여 횟수 응답.
    """
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
