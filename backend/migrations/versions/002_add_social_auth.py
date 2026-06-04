"""소셜 로그인 지원 컬럼 추가.

users 테이블에 social_provider, social_id 컬럼을 추가하고
password_hash를 nullable로 변경한다 (소셜 전용 계정 지원).

Revision ID: 002
Revises: 001
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("social_provider", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("social_id", sa.String(255), nullable=True))
    op.create_index("ix_users_social", "users", ["social_provider", "social_id"])
    op.alter_column("users", "password_hash", nullable=True)


def downgrade() -> None:
    op.alter_column("users", "password_hash", nullable=False)
    op.drop_index("ix_users_social", table_name="users")
    op.drop_column("users", "social_id")
    op.drop_column("users", "social_provider")
