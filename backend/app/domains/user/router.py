"""
사용자 도메인 라우터.
인증(/api/v1/auth), 사용자(/api/v1/users), 구독(/api/v1/subscription) 엔드포인트를 제공한다.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.user import schemas, service

auth_router = APIRouter(prefix="/api/v1/auth", tags=["인증"])
user_router = APIRouter(prefix="/api/v1/users", tags=["사용자"])
subscription_router = APIRouter(prefix="/api/v1/subscription", tags=["구독"])


# ─── 인증 엔드포인트 ──────────────────────────────────────────────────────────


@auth_router.post(
    "/register",
    response_model=schemas.TokenResponse,
    status_code=201,
    summary="회원가입",
    description="새 사용자를 등록하고 JWT 액세스 토큰을 발급한다.",
)
async def register(
    req: schemas.RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> schemas.TokenResponse:
    """회원가입 엔드포인트."""
    return await service.register_user(req, db)


@auth_router.post(
    "/login",
    response_model=schemas.TokenResponse,
    summary="로그인",
    description="이메일/비밀번호로 인증하고 JWT 토큰을 발급한다 (사용자_인증_요청 → 인증_토큰_발급).",
)
async def login(
    req: schemas.LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> schemas.TokenResponse:
    """로그인 엔드포인트."""
    return await service.login_user(req, db)


# ─── 사용자 엔드포인트 ────────────────────────────────────────────────────────


@user_router.get(
    "/me",
    response_model=schemas.UserProfileResponse,
    summary="내 프로필 조회",
    description="인증된 사용자의 프로필 정보를 반환한다 (통계_조회).",
)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.UserProfileResponse:
    """내 프로필 조회 엔드포인트."""
    return await service.get_profile(current_user["user_id"], db)


@user_router.patch(
    "/me",
    response_model=schemas.UserProfileResponse,
    summary="내 프로필 수정",
    description="나이, 성별, 건강 목표를 수정한다 (프로필_수정).",
)
async def update_my_profile(
    req: schemas.UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.UserProfileResponse:
    """내 프로필 수정 엔드포인트."""
    return await service.update_profile(current_user["user_id"], req, db)


# ─── 구독 엔드포인트 ──────────────────────────────────────────────────────────


@subscription_router.get(
    "/plan",
    response_model=schemas.SubscriptionPlanResponse,
    summary="구독 플랜 조회",
    description="현재 구독 플랜 정보를 반환한다.",
)
async def get_plan(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.SubscriptionPlanResponse:
    """구독 플랜 조회 엔드포인트."""
    return await service.get_subscription_plan(current_user["user_id"], db)


@subscription_router.get(
    "/limit",
    response_model=schemas.SubscriptionLimitResponse,
    summary="잔여 AI 분석 횟수 조회",
    description="오늘 남은 AI 분석 횟수를 반환한다 (잔여_횟수_확인).",
)
async def get_limit(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.SubscriptionLimitResponse:
    """잔여 횟수 조회 엔드포인트."""
    return await service.get_subscription_limit(current_user["user_id"], db)
