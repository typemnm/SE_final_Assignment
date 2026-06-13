"""
식단 도메인 DB 접근 레이어.
DietRecord, DietAnalysisResult ORM 객체의 CRUD 작업을 담당한다.
"""

import uuid
from datetime import datetime
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.diet.models import (
    DataSourceEnum,
    DietAnalysisResult,
    DietRecord,
    HealthConnectExportStatusEnum,
)


ExportableRow = tuple[DietRecord, DietAnalysisResult]


def latest_analysis_rows(rows: Iterable[ExportableRow]) -> list[ExportableRow]:
    """Return one latest analysis row per DietRecord.

    The database may contain multiple analysis rows for a DietRecord after re-analysis.
    Health Connect backfill/export should use only the newest analysis by analyzed_at,
    with analysis UUID as deterministic tie-breaker for stable tests.
    """
    latest_by_record: dict[uuid.UUID, ExportableRow] = {}
    for record, analysis in rows:
        current = latest_by_record.get(record.id)
        if current is None:
            latest_by_record[record.id] = (record, analysis)
            continue

        current_analysis = current[1]
        current_key = (current_analysis.analyzed_at, str(current_analysis.id))
        candidate_key = (analysis.analyzed_at, str(analysis.id))
        if candidate_key > current_key:
            latest_by_record[record.id] = (record, analysis)

    return sorted(
        latest_by_record.values(),
        key=lambda row: (row[0].recorded_at, row[1].analyzed_at, str(row[0].id)),
        reverse=True,
    )


class DietRecordRepository:
    """식단 기록 엔티티 저장소."""

    async def create_from_os_health(
        self,
        user_id: str | uuid.UUID,
        raw_data: dict,
        recorded_at: datetime | None,
        db: AsyncSession,
    ) -> DietRecord:
        """OS 헬스 데이터로 식단 기록을 생성한다."""
        record = DietRecord(
            user_id=uuid.UUID(str(user_id)),
            data_source=DataSourceEnum.os_health,
            recorded_at=recorded_at,
        )
        record.map_os_health_data(raw_data)
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def create_with_image(
        self,
        user_id: str | uuid.UUID,
        image_url: str,
        db: AsyncSession,
    ) -> DietRecord:
        """이미지 URL로 식단 기록을 생성한다."""
        record = DietRecord(
            user_id=uuid.UUID(str(user_id)),
            data_source=DataSourceEnum.manual,
            diet_image_url=image_url,
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def get_by_id(
        self, record_id: str | uuid.UUID, db: AsyncSession
    ) -> DietRecord | None:
        """ID로 식단 기록을 조회한다."""
        result = await db.execute(
            select(DietRecord)
            .where(DietRecord.id == uuid.UUID(str(record_id)))
            .options(selectinload(DietRecord.analysis_result))
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(
        self,
        record_id: str | uuid.UUID,
        user_id: str | uuid.UUID,
        db: AsyncSession,
    ) -> DietRecord | None:
        """사용자 소유권까지 확인해 식단 기록을 조회한다."""
        result = await db.execute(
            select(DietRecord)
            .where(
                DietRecord.id == uuid.UUID(str(record_id)),
                DietRecord.user_id == uuid.UUID(str(user_id)),
            )
            .options(selectinload(DietRecord.analysis_result))
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: str | uuid.UUID, db: AsyncSession, limit: int = 20
    ) -> list[DietRecord]:
        """사용자의 식단 기록 목록을 조회한다."""
        result = await db.execute(
            select(DietRecord)
            .where(DietRecord.user_id == uuid.UUID(str(user_id)))
            .order_by(DietRecord.recorded_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_exportable_health_connect_nutrition(
        self,
        user_id: str | uuid.UUID,
        db: AsyncSession,
        limit: int = 100,
    ) -> list[ExportableRow]:
        """List latest analyzed diet records exportable as Health Connect Nutrition."""
        result = await db.execute(
            select(DietRecord, DietAnalysisResult)
            .join(DietAnalysisResult, DietAnalysisResult.diet_record_id == DietRecord.id)
            .where(
                DietRecord.user_id == uuid.UUID(str(user_id)),
                DietRecord.data_source != DataSourceEnum.health_connect,
            )
            .order_by(
                DietRecord.recorded_at.desc(),
                DietAnalysisResult.analyzed_at.desc(),
                DietAnalysisResult.id.desc(),
            )
        )
        return latest_analysis_rows(result.all())[:limit]

    async def update_health_connect_export_status(
        self,
        record_id: str | uuid.UUID,
        user_id: str | uuid.UUID,
        *,
        client_record_id: str,
        health_connect_record_id: str | None,
        record_version: int | None,
        export_status: HealthConnectExportStatusEnum,
        exported_at: datetime | None,
        last_error: str | None,
        db: AsyncSession,
    ) -> DietRecord | None:
        """Persist outbound Health Connect Nutrition export metadata for an owned record."""
        record = await self.get_by_id_for_user(record_id, user_id, db)
        if record is None:
            return None

        # external_id is inbound import identity; never overwrite it for outbound export.
        record.health_connect_client_record_id = client_record_id
        should_replace_export_identity = export_status in {
            HealthConnectExportStatusEnum.exported,
            HealthConnectExportStatusEnum.deleted,
        }
        if should_replace_export_identity or health_connect_record_id is not None:
            record.health_connect_record_id = health_connect_record_id
        if should_replace_export_identity or record_version is not None:
            record.health_connect_record_version = record_version
        record.health_connect_export_status = export_status
        record.health_connect_exported_at = exported_at
        record.health_connect_last_error = last_error
        await db.flush()
        await db.refresh(record)
        return record

    async def delete_for_user(
        self,
        record_id: str | uuid.UUID,
        user_id: str | uuid.UUID,
        db: AsyncSession,
    ) -> DietRecord | None:
        """Delete an owned DietRecord and return its pre-delete metadata snapshot."""
        record = await self.get_by_id_for_user(record_id, user_id, db)
        if record is None:
            return None

        snapshot = DietRecord(
            id=record.id,
            user_id=record.user_id,
            data_source=record.data_source,
            diet_image_url=record.diet_image_url,
            nutrition_data=record.nutrition_data,
            external_id=record.external_id,
            health_connect_client_record_id=record.health_connect_client_record_id,
            health_connect_record_id=record.health_connect_record_id,
            health_connect_record_version=record.health_connect_record_version,
            health_connect_export_status=record.health_connect_export_status,
            health_connect_exported_at=record.health_connect_exported_at,
            health_connect_last_error=record.health_connect_last_error,
        )
        await db.delete(record)
        await db.flush()
        return snapshot


class DietAnalysisResultRepository:
    """식단 분석 결과 엔티티 저장소."""

    async def save_analysis(
        self,
        user_id: str | uuid.UUID,
        diet_record_id: str | uuid.UUID,
        analysis_data: dict,
        db: AsyncSession,
    ) -> DietAnalysisResult:
        """AI 분석 결과를 저장한다."""
        result_obj = DietAnalysisResult(
            user_id=uuid.UUID(str(user_id)),
            diet_record_id=uuid.UUID(str(diet_record_id)),
            total_calories=analysis_data.get("total_calories", 0.0),
            carb_ratio=analysis_data.get("carb_ratio", 0.0),
            protein_ratio=analysis_data.get("protein_ratio", 0.0),
            fat_ratio=analysis_data.get("fat_ratio", 0.0),
            ai_comment=analysis_data.get("ai_comment"),
        )
        db.add(result_obj)
        await db.flush()
        await db.refresh(result_obj)
        return result_obj
