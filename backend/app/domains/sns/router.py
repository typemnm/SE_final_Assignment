"""
SNS 도메인 라우터.
/api/v1/feed 엔드포인트를 제공한다.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.sns import schemas, service

feed_router = APIRouter(prefix="/api/v1/feed", tags=["피드"])


@feed_router.get(
    "",
    response_model=schemas.FeedListResponse,
    summary="브이로그 피드 목록 조회",
    description=(
        "캐시된 피드 데이터를 우선 반환하며, 캐시가 없을 경우 DB에서 조회한다 "
        "(캐싱된_피드_데이터_조회 → 피드_리스트_반환)."
    ),
)
async def get_feed(
    page: int = Query(default=1, ge=1, description="페이지 번호"),
    page_size: int = Query(default=20, ge=1, le=100, description="페이지당 항목 수"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.FeedListResponse:
    """피드 목록 조회 엔드포인트."""
    return await service.get_feed_list(
        page=page,
        page_size=page_size,
        db=db,
        redis_client=None,  # 실제 Redis 연결은 lifespan에서 주입
    )
