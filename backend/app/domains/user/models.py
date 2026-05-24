"""
사용자 도메인 ORM 모델.
User, SubscriptionPlan 엔티티를 SQLAlchemy 2.0 비동기 스타일로 정의한다.
"""

import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GenderEnum(str, enum.Enum):
    """성별 열거형."""

    male = "male"
    female = "female"


class SubscriptionTypeEnum(str, enum.Enum):
    """구독 플랜 유형 열거형."""

    free = "free"
    premium = "premium"


class User(Base):
    """
    사용자 엔티티.

    Attributes:
        id: UUID 기본키 (사용자_ID).
        email: 고유 이메일 주소.
        password_hash: bcrypt 해시된 비밀번호.
        age: 나이.
        gender: 성별 (male/female).
        health_goal: 건강 목표 텍스트.
        created_at: 계정 생성 일시.
        is_active: 계정 활성화 여부.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(
        Enum(GenderEnum, name="gender_enum"), nullable=True
    )
    health_goal: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # 관계
    subscription_plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def update_profile(
        self,
        age: int | None = None,
        gender: GenderEnum | None = None,
        health_goal: str | None = None,
    ) -> "User":
        """
        프로필을 수정한 새 User 인스턴스를 반환한다 (불변성 원칙).

        Args:
            age: 새 나이 (None이면 기존 값 유지).
            gender: 새 성별 (None이면 기존 값 유지).
            health_goal: 새 건강 목표 (None이면 기존 값 유지).

        Returns:
            수정된 속성을 가진 동일 User 객체 (SQLAlchemy 특성상 동일 인스턴스).
        """
        if age is not None:
            self.age = age
        if gender is not None:
            self.gender = gender
        if health_goal is not None:
            self.health_goal = health_goal
        return self

    def get_stats_summary(self) -> dict:
        """
        사용자 통계 요약 정보를 반환한다.

        Returns:
            사용자 통계 딕셔너리.
        """
        return {
            "user_id": str(self.id),
            "email": self.email,
            "age": self.age,
            "gender": self.gender.value if self.gender else None,
            "health_goal": self.health_goal,
        }


class SubscriptionPlan(Base):
    """
    구독 플랜 엔티티.

    Attributes:
        id: UUID 기본키 (플랜_ID).
        user_id: 사용자 외래키.
        type: 구독 유형 (free/premium).
        daily_ai_limit: 일일 AI 분석 허용 횟수.
        total_usage: 누적 사용량.
        renewal_date: 갱신 일자.
        today_usage: 오늘 사용량 (일일 한도 추적).
        last_usage_date: 마지막 사용 날짜 (일일 초기화 기준).
    """

    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    type: Mapped[SubscriptionTypeEnum] = mapped_column(
        Enum(SubscriptionTypeEnum, name="subscription_type_enum"),
        default=SubscriptionTypeEnum.free,
        nullable=False,
    )
    daily_ai_limit: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    total_usage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    renewal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    today_usage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_usage_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # 관계
    user: Mapped["User"] = relationship("User", back_populates="subscription_plan")

    def check_remaining_count(self) -> bool:
        """
        잔여 AI 분석 횟수가 있는지 확인한다 (잔여_횟수_확인).

        날짜가 바뀌면 today_usage를 0으로 리셋한다.

        Returns:
            잔여 횟수가 있으면 True, 없으면 False.
        """
        today = date.today()
        if self.last_usage_date != today:
            self.today_usage = 0
            self.last_usage_date = today
        return self.today_usage < self.daily_ai_limit

    def update_usage(self) -> "SubscriptionPlan":
        """
        사용량을 1 증가시킨다 (사용량_갱신).

        Returns:
            업데이트된 SubscriptionPlan 인스턴스.
        """
        today = date.today()
        if self.last_usage_date != today:
            self.today_usage = 0
            self.last_usage_date = today
        self.today_usage += 1
        self.total_usage += 1
        return self
