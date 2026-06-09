"""
러닝 도메인 라우터.
/api/v1/running 엔드포인트를 제공한다.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.running import schemas, service

running_router = APIRouter(prefix="/api/v1/running", tags=["러닝"])


@running_router.get(
    "",
    response_model=list[schemas.RunningRecordResponse],
    summary="러닝 기록 목록",
    description="현재 사용자의 러닝 기록 전체를 최신순으로 반환한다.",
)
async def list_records(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[schemas.RunningRecordResponse]:
    return await service.get_records(current_user["user_id"], db)


@running_router.get(
    "/courses",
    response_model=list[schemas.RunningCourseItem],
    summary="추천 러닝 코스",
    description="인기 러닝 코스 목록을 반환한다.",
)
async def list_courses(
    _: dict = Depends(get_current_user),
) -> list[schemas.RunningCourseItem]:
    return await service.get_courses()


@running_router.get(
    "/leaderboard",
    response_model=schemas.LeaderboardListResponse,
    summary="리더보드 조회",
    description="기간/기준별 리더보드 목록을 반환한다.",
)
async def get_leaderboard(
    period: str = Query(default="weekly", description="weekly | monthly | all"),
    criterion: str = Query(default="total_distance", description="total_distance | count | total_time"),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.LeaderboardListResponse:
    return await service.get_leaderboard_list(
        current_user["user_id"], period, criterion, limit, db
    )


@running_router.get(
    "/leaderboard/nearby",
    response_model=schemas.LeaderboardNearbyResponse,
    summary="주변 순위 조회",
    description="현재 사용자 기준 위아래 순위를 반환한다.",
)
async def get_nearby_leaderboard(
    period: str = Query(default="weekly", description="weekly | monthly | all"),
    criterion: str = Query(default="total_distance", description="total_distance | count | total_time"),
    window: int = Query(default=3, ge=1, le=10),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.LeaderboardNearbyResponse:
    return await service.get_nearby_leaderboard(
        current_user["user_id"], period, criterion, window, db
    )


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
    return await service.sync_running_record(current_user["user_id"], req, db)


@running_router.get(
    "/{record_id}",
    response_model=schemas.RunningRecordResponse,
    summary="러닝 기록 상세",
    description="특정 러닝 기록의 상세 정보를 반환한다.",
)
async def get_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.RunningRecordResponse:
    return await service.get_record(record_id, current_user["user_id"], db)


@running_router.delete(
    "/{record_id}",
    status_code=204,
    summary="러닝 기록 삭제",
    description="특정 러닝 기록을 삭제한다.",
)
async def delete_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await service.delete_record(record_id, current_user["user_id"], db)
