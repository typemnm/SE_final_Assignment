"""
식단 도메인 DB 접근 레이어.
DietRecord, DietAnalysisResult ORM 객체의 CRUD 작업을 담당한다.
"""

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.diet.models import DataSourceEnum, DietAnalysisResult, DietRecord


class DietRecordRepository:
    """식단 기록 엔티티 저장소."""

    async def create_from_os_health(
        self,
        user_id: str | uuid.UUID,
        raw_data: dict,
        recorded_at: datetime | None,
        db: AsyncSession,
    ) -> DietRecord:
        """
        OS 헬스 데이터로 식단 기록을 생성한다.

        Args:
            user_id: 사용자 UUID.
            raw_data: OS 헬스 원시 데이터.
            recorded_at: 기록 일시.
            db: 비동기 DB 세션.

        Returns:
            생성된 DietRecord 인스턴스.
        """
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
        """
        이미지 URL로 식단 기록을 생성한다.

        Args:
            user_id: 사용자 UUID.
            image_url: 식단 이미지 URL.
            db: 비동기 DB 세션.

        Returns:
            생성된 DietRecord 인스턴스.
        """
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
        """
        ID로 식단 기록을 조회한다.

        Args:
            record_id: 기록 UUID.
            db: 비동기 DB 세션.

        Returns:
            DietRecord 인스턴스 또는 None.
        """
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
        """
        사용자 소유권까지 확인해 식단 기록을 조회한다.

        Args:
            record_id: 기록 UUID.
            user_id: 사용자 UUID.
            db: 비동기 DB 세션.

        Returns:
            해당 사용자 소유의 DietRecord 인스턴스 또는 None.
        """
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
        """
        사용자의 식단 기록 목록을 조회한다.

        Args:
            user_id: 사용자 UUID.
            db: 비동기 DB 세션.
            limit: 최대 조회 수.

        Returns:
            DietRecord 인스턴스 목록.
        """
        result = await db.execute(
            select(DietRecord)
            .where(DietRecord.user_id == uuid.UUID(str(user_id)))
            .order_by(DietRecord.recorded_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())


class DietAnalysisResultRepository:
    """식단 분석 결과 엔티티 저장소."""

    async def save_analysis(
        self,
        user_id: str | uuid.UUID,
        diet_record_id: str | uuid.UUID,
        analysis_data: dict,
        db: AsyncSession,
    ) -> DietAnalysisResult:
        """
        AI 분석 결과를 저장한다.

        Args:
            user_id: 사용자 UUID.
            diet_record_id: 연결된 식단 기록 UUID.
            analysis_data: AI 분석 결과 딕셔너리.
            db: 비동기 DB 세션.

        Returns:
            저장된 DietAnalysisResult 인스턴스.
        """
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
