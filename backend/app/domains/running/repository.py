"""
러닝 도메인 DB 접근 레이어.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.running.models import Leaderboard, RunningRecord
from app.domains.user.models import User


class RunningRecordRepository:
    """러닝 기록 엔티티 저장소."""

    async def get_by_external_id(
        self, external_id: str, user_id: str | uuid.UUID, db: AsyncSession
    ) -> RunningRecord | None:
        result = await db.execute(
            select(RunningRecord).where(
                RunningRecord.external_id == external_id,
                RunningRecord.user_id == uuid.UUID(str(user_id)),
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: str | uuid.UUID,
        distance: float,
        avg_pace: float,
        gps_coordinates: list[dict],
        duration_seconds: int,
        calories: int,
        external_id: str | None,
        recorded_at: datetime | None,
        db: AsyncSession,
    ) -> RunningRecord:
        record = RunningRecord(
            user_id=uuid.UUID(str(user_id)),
            distance=distance,
            avg_pace=avg_pace,
            duration_seconds=duration_seconds,
            calories=calories,
            external_id=external_id,
            recorded_at=recorded_at or datetime.now(timezone.utc),
        )
        record.sync_route_data(gps_coordinates)
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def list_by_user(
        self, user_id: str | uuid.UUID, db: AsyncSession
    ) -> list[RunningRecord]:
        result = await db.execute(
            select(RunningRecord)
            .where(RunningRecord.user_id == uuid.UUID(str(user_id)))
            .order_by(RunningRecord.recorded_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(
        self, record_id: str | uuid.UUID, db: AsyncSession
    ) -> RunningRecord | None:
        result = await db.execute(
            select(RunningRecord).where(RunningRecord.id == uuid.UUID(str(record_id)))
        )
        return result.scalar_one_or_none()

    async def delete_by_id(
        self, record_id: str | uuid.UUID, user_id: str | uuid.UUID, db: AsyncSession
    ) -> bool:
        result = await db.execute(
            select(RunningRecord).where(
                RunningRecord.id == uuid.UUID(str(record_id)),
                RunningRecord.user_id == uuid.UUID(str(user_id)),
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            return False
        await db.delete(record)
        return True

    async def count_all(self, db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(func.distinct(RunningRecord.user_id)))
        )
        return result.scalar_one() or 0

    async def get_rank(self, user_id: str | uuid.UUID, db: AsyncSession) -> int:
        user_uuid = uuid.UUID(str(user_id))
        user_total_result = await db.execute(
            select(func.sum(RunningRecord.distance)).where(
                RunningRecord.user_id == user_uuid
            )
        )
        user_total: float = user_total_result.scalar_one() or 0.0

        better_count_result = await db.execute(
            select(func.count(func.distinct(RunningRecord.user_id))).where(
                select(func.sum(RunningRecord.distance))
                .where(RunningRecord.user_id != user_uuid)
                .scalar_subquery()
                > user_total
            )
        )
        better_count: int = better_count_result.scalar_one() or 0
        return better_count + 1


class LeaderboardRepository:
    """리더보드 엔티티 저장소."""

    async def upsert(
        self,
        user_id: str | uuid.UUID,
        running_record_id: str | uuid.UUID,
        overall_rank: int,
        percentile: float,
        badge: str | None,
        db: AsyncSession,
    ) -> Leaderboard:
        user_uuid = uuid.UUID(str(user_id))
        result = await db.execute(
            select(Leaderboard).where(Leaderboard.user_id == user_uuid)
        )
        entry = result.scalar_one_or_none()

        if entry is None:
            entry = Leaderboard(
                user_id=user_uuid,
                running_record_id=uuid.UUID(str(running_record_id)),
                overall_rank=overall_rank,
                percentile=percentile,
                badge=badge,
            )
            db.add(entry)
        else:
            entry.running_record_id = uuid.UUID(str(running_record_id))
            entry.overall_rank = overall_rank
            entry.percentile = percentile
            entry.badge = badge
            entry.updated_at = datetime.now(timezone.utc)

        await db.flush()
        await db.refresh(entry)
        return entry

    async def list_top(self, limit: int, db: AsyncSession) -> list[Leaderboard]:
        result = await db.execute(
            select(Leaderboard)
            .options(selectinload(Leaderboard.running_record))
            .order_by(Leaderboard.overall_rank.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_user(
        self, user_id: str | uuid.UUID, db: AsyncSession
    ) -> Leaderboard | None:
        result = await db.execute(
            select(Leaderboard)
            .where(Leaderboard.user_id == uuid.UUID(str(user_id)))
            .options(selectinload(Leaderboard.running_record))
        )
        return result.scalar_one_or_none()

    async def count_total(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Leaderboard.id)))
        return result.scalar_one() or 0

    async def list_by_period_criterion(
        self,
        period: str,
        criterion: str,
        limit: int,
        db: AsyncSession,
    ) -> list[dict]:
        """기간/기준별 리더보드 목록을 running_records에서 직접 집계한다."""
        now = datetime.now(timezone.utc)
        if period == "weekly":
            start_date = now - timedelta(days=7)
        elif period == "monthly":
            start_date = now - timedelta(days=30)
        else:
            start_date = None

        if criterion == "count":
            value_col = func.count(RunningRecord.id).label("value")
        elif criterion == "total_time":
            value_col = func.sum(RunningRecord.duration_seconds).label("value")
        else:
            value_col = func.sum(RunningRecord.distance).label("value")

        query = (
            select(RunningRecord.user_id, User.email, value_col)
            .join(User, User.id == RunningRecord.user_id)
            .group_by(RunningRecord.user_id, User.email)
            .order_by(value_col.desc())
            .limit(limit)
        )

        if start_date:
            query = query.where(RunningRecord.recorded_at >= start_date)

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "user_id": str(row.user_id),
                "userName": row.email.split("@")[0],
                "value": float(row.value or 0),
            }
            for row in rows
        ]
