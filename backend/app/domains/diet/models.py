"""
식단 도메인 ORM 모델.
DietRecord, DietAnalysisResult 엔티티를 SQLAlchemy 2.0 비동기 스타일로 정의한다.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum, Float, ForeignKey, String
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DataSourceEnum(str, enum.Enum):
    """식단 데이터 출처 열거형."""

    os_health = "os_health"
    manual = "manual"


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
    """

    __tablename__ = "diet_records"

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
