"""
Alembic 환경 설정.
모든 도메인 모델을 임포트하여 자동 마이그레이션 생성에 사용한다.
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ---------------------------------------------------------------------------
# 모든 ORM 모델 임포트 (autogenerate가 테이블을 인식하기 위해 필요)
# ---------------------------------------------------------------------------
from app.database import Base  # noqa: F401

# 각 도메인 모델 임포트
from app.domains.user.models import User, SubscriptionPlan  # noqa: F401
from app.domains.diet.models import DietRecord, DietAnalysisResult  # noqa: F401
from app.domains.running.models import RunningRecord, Leaderboard  # noqa: F401
from app.domains.sns.models import VlogFeed  # noqa: F401

# ---------------------------------------------------------------------------
# Alembic 설정
# ---------------------------------------------------------------------------
config = context.config

# alembic.ini의 로깅 설정 적용
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 자동 마이그레이션 대상 메타데이터
target_metadata = Base.metadata


def get_url() -> str:
    """환경변수에서 DB URL을 읽는다."""
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise ValueError("DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")
    return url


def run_migrations_offline() -> None:
    """오프라인 모드 마이그레이션 (DB 연결 없이 SQL 스크립트 생성)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """비동기 엔진으로 온라인 모드 마이그레이션."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """온라인 모드 마이그레이션."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
