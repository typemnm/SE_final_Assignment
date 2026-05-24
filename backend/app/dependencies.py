"""
FastAPI 의존성 주입 모듈.
DB 세션, 현재 사용자, 구독 플랜 확인 등의 의존성을 제공한다.
"""

from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """요청마다 독립적인 DB 세션을 제공하고 완료 후 닫는다."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    JWT 토큰을 검증하고 현재 인증된 사용자 정보를 반환한다.

    Args:
        credentials: Authorization 헤더의 Bearer 토큰.
        db: 비동기 DB 세션.

    Returns:
        사용자 페이로드 딕셔너리 (sub: user_id 포함).

    Raises:
        HTTPException(401): 토큰이 유효하지 않을 경우.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 토큰이 유효하지 않습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return {"user_id": user_id, "payload": payload}
    except JWTError:
        raise credentials_exception


async def check_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    구독 플랜의 일일 AI 분석 잔여 횟수를 확인한다.

    Args:
        current_user: 인증된 사용자 정보.
        db: 비동기 DB 세션.

    Returns:
        잔여 횟수가 있을 경우 사용자 정보를 반환.

    Raises:
        HTTPException(402): 일일 한도 초과 시.
    """
    from app.domains.user.repository import SubscriptionPlanRepository

    repo = SubscriptionPlanRepository()
    plan = await repo.get_by_user_id(current_user["user_id"], db)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 플랜 정보를 찾을 수 없습니다.",
        )
    if not plan.check_remaining_count():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="일일 AI 분석 한도를 초과했습니다. 구독 플랜을 업그레이드하세요.",
        )
    return current_user
