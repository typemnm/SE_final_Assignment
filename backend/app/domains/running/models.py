"""
러닝 도메인 ORM 모델.
RunningRecord, Leaderboard 엔티티를 SQLAlchemy 2.0 비동기 스타일로 정의한다.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RunningRecord(Base):
    """
    러닝 기록 엔티티.

    Attributes:
        id: UUID 기본키 (기록_ID).
        user_id: 사용자 외래키.
        distance: 이동 거리 (km).
        avg_pace: 평균 페이스 (분/km).
        gps_coordinates: GPS 좌표 데이터 JSON.
        recorded_at: 기록 일시.
    """

    __tablename__ = "running_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    distance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    avg_pace: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gps_coordinates: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # 관계
    leaderboard_entry: Mapped["Leaderboard | None"] = relationship(
        "Leaderboard", back_populates="running_record", uselist=False
    )

    def sync_route_data(self, gps_data: list[dict]) -> "RunningRecord":
        """
        GPS 경로 데이터를 동기화한다 (경로_데이터_등기화).

        Args:
            gps_data: GPS 좌표 딕셔너리 목록 ([{"lat": float, "lng": float, "timestamp": str}]).

        Returns:
            gps_coordinates가 채워진 RunningRecord 인스턴스.
        """
        self.gps_coordinates = gps_data
        return self


class Leaderboard(Base):
    """
    리더보드 엔티티.

    Attributes:
        id: UUID 기본키 (기록_ID).
        user_id: 사용자 외래키.
        running_record_id: 러닝 기록 외래키.
        overall_rank: 전체 순위.
        percentile: 상위 백분율.
        badge: 획득 뱃지 이름.
        updated_at: 마지막 업데이트 일시.
    """

    __tablename__ = "leaderboard"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    running_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("running_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    overall_rank: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    percentile: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    badge: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # 관계
    running_record: Mapped["RunningRecord"] = relationship(
        "RunningRecord", back_populates="leaderboard_entry"
    )

    def calculate_percentile(self, total_users: int, user_rank: int) -> "Leaderboard":
        """
        상위 백분율을 계산하고 업데이트한다 (백분율_계산).

        Args:
            total_users: 전체 사용자 수.
            user_rank: 사용자 순위 (1위 = 최고).

        Returns:
            업데이트된 Leaderboard 인스턴스.
        """
        if total_users <= 0:
            self.percentile = 0.0
        else:
            self.percentile = round((1 - user_rank / total_users) * 100, 2)
        self.overall_rank = user_rank
        self.updated_at = datetime.now(timezone.utc)
        return self

    def get_rank_info(self) -> dict:
        """
        순위 정보를 딕셔너리로 반환한다 (순위_조회).

        Returns:
            순위, 백분율, 뱃지 정보 딕셔너리.
        """
        return {
            "overall_rank": self.overall_rank,
            "percentile": self.percentile,
            "badge": self.badge,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
