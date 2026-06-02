"""
사용자 도메인 DB 접근 레이어.
User, SubscriptionPlan ORM 객체의 CRUD 작업을 담당한다.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.user.models import SubscriptionPlan, SubscriptionTypeEnum, User
from app.config import settings


class UserRepository:
    """사용자 엔티티 저장소."""

    async def get_by_id(self, user_id: str | uuid.UUID, db: AsyncSession) -> User | None:
        """
        ID로 사용자를 조회한다.

        Args:
            user_id: 사용자 UUID.
            db: 비동기 DB 세션.

        Returns:
            User 인스턴스 또는 None.
        """
        result = await db.execute(
            select(User)
            .where(User.id == uuid.UUID(str(user_id)))
            .options(selectinload(User.subscription_plan))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str, db: AsyncSession) -> User | None:
        """
        이메일로 사용자를 조회한다.

        Args:
            email: 이메일 주소.
            db: 비동기 DB 세션.

        Returns:
            User 인스턴스 또는 None.
        """
        result = await db.execute(
            select(User)
            .where(User.email == email)
            .options(selectinload(User.subscription_plan))
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        email: str,
        password_hash: str,
        age: int | None,
        gender: str | None,
        health_goal: str | None,
        db: AsyncSession,
    ) -> User:
        """
        새 사용자를 생성하고 기본 구독 플랜을 함께 생성한다.

        Args:
            email: 이메일 주소.
            password_hash: bcrypt 해시된 비밀번호.
            age: 나이.
            gender: 성별.
            health_goal: 건강 목표.
            db: 비동기 DB 세션.

        Returns:
            생성된 User 인스턴스.
        """
        user = User(
            email=email,
            password_hash=password_hash,
            age=age,
            gender=gender,
            health_goal=health_goal,
        )
        db.add(user)
        await db.flush()  # user.id 생성

        # 기본 무료 구독 플랜 생성
        plan = SubscriptionPlan(
            user_id=user.id,
            type=SubscriptionTypeEnum.free,
            daily_ai_limit=settings.FREE_PLAN_DAILY_LIMIT,
            renewal_date=date.today(),
        )
        db.add(plan)
        await db.flush()
        await db.refresh(user)
        return user

    async def get_by_social(
        self, provider: str, social_id: str, db: AsyncSession
    ) -> User | None:
        """소셜 제공자 ID로 사용자를 조회한다."""
        result = await db.execute(
            select(User)
            .where(User.social_provider == provider, User.social_id == social_id)
            .options(selectinload(User.subscription_plan))
        )
        return result.scalar_one_or_none()

    async def create_social(
        self,
        email: str,
        provider: str,
        social_id: str,
        db: AsyncSession,
    ) -> User:
        """소셜 사용자를 생성하고 기본 구독 플랜을 함께 생성한다."""
        user = User(
            email=email,
            password_hash=None,
            social_provider=provider,
            social_id=social_id,
        )
        db.add(user)
        await db.flush()

        plan = SubscriptionPlan(
            user_id=user.id,
            type=SubscriptionTypeEnum.free,
            daily_ai_limit=settings.FREE_PLAN_DAILY_LIMIT,
            renewal_date=date.today(),
        )
        db.add(plan)
        await db.flush()
        await db.refresh(user)
        return user

    async def delete(self, user: User, db: AsyncSession) -> None:
        """사용자를 영구 삭제한다."""
        await db.delete(user)
        await db.flush()

    async def save(self, user: User, db: AsyncSession) -> User:
        """
        수정된 사용자 정보를 저장한다.

        Args:
            user: 수정된 User 인스턴스.
            db: 비동기 DB 세션.

        Returns:
            저장된 User 인스턴스.
        """
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user


class SubscriptionPlanRepository:
    """구독 플랜 엔티티 저장소."""

    async def get_by_user_id(
        self, user_id: str | uuid.UUID, db: AsyncSession
    ) -> SubscriptionPlan | None:
        """
        사용자 ID로 구독 플랜을 조회한다.

        Args:
            user_id: 사용자 UUID.
            db: 비동기 DB 세션.

        Returns:
            SubscriptionPlan 인스턴스 또는 None.
        """
        result = await db.execute(
            select(SubscriptionPlan).where(
                SubscriptionPlan.user_id == uuid.UUID(str(user_id))
            )
        )
        return result.scalar_one_or_none()

    async def save(self, plan: SubscriptionPlan, db: AsyncSession) -> SubscriptionPlan:
        """
        구독 플랜을 저장한다.

        Args:
            plan: 수정된 SubscriptionPlan 인스턴스.
            db: 비동기 DB 세션.

        Returns:
            저장된 SubscriptionPlan 인스턴스.
        """
        db.add(plan)
        await db.flush()
        await db.refresh(plan)
        return plan
