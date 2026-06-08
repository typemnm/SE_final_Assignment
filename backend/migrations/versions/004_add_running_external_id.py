"""add running external_id column

Revision ID: 004
Revises: 003
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "running_records",
        sa.Column("external_id", sa.String(255), nullable=True),
    )
    op.create_index(
        "ix_running_records_external_id",
        "running_records",
        ["external_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_running_records_external_id", table_name="running_records")
    op.drop_column("running_records", "external_id")
