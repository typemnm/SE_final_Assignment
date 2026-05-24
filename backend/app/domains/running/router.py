"""
러닝 도메인 라우터.
/api/v1/running 엔드포인트를 제공한다.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.running import schemas, service

running_router = APIRouter(prefix="/api/v1/running", tags=["러닝"])


@running_router.post(
    "/sync",
    response_model=schemas.RunningSyncResponse,
    status_code=200,
    summary="러닝 기록 동기화",
    description="러닝 기록을 저장하고 리더보드 순위 및 상위 백분율을 갱신한다.",
)
async def sync_running(
    req: schemas.RunningSyncRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.RunningSyncResponse:
    """러닝 기록 동기화 엔드포인트."""
    return await service.sync_running_record(current_user["user_id"], req, db)


@running_router.get(
    "/leaderboard",
    response_model=schemas.LeaderboardResponse,
    summary="리더보드 조회",
    description="상위 N명의 리더보드와 현재 사용자의 순위를 반환한다 (리더보드_순위_반환).",
)
async def get_leaderboard(
    limit: int = Query(default=50, ge=1, le=200, description="조회할 상위 N명"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.LeaderboardResponse:
    """리더보드 조회 엔드포인트."""
    return await service.get_leaderboard(current_user["user_id"], limit, db)
