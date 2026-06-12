"""Health Connect telemetry ORM models."""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HealthDailyActivityRecord(Base):
    """Daily Health Connect activity summary for one user/date window."""

    __tablename__ = "health_daily_activity_records"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "external_id",
            name="uq_health_daily_activity_user_external_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    external_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_calories: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_calories: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class HealthHeartRateRecord(Base):
    """Health Connect heart-rate sample group."""

    __tablename__ = "health_heart_rate_records"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "external_id",
            name="uq_health_heart_rate_user_external_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    external_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    samples: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
