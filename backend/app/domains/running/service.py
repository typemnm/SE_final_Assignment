"""
러닝 도메인 비즈니스 로직 서비스.
러닝 기록 동기화, 리더보드 백분율 계산, 리더보드 조회를 담당한다.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.running.repository import LeaderboardRepository, RunningRecordRepository
from app.domains.running.schemas import (
    LeaderboardEntry,
    LeaderboardResponse,
    RunningSyncRequest,
    RunningSyncResponse,
)

_running_repo = RunningRecordRepository()
_leaderboard_repo = LeaderboardRepository()

# 뱃지 기준 (상위 백분율 기준)
_BADGE_THRESHOLDS: list[tuple[float, str]] = [
    (1.0, "🥇 다이아몬드"),
    (5.0, "🥈 플래티넘"),
    (10.0, "🥉 골드"),
    (25.0, "🎖️ 실버"),
    (50.0, "🏅 브론즈"),
]


def _determine_badge(percentile: float) -> str | None:
    """
    상위 백분율에 따라 뱃지를 결정한다.

    Args:
        percentile: 상위 백분율 (0~100).

    Returns:
        뱃지 문자열 또는 None.
    """
    top_percent = 100.0 - percentile
    for threshold, badge in _BADGE_THRESHOLDS:
        if top_percent <= threshold:
            return badge
    return None


async def calculate_percentile(user_id: str, db: AsyncSession) -> float:
    """
    사용자의 러닝 상위 백분율을 계산한다.

    Args:
        user_id: 사용자 UUID 문자열.
        db: 비동기 DB 세션.

    Returns:
        상위 백분율 (0.0 ~ 100.0).
    """
    total_users = await _running_repo.count_all(db)
    if total_users == 0:
        return 100.0
    user_rank = await _running_repo.get_rank(user_id, db)
    percentile = round((1 - user_rank / total_users) * 100, 2)
    return max(0.0, min(100.0, percentile))


async def sync_running_record(
    user_id: str, req: RunningSyncRequest, db: AsyncSession
) -> RunningSyncResponse:
    """
    러닝 기록을 동기화하고 리더보드 순위를 갱신한다 (러닝_기록_조회_및_저장 → 백분율_계산).

    Args:
        user_id: 사용자 UUID 문자열.
        req: 러닝 동기화 요청 데이터.
        db: 비동기 DB 세션.

    Returns:
        동기화 완료 응답 (순위 및 백분율 포함).
    """
    # 1. 러닝 기록 저장
    record = await _running_repo.create(
        user_id=user_id,
        distance=req.distance,
        avg_pace=req.avg_pace,
        gps_coordinates=req.gps_coordinates,
        recorded_at=req.recorded_at,
        db=db,
    )

    # 2. 백분율 계산 (백분율_계산)
    percentile = await calculate_percentile(user_id, db)
    total_users = await _running_repo.count_all(db)
    user_rank = await _running_repo.get_rank(user_id, db)
    badge = _determine_badge(percentile)

    # 3. 리더보드 갱신
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
        distance=record.distance,
        avg_pace=record.avg_pace,
        percentile=percentile,
        overall_rank=user_rank,
        message="러닝 기록 동기화 및 리더보드 갱신 완료",
    )


async def get_leaderboard(
    user_id: str, limit: int, db: AsyncSession
) -> LeaderboardResponse:
    """
    리더보드 순위를 반환한다 (리더보드_순위_반환).

    Args:
        user_id: 현재 사용자 UUID 문자열.
        limit: 조회할 상위 N명.
        db: 비동기 DB 세션.

    Returns:
        리더보드 응답 (내 순위 포함).
    """
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

    # 내 순위 조회
    my_entry = await _leaderboard_repo.get_by_user(user_id, db)

    return LeaderboardResponse(
        entries=entries,
        total_users=total_users,
        my_rank=my_entry.overall_rank if my_entry else None,
        my_percentile=my_entry.percentile if my_entry else None,
    )
