"""초기 데이터베이스 스키마 생성.

모든 도메인 테이블을 생성한다:
- users, subscription_plans (사용자 도메인)
- diet_records, diet_analysis_results (식단 도메인)
- running_records, leaderboard (러닝 도메인)
- vlog_feeds (SNS 도메인)

Revision ID: 001
Revises:
Create Date: 2026-05-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------------------------
    # Enum 타입 생성
    # ---------------------------------------------------------------------------
    gender_enum = postgresql.ENUM("male", "female", name="gender_enum", create_type=False)
    gender_enum.create(op.get_bind(), checkfirst=True)

    subscription_type_enum = postgresql.ENUM(
        "free", "premium", name="subscription_type_enum", create_type=False
    )
    subscription_type_enum.create(op.get_bind(), checkfirst=True)

    data_source_enum = postgresql.ENUM(
        "os_health", "manual", name="data_source_enum", create_type=False
    )
    data_source_enum.create(op.get_bind(), checkfirst=True)

    # ---------------------------------------------------------------------------
    # users 테이블 (사용자 도메인)
    # ---------------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("gender", sa.Enum("male", "female", name="gender_enum"), nullable=True),
        sa.Column("health_goal", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ---------------------------------------------------------------------------
    # subscription_plans 테이블 (구독 플랜 — 사용자 도메인)
    # ---------------------------------------------------------------------------
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "type",
            sa.Enum("free", "premium", name="subscription_type_enum"),
            nullable=False,
            server_default="free",
        ),
        sa.Column("daily_ai_limit", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("total_usage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("renewal_date", sa.Date(), nullable=True),
        sa.Column("today_usage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_usage_date", sa.Date(), nullable=True),
    )

    # ---------------------------------------------------------------------------
    # diet_records 테이블 (식단 도메인)
    # ---------------------------------------------------------------------------
    op.create_table(
        "diet_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "data_source",
            sa.Enum("os_health", "manual", name="data_source_enum"),
            nullable=False,
            server_default="manual",
        ),
        sa.Column("diet_image_url", sa.String(1000), nullable=True),
        sa.Column("nutrition_data", postgresql.JSON(), nullable=True),
    )
    op.create_index("ix_diet_records_user_id", "diet_records", ["user_id"])

    # ---------------------------------------------------------------------------
    # diet_analysis_results 테이블 (식단 분석 결과)
    # ---------------------------------------------------------------------------
    op.create_table(
        "diet_analysis_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "diet_record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("diet_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("total_calories", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("carb_ratio", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("protein_ratio", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("fat_ratio", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("ai_comment", sa.String(2000), nullable=True),
        sa.Column(
            "analyzed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_diet_analysis_results_diet_record_id", "diet_analysis_results", ["diet_record_id"])
    op.create_index("ix_diet_analysis_results_user_id", "diet_analysis_results", ["user_id"])

    # ---------------------------------------------------------------------------
    # running_records 테이블 (러닝 도메인)
    # ---------------------------------------------------------------------------
    op.create_table(
        "running_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("distance", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("avg_pace", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("gps_coordinates", postgresql.JSON(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_running_records_user_id", "running_records", ["user_id"])

    # ---------------------------------------------------------------------------
    # leaderboard 테이블 (리더보드 — 러닝 도메인)
    # ---------------------------------------------------------------------------
    op.create_table(
        "leaderboard",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "running_record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("running_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("overall_rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("percentile", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("badge", sa.String(100), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_leaderboard_user_id", "leaderboard", ["user_id"])

    # ---------------------------------------------------------------------------
    # vlog_feeds 테이블 (SNS 도메인)
    # ---------------------------------------------------------------------------
    op.create_table(
        "vlog_feeds",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("original_url", sa.String(1000), nullable=False),
        sa.Column("author_account", sa.String(255), nullable=False),
        sa.Column("hashtags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("like_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "crawled_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("platform", sa.String(50), nullable=False, server_default="instagram"),
    )
    op.create_index("ix_vlog_feeds_author_account", "vlog_feeds", ["author_account"])


def downgrade() -> None:
    # 역순으로 테이블 삭제 (FK 의존성 고려)
    op.drop_table("vlog_feeds")
    op.drop_table("leaderboard")
    op.drop_table("running_records")
    op.drop_table("diet_analysis_results")
    op.drop_table("diet_records")
    op.drop_table("subscription_plans")
    op.drop_table("users")

    # Enum 타입 삭제
    op.execute("DROP TYPE IF EXISTS data_source_enum")
    op.execute("DROP TYPE IF EXISTS subscription_type_enum")
    op.execute("DROP TYPE IF EXISTS gender_enum")
