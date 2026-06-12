"""add health connect persistence foundation

Revision ID: 005
Revises: 004
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE data_source_enum ADD VALUE IF NOT EXISTS 'health_connect'")

    op.add_column("diet_records", sa.Column("external_id", sa.String(255), nullable=True))
    op.create_index("ix_diet_records_external_id", "diet_records", ["external_id"], unique=False)
    op.create_unique_constraint(
        "uq_diet_records_user_source_external_id",
        "diet_records",
        ["user_id", "data_source", "external_id"],
    )

    op.create_table(
        "health_daily_activity_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("steps", sa.Integer(), nullable=False),
        sa.Column("active_calories", sa.Float(), nullable=False),
        sa.Column("total_calories", sa.Float(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_data", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "external_id", name="uq_health_daily_activity_user_external_id"),
    )
    op.create_index("ix_health_daily_activity_records_user_id", "health_daily_activity_records", ["user_id"], unique=False)
    op.create_index("ix_health_daily_activity_records_external_id", "health_daily_activity_records", ["external_id"], unique=False)
    op.create_index("ix_health_daily_activity_records_activity_date", "health_daily_activity_records", ["activity_date"], unique=False)

    op.create_table(
        "health_heart_rate_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("samples", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_data", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "external_id", name="uq_health_heart_rate_user_external_id"),
    )
    op.create_index("ix_health_heart_rate_records_user_id", "health_heart_rate_records", ["user_id"], unique=False)
    op.create_index("ix_health_heart_rate_records_external_id", "health_heart_rate_records", ["external_id"], unique=False)
    op.create_index("ix_health_heart_rate_records_start_time", "health_heart_rate_records", ["start_time"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_health_heart_rate_records_start_time", table_name="health_heart_rate_records")
    op.drop_index("ix_health_heart_rate_records_external_id", table_name="health_heart_rate_records")
    op.drop_index("ix_health_heart_rate_records_user_id", table_name="health_heart_rate_records")
    op.drop_table("health_heart_rate_records")

    op.drop_index("ix_health_daily_activity_records_activity_date", table_name="health_daily_activity_records")
    op.drop_index("ix_health_daily_activity_records_external_id", table_name="health_daily_activity_records")
    op.drop_index("ix_health_daily_activity_records_user_id", table_name="health_daily_activity_records")
    op.drop_table("health_daily_activity_records")

    op.drop_constraint("uq_diet_records_user_source_external_id", "diet_records", type_="unique")
    op.drop_index("ix_diet_records_external_id", table_name="diet_records")
    op.drop_column("diet_records", "external_id")
