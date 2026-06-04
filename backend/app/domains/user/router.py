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
    description="새 사용자를 등록하고 JWT 액세스/리프레시 토큰을 발급한다.",
)
async def register(
    req: schemas.RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> schemas.TokenResponse:
    return await service.register_user(req, db)


@auth_router.post(
    "/login",
    response_model=schemas.TokenResponse,
    summary="로그인",
    description="이메일/비밀번호로 인증하고 JWT 토큰을 발급한다.",
)
async def login(
    req: schemas.LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> schemas.TokenResponse:
    return await service.login_user(req, db)


@auth_router.post(
    "/refresh",
    response_model=schemas.RefreshResponse,
    summary="토큰 갱신",
    description="리프레시 토큰으로 새 액세스 토큰을 발급한다.",
)
async def refresh(
    req: schemas.RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> schemas.RefreshResponse:
    return await service.refresh_access_token(req, db)


@auth_router.post(
    "/social",
    response_model=schemas.TokenResponse,
    summary="소셜 로그인",
    description="Google, Apple, Kakao 소셜 계정으로 로그인하거나 자동 회원가입한다.",
)
async def social_login(
    req: schemas.SocialLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> schemas.TokenResponse:
    return await service.social_login_user(req, db)


@auth_router.post(
    "/logout",
    status_code=204,
    summary="로그아웃",
    description="클라이언트 측 토큰 삭제를 위한 엔드포인트 (서버는 상태 없음).",
)
async def logout() -> None:
    return None


@auth_router.delete(
    "/account",
    status_code=204,
    summary="회원 탈퇴",
    description="현재 인증된 사용자의 계정과 모든 데이터를 영구 삭제한다.",
)
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await service.delete_account(current_user["user_id"], db)
    return None


# ─── 사용자 엔드포인트 ────────────────────────────────────────────────────────


@user_router.get(
    "/me",
    response_model=schemas.UserProfileResponse,
    summary="내 프로필 조회",
)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.UserProfileResponse:
    return await service.get_profile(current_user["user_id"], db)


@user_router.patch(
    "/me",
    response_model=schemas.UserProfileResponse,
    summary="내 프로필 수정",
)
async def update_my_profile(
    req: schemas.UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.UserProfileResponse:
    return await service.update_profile(current_user["user_id"], req, db)


# ─── 구독 엔드포인트 ──────────────────────────────────────────────────────────


@subscription_router.get(
    "/plan",
    response_model=schemas.SubscriptionPlanResponse,
    summary="구독 플랜 조회",
)
async def get_plan(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.SubscriptionPlanResponse:
    return await service.get_subscription_plan(current_user["user_id"], db)


@subscription_router.get(
    "/limit",
    response_model=schemas.SubscriptionLimitResponse,
    summary="잔여 AI 분석 횟수 조회",
)
async def get_limit(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.SubscriptionLimitResponse:
    return await service.get_subscription_limit(current_user["user_id"], db)
