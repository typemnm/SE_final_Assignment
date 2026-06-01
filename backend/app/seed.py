"""
초기 계정 시드 스크립트.
어드민(프리미엄)과 게스트(무료) 계정을 생성한다.

실행 방법:
    cd backend
    python -m app.seed
"""

import asyncio
import logging
from datetime import date

from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, create_tables
from app.domains.user.models import SubscriptionPlan, SubscriptionTypeEnum, User
from app.domains.user.repository import UserRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_user_repo = UserRepository()

SEED_ACCOUNTS = [
    {
        "email": "admin@kelpus.com",
        "password": "Admin1234!",
        "health_goal": "관리자 계정",
        "subscription_type": SubscriptionTypeEnum.premium,
        "daily_ai_limit": settings.PREMIUM_PLAN_DAILY_LIMIT,
        "label": "어드민",
    },
    {
        "email": "guest@kelpus.com",
        "password": "Guest1234!",
        "health_goal": "게스트 계정",
        "subscription_type": SubscriptionTypeEnum.free,
        "daily_ai_limit": settings.FREE_PLAN_DAILY_LIMIT,
        "label": "게스트",
    },
]


async def _seed(db: AsyncSession) -> None:
    for account in SEED_ACCOUNTS:
        existing = await _user_repo.get_by_email(account["email"], db)
        if existing:
            logger.info("이미 존재: %s (%s)", account["email"], account["label"])
            continue

        user = User(
            email=account["email"],
            password_hash=_pwd_context.hash(account["password"]),
            health_goal=account["health_goal"],
        )
        db.add(user)
        await db.flush()

        plan = SubscriptionPlan(
            user_id=user.id,
            type=account["subscription_type"],
            daily_ai_limit=account["daily_ai_limit"],
            renewal_date=date.today(),
        )
        db.add(plan)
        await db.flush()

        logger.info(
            "생성 완료: %s (%s, %s플랜, 일일한도 %d회)",
            account["email"],
            account["label"],
            account["subscription_type"].value,
            account["daily_ai_limit"],
        )


async def main() -> None:
    logger.info("테이블 생성 중...")
    await create_tables()

    async with AsyncSessionLocal() as session:
        try:
            await _seed(session)
            await session.commit()
            logger.info("시드 완료")
        except Exception as exc:
            await session.rollback()
            logger.error("시드 실패: %s", exc)
            raise


if __name__ == "__main__":
    asyncio.run(main())
