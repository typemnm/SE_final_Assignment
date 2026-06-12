"""
러닝 도메인 비즈니스 로직 서비스.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.running.repository import LeaderboardRepository, RunningRecordRepository
from app.domains.running.schemas import (
    LeaderboardEntry,
    LeaderboardListEntry,
    LeaderboardListResponse,
    LeaderboardNearbyResponse,
    LeaderboardResponse,
    RunningCourseItem,
    RunningRecordResponse,
    RunningSyncRequest,
    RunningSyncResponse,
)

_running_repo = RunningRecordRepository()
_leaderboard_repo = LeaderboardRepository()

_BADGE_THRESHOLDS: list[tuple[float, str]] = [
    (1.0, "다이아몬드"),
    (5.0, "플래티넘"),
    (10.0, "골드"),
    (25.0, "실버"),
    (50.0, "브론즈"),
]

_RECOMMENDED_COURSES: list[dict] = [
    {
        "id": "course-1",
        "name": "한강 공원 코스",
        "distance": 5.0,
        "difficulty": "쉬움",
        "description": "한강변을 따라 달리는 평탄한 코스. 경치가 아름다워 초보자에게 추천합니다.",
        "location": "서울 여의도 한강공원",
        "estimatedTime": 30,
        "rating": 4.8,
    },
    {
        "id": "course-2",
        "name": "남산 둘레길 코스",
        "distance": 7.5,
        "difficulty": "보통",
        "description": "남산을 한 바퀴 도는 코스. 약간의 경사가 있어 체력 향상에 좋습니다.",
        "location": "서울 중구 남산공원",
        "estimatedTime": 55,
        "rating": 4.6,
    },
    {
        "id": "course-3",
        "name": "올림픽 공원 코스",
        "distance": 3.5,
        "difficulty": "쉬움",
        "description": "올림픽공원 내부를 달리는 짧고 쾌적한 코스. 잔디밭과 조각공원을 즐기며 달릴 수 있습니다.",
        "location": "서울 송파구 올림픽공원",
        "estimatedTime": 22,
        "rating": 4.5,
    },
    {
        "id": "course-4",
        "name": "북악 스카이웨이 코스",
        "distance": 10.0,
        "difficulty": "어려움",
        "description": "북악산 능선을 따라 달리는 도전적인 코스. 서울 시내 전망이 훌륭합니다.",
        "location": "서울 종로구 북악산",
        "estimatedTime": 80,
        "rating": 4.4,
    },
    {
        "id": "course-5",
        "name": "탄천 산책로 코스",
        "distance": 6.0,
        "difficulty": "쉬움",
        "description": "탄천을 따라 이어지는 자전거·보행자 겸용 도로. 평탄하고 쾌적한 달리기 환경을 제공합니다.",
        "location": "경기 성남시 탄천",
        "estimatedTime": 38,
        "rating": 4.3,
    },
]


def _determine_badge(percentile: float) -> str | None:
    top_percent = 100.0 - percentile
    for threshold, badge in _BADGE_THRESHOLDS:
        if top_percent <= threshold:
            return badge
    return None


def _record_to_response(record) -> RunningRecordResponse:
    route = record.gps_coordinates or []
    split_paces = _generate_split_paces(route, record.distance, record.avg_pace)
    calories = record.calories if record.calories else int(record.distance * 65)
    return RunningRecordResponse(
        id=str(record.id),
        date=record.recorded_at.isoformat(),
        distance=record.distance,
        duration=record.duration_seconds or 0,
        avgPace=record.avg_pace,
        calories=calories,
        route=route,
        splitPaces=split_paces,
    )


def _generate_split_paces(
    route: list[dict], total_distance_km: float, avg_pace: float
) -> list[dict]:
    num_splits = max(1, int(total_distance_km)) if total_distance_km > 0 else 0
    if num_splits == 0:
        return []
    return [{"km": i + 1, "pace": int(avg_pace * 60)} for i in range(num_splits)]


async def calculate_percentile(user_id: str, db: AsyncSession) -> float:
    total_users = await _running_repo.count_all(db)
    if total_users == 0:
        return 100.0
    user_rank = await _running_repo.get_rank(user_id, db)
    percentile = round((1 - user_rank / total_users) * 100, 2)
    return max(0.0, min(100.0, percentile))


async def sync_running_record(
    user_id: str, req: RunningSyncRequest, db: AsyncSession
) -> RunningSyncResponse:
    if req.external_id:
        existing = await _running_repo.get_by_external_id(req.external_id, user_id, db)
        if existing is not None:
            percentile = await calculate_percentile(user_id, db)
            user_rank = await _running_repo.get_rank(user_id, db)
            return RunningSyncResponse(
                record_id=existing.id,
                created=False,
                distance=existing.distance,
                avg_pace=existing.avg_pace,
                percentile=percentile,
                overall_rank=user_rank,
                message="이미 동기화된 기록입니다.",
            )

    calories = req.calories if req.calories > 0 else int(req.distance * 65)
    record = await _running_repo.create(
        user_id=user_id,
        distance=req.distance,
        avg_pace=req.avg_pace,
        gps_coordinates=req.gps_coordinates,
        duration_seconds=req.duration_seconds,
        calories=calories,
        external_id=req.external_id,
        recorded_at=req.recorded_at,
        db=db,
    )

    percentile = await calculate_percentile(user_id, db)
    total_users = await _running_repo.count_all(db)
    user_rank = await _running_repo.get_rank(user_id, db)
    badge = _determine_badge(percentile)

    await _leaderboard_repo.upsert(
        user_id=user_id,
        running_record_id=record.id,
        overall_rank=user_rank,
        percentile=percentile,
        badge=badge,
        db=db,
    )

    return RunningSyncResponse(
        record_id=record.id,
        created=True,
        distance=record.distance,
        avg_pace=record.avg_pace,
        percentile=percentile,
        overall_rank=user_rank,
        message="러닝 기록 동기화 및 리더보드 갱신 완료",
    )


async def get_records(user_id: str, db: AsyncSession) -> list[RunningRecordResponse]:
    records = await _running_repo.list_by_user(user_id, db)
    return [_record_to_response(r) for r in records]


async def get_record(
    record_id: str, user_id: str, db: AsyncSession
) -> RunningRecordResponse:
    record = await _running_repo.get_by_id(record_id, db)
    if record is None or str(record.user_id) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="기록을 찾을 수 없습니다.")
    return _record_to_response(record)


async def delete_record(record_id: str, user_id: str, db: AsyncSession) -> None:
    deleted = await _running_repo.delete_by_id(record_id, user_id, db)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="기록을 찾을 수 없습니다.")


async def get_courses() -> list[RunningCourseItem]:
    return [RunningCourseItem(**c) for c in _RECOMMENDED_COURSES]


async def get_leaderboard(
    user_id: str, limit: int, db: AsyncSession
) -> LeaderboardResponse:
    entries_orm = await _leaderboard_repo.list_top(limit, db)
    total_users = await _leaderboard_repo.count_total(db)

    entries = [
        LeaderboardEntry(
            id=entry.id,
            user_id=entry.user_id,
            overall_rank=entry.overall_rank,
            percentile=entry.percentile,
            badge=entry.badge,
            distance=entry.running_record.distance if entry.running_record else 0.0,
            updated_at=entry.updated_at,
        )
        for entry in entries_orm
    ]

    my_entry = await _leaderboard_repo.get_by_user(user_id, db)

    return LeaderboardResponse(
        entries=entries,
        total_users=total_users,
        my_rank=my_entry.overall_rank if my_entry else None,
        my_percentile=my_entry.percentile if my_entry else None,
    )


async def get_leaderboard_list(
    user_id: str,
    period: str,
    criterion: str,
    limit: int,
    db: AsyncSession,
) -> LeaderboardListResponse:
    rows = await _leaderboard_repo.list_by_period_criterion(period, criterion, limit, db)

    current_user_id = str(user_id)
    my_rank = None
    my_value = None

    entries = []
    for rank, row in enumerate(rows, 1):
        is_me = row["user_id"] == current_user_id
        if is_me:
            my_rank = rank
            my_value = row["value"]
        entries.append(
            LeaderboardListEntry(
                rank=rank,
                userId=row["user_id"],
                userName=row["userName"],
                value=row["value"],
                isCurrentUser=is_me,
            )
        )

    return LeaderboardListResponse(
        entries=entries,
        period=period,
        criterion=criterion,
        myRank=my_rank,
        myValue=my_value,
    )


async def get_nearby_leaderboard(
    user_id: str,
    period: str,
    criterion: str,
    window: int,
    db: AsyncSession,
) -> LeaderboardNearbyResponse:
    rows = await _leaderboard_repo.list_by_period_criterion(period, criterion, 1000, db)

    current_user_id = str(user_id)
    all_entries: list[LeaderboardListEntry] = []
    my_rank: int | None = None
    my_value: float | None = None

    for rank, row in enumerate(rows, 1):
        is_me = row["user_id"] == current_user_id
        if is_me:
            my_rank = rank
            my_value = row["value"]
        all_entries.append(
            LeaderboardListEntry(
                rank=rank,
                userId=row["user_id"],
                userName=row["userName"],
                value=row["value"],
                isCurrentUser=is_me,
            )
        )

    if my_rank is None:
        nearby = all_entries[:window]
    else:
        start = max(0, my_rank - window - 1)
        end = min(len(all_entries), my_rank + window)
        nearby = all_entries[start:end]

    return LeaderboardNearbyResponse(
        entries=nearby,
        myRank=my_rank,
        myValue=my_value,
        totalUsers=len(all_entries),
        period=period,
        criterion=criterion,
    )
