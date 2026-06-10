"""running_records 테이블에 duration_seconds, calories 컬럼 추가.

Revision ID: 003
Revises: 002
Create Date: 2026-06-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "running_records",
        sa.Column("duration_seconds", sa.Integer(), nullable=True, server_default="0"),
    )
    op.add_column(
        "running_records",
        sa.Column("calories", sa.Integer(), nullable=True, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("running_records", "calories")
    op.drop_column("running_records", "duration_seconds")
