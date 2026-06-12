"""add diet health connect export metadata

Revision ID: 006
Revises: 005
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


EXPORT_STATUS_ENUM = sa.Enum(
    "not_exported",
    "exported",
    "permission_required",
    "unavailable",
    "failed",
    "deleted",
    name="health_connect_export_status_enum",
)


def upgrade() -> None:
    bind = op.get_bind()
    EXPORT_STATUS_ENUM.create(bind, checkfirst=True)
    op.add_column(
        "diet_records",
        sa.Column("health_connect_client_record_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "diet_records",
        sa.Column("health_connect_record_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "diet_records",
        sa.Column("health_connect_record_version", sa.Integer(), nullable=True),
    )
    op.add_column(
        "diet_records",
        sa.Column(
            "health_connect_export_status",
            EXPORT_STATUS_ENUM,
            nullable=False,
            server_default="not_exported",
        ),
    )
    op.add_column(
        "diet_records",
        sa.Column("health_connect_exported_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "diet_records",
        sa.Column("health_connect_last_error", sa.String(length=500), nullable=True),
    )
    op.create_index(
        "ix_diet_records_health_connect_client_record_id",
        "diet_records",
        ["health_connect_client_record_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_diet_records_health_connect_client_record_id", table_name="diet_records")
    op.drop_column("diet_records", "health_connect_last_error")
    op.drop_column("diet_records", "health_connect_exported_at")
    op.drop_column("diet_records", "health_connect_export_status")
    op.drop_column("diet_records", "health_connect_record_version")
    op.drop_column("diet_records", "health_connect_record_id")
    op.drop_column("diet_records", "health_connect_client_record_id")
    bind = op.get_bind()
    EXPORT_STATUS_ENUM.drop(bind, checkfirst=True)
