"""
식단 도메인 ORM 모델.
DietRecord, DietAnalysisResult 엔티티를 SQLAlchemy 2.0 비동기 스타일로 정의한다.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DataSourceEnum(str, enum.Enum):
    """식단 데이터 출처 열거형."""

    os_health = "os_health"
    manual = "manual"
    health_connect = "health_connect"


class HealthConnectExportStatusEnum(str, enum.Enum):
    """Health Connect outbound Nutrition export status."""

    not_exported = "not_exported"
    exported = "exported"
    permission_required = "permission_required"
    unavailable = "unavailable"
    failed = "failed"
    deleted = "deleted"


class DietRecord(Base):
    """
    식단 기록 엔티티.

    Attributes:
        id: UUID 기본키 (기록_ID).
        user_id: 사용자 외래키.
        recorded_at: 등기화 일시.
        data_source: 데이터 출처 (os_health/manual).
        diet_image_url: 식단 이미지 URL.
        nutrition_data: 영양소 데이터 JSON.
        external_id: inbound Health Connect import ID or deterministic fallback key.
        health_connect_client_record_id: outbound Health Connect Nutrition clientRecordId.
    """

    __tablename__ = "diet_records"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "data_source",
            "external_id",
            name="uq_diet_records_user_source_external_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    data_source: Mapped[DataSourceEnum] = mapped_column(
        Enum(DataSourceEnum, name="data_source_enum"),
        default=DataSourceEnum.manual,
        nullable=False,
    )
    diet_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    nutrition_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Inbound Health Connect import identity only. Do not reuse this for outbound
    # Kelpus -> Health Connect export metadata; use the health_connect_* fields below.
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    health_connect_client_record_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    health_connect_record_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    health_connect_record_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    health_connect_export_status: Mapped[HealthConnectExportStatusEnum] = mapped_column(
        Enum(HealthConnectExportStatusEnum, name="health_connect_export_status_enum"),
        default=HealthConnectExportStatusEnum.not_exported,
        nullable=False,
    )
    health_connect_exported_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    health_connect_last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 관계
    analysis_result: Mapped["DietAnalysisResult | None"] = relationship(
        "DietAnalysisResult",
        back_populates="diet_record",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def map_os_health_data(self, raw_data: dict) -> "DietRecord":
        """
        OS 헬스 원시 데이터를 nutrition_data 형식으로 매핑한다 (OS헬스_데이터_매핑).

        Args:
            raw_data: OS 헬스 앱에서 수신한 원시 데이터.

        Returns:
            nutrition_data가 채워진 DietRecord 인스턴스.
        """
        self.nutrition_data = {
            "calories": raw_data.get("energyConsumed", 0),
            "carbohydrates": raw_data.get("carbohydrates", 0),
            "protein": raw_data.get("protein", 0),
            "fat": raw_data.get("totalFat", 0),
            "fiber": raw_data.get("dietaryFiber", 0),
            "source": "os_health",
        }
        self.data_source = DataSourceEnum.os_health
        return self

    def map_health_connect_nutrition(self, raw_data: dict, external_id: str) -> "DietRecord":
        """Map Health Connect nutrition data with an explicit idempotency key.

        Args:
            raw_data: Normalized Health Connect nutrition payload.
            external_id: inbound Health Connect metadata/client ID or deterministic fallback key.

        Returns:
            DietRecord configured as a Health Connect nutrition import.
        """
        self.nutrition_data = {
            "calories": raw_data.get("calories", 0),
            "carbohydrates": raw_data.get("carbs", raw_data.get("carbohydrates", 0)),
            "protein": raw_data.get("protein", 0),
            "fat": raw_data.get("fat", raw_data.get("totalFat", 0)),
            "source": "health_connect",
        }
        self.external_id = external_id
        self.data_source = DataSourceEnum.health_connect
        return self


class DietAnalysisResult(Base):
    """
    식단 분석 결과 엔티티.

    Attributes:
        id: UUID 기본키 (분석_ID).
        diet_record_id: 식단 기록 외래키.
        user_id: 사용자 외래키.
        total_calories: 총 칼로리.
        carb_ratio: 탄수화물 비율.
        protein_ratio: 단백질 비율.
        fat_ratio: 지방 비율.
        ai_comment: AI 생성 코멘트.
        analyzed_at: 분석 일시.
    """

    __tablename__ = "diet_analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    diet_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diet_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    total_calories: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    carb_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    protein_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fat_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ai_comment: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # 관계
    diet_record: Mapped["DietRecord"] = relationship(
        "DietRecord", back_populates="analysis_result"
    )

    def get_visualization_data(self) -> dict:
        """
        분석 데이터 시각화용 딕셔너리를 반환한다 (분석_데이터_시각화).

        Returns:
            차트 렌더링에 사용할 수 있는 시각화 데이터.
        """
        return {
            "analysis_id": str(self.id),
            "total_calories": self.total_calories,
            "macros": {
                "carbohydrates": {"ratio": self.carb_ratio, "label": "탄수화물"},
                "protein": {"ratio": self.protein_ratio, "label": "단백질"},
                "fat": {"ratio": self.fat_ratio, "label": "지방"},
            },
            "ai_comment": self.ai_comment,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
        }
