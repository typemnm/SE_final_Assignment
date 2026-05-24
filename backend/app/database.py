"""
데이터베이스 연결 모듈.
SQLAlchemy 2.0 비동기 엔진과 세션 팩토리를 제공한다.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 비동기 엔진 생성
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# 세션 팩토리
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """모든 ORM 모델의 기본 클래스."""
    pass


async def create_tables() -> None:
    """애플리케이션 시작 시 테이블을 생성한다 (개발 전용)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables() -> None:
    """테이블을 전부 삭제한다 (테스트 전용)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
