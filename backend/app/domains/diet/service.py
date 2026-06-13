"""
식단 도메인 비즈니스 로직 서비스.
OS 헬스 동기화, AI 이미지 분석(구독 게이팅 포함), 분석 결과 저장을 담당한다.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.diet.repository import DietAnalysisResultRepository, DietRecordRepository
from app.domains.diet.schemas import (
    DietAnalyzeRequest,
    DietAnalysisResponse,
    DietDeleteResponse,
    DietHealthConnectExportableRecord,
    DietHealthConnectExportStatusResponse,
    DietHealthConnectExportStatusUpdateRequest,
    DietSyncRequest,
    DietSyncResponse,
)
from app.domains.user.repository import SubscriptionPlanRepository
from app.infrastructure.adapters.ai_analyzer import AIAnalysisError, AIAnalyzerService

_diet_record_repo = DietRecordRepository()
_analysis_repo = DietAnalysisResultRepository()
_plan_repo = SubscriptionPlanRepository()
_ai_analyzer = AIAnalyzerService()


async def sync_os_health_diet(
    user_id: str, req: DietSyncRequest, db: AsyncSession
) -> DietSyncResponse:
    """
    OS 헬스 앱의 식단 데이터를 동기화한다 (OS_헬스_식단_데이터_조회 → 동기화).

    Args:
        user_id: 사용자 UUID 문자열.
        req: 동기화 요청 데이터 (원시 OS 헬스 데이터 포함).
        db: 비동기 DB 세션.

    Returns:
        동기화 완료 응답.
    """
    record = await _diet_record_repo.create_from_os_health(
        user_id=user_id,
        raw_data=req.raw_data,
        recorded_at=req.recorded_at,
        db=db,
    )
    return DietSyncResponse(
        record_id=record.id,
        nutrition_data=record.nutrition_data or {},
        message="OS 헬스 식단 데이터 동기화 완료",
    )


async def analyze_diet(
    user_id: str, req: DietAnalyzeRequest, db: AsyncSession
) -> DietAnalysisResponse:
    """
    식단 이미지를 AI로 분석한다 (구독_플랜_제한_확인 → AI이미지분석 → 결과저장_및_사용량_증가).

    Args:
        user_id: 사용자 UUID 문자열.
        req: 분석 요청 데이터 (이미지 URL 포함).
        db: 비동기 DB 세션.

    Returns:
        식단 분석 결과 응답.

    Raises:
        HTTPException(402): 일일 AI 분석 한도 초과 시.
        HTTPException(404): 구독 플랜을 찾을 수 없을 경우.
    """
    # 1. 구독 플랜 제한 확인 (잔여_횟수_확인)
    plan = await _plan_repo.get_by_user_id(user_id, db)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 플랜 정보를 찾을 수 없습니다.",
        )
    if not plan.check_remaining_count():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.",
        )

    # 2. 기존 record_id가 주어진 경우 현재 사용자 소유 기록인지 먼저 확인한다.
    if req.record_id:
        existing = await _diet_record_repo.get_by_id_for_user(
            req.record_id,
            user_id,
            db,
        )
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="식단 기록을 찾을 수 없습니다.",
            )
        diet_record_id = existing.id
        should_create_record = False
    else:
        diet_record_id = None
        should_create_record = True

    # check_remaining_count()는 날짜 변경 시 plan 객체를 갱신할 수 있으므로
    # 외부 이미지/Gemini 호출 동안 요청 DB 세션 트랜잭션을 점유하지 않도록
    # 사전 검증 트랜잭션을 명시적으로 종료한다. 사용량은 저장 직전 재검증한다.
    await db.rollback()

    # 3. AI 분석 엔진 호출 (식단_이미지_분석)
    try:
        analysis_data = await _ai_analyzer.analyze_image(req.diet_image_url)
    except AIAnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    # 4. 저장 직전 구독/기록 상태를 짧은 DB 트랜잭션에서 재확인한다.
    plan = await _plan_repo.get_by_user_id(user_id, db)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 플랜 정보를 찾을 수 없습니다.",
        )
    if not plan.check_remaining_count():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.",
        )

    if should_create_record:
        record = await _diet_record_repo.create_with_image(
            user_id=user_id,
            image_url=req.diet_image_url,
            db=db,
        )
        diet_record_id = record.id
    else:
        existing = await _diet_record_repo.get_by_id_for_user(
            req.record_id,
            user_id,
            db,
        )
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="식단 기록을 찾을 수 없습니다.",
            )

    # 5. 결과 저장
    analysis_result = await _analysis_repo.save_analysis(
        user_id=user_id,
        diet_record_id=diet_record_id,
        analysis_data=analysis_data,
        db=db,
    )

    # 6. 사용량 증가 (사용량_갱신)
    plan.update_usage()
    await db.flush()

    return DietAnalysisResponse(
        analysis_id=analysis_result.id,
        record_id=analysis_result.diet_record_id,
        total_calories=analysis_result.total_calories,
        carb_ratio=analysis_result.carb_ratio,
        protein_ratio=analysis_result.protein_ratio,
        fat_ratio=analysis_result.fat_ratio,
        ai_comment=analysis_result.ai_comment,
        analyzed_at=analysis_result.analyzed_at,
        visualization=analysis_result.get_visualization_data(),
    )



def _sanitize_export_error(message: str | None) -> str | None:
    """Return a compact export error safe for persistence/API responses."""
    if not message:
        return None
    compact = " ".join(str(message).split())
    return compact[:500]


def _export_status_response(record) -> DietHealthConnectExportStatusResponse:
    return DietHealthConnectExportStatusResponse(
        record_id=record.id,
        health_connect_client_record_id=record.health_connect_client_record_id,
        health_connect_record_id=record.health_connect_record_id,
        health_connect_record_version=record.health_connect_record_version,
        health_connect_export_status=record.health_connect_export_status,
        health_connect_exported_at=record.health_connect_exported_at,
        health_connect_last_error=record.health_connect_last_error,
    )


def _exportable_response(record, analysis) -> DietHealthConnectExportableRecord:
    return DietHealthConnectExportableRecord(
        record_id=record.id,
        analysis_id=analysis.id,
        recorded_at=record.recorded_at,
        analyzed_at=analysis.analyzed_at,
        diet_image_url=record.diet_image_url,
        total_calories=analysis.total_calories,
        carb_ratio=analysis.carb_ratio,
        protein_ratio=analysis.protein_ratio,
        fat_ratio=analysis.fat_ratio,
        nutrition_data=record.nutrition_data,
        health_connect_client_record_id=record.health_connect_client_record_id,
        health_connect_record_id=record.health_connect_record_id,
        health_connect_record_version=record.health_connect_record_version,
        health_connect_export_status=record.health_connect_export_status,
        health_connect_exported_at=record.health_connect_exported_at,
        health_connect_last_error=record.health_connect_last_error,
    )


async def list_health_connect_exportable_diets(
    user_id: str,
    db: AsyncSession,
) -> list[DietHealthConnectExportableRecord]:
    """Return the current user's latest analyzed DietRecords for HC Nutrition export."""
    rows = await _diet_record_repo.list_exportable_health_connect_nutrition(user_id, db)
    return [_exportable_response(record, analysis) for record, analysis in rows]


async def update_health_connect_export_status(
    user_id: str,
    record_id: str,
    req: DietHealthConnectExportStatusUpdateRequest,
    db: AsyncSession,
) -> DietHealthConnectExportStatusResponse:
    """Persist outbound Health Connect Nutrition export status for an owned DietRecord."""
    record = await _diet_record_repo.update_health_connect_export_status(
        record_id=record_id,
        user_id=user_id,
        client_record_id=req.client_record_id,
        health_connect_record_id=req.record_id,
        record_version=req.record_version,
        export_status=req.status,
        exported_at=req.exported_at,
        last_error=_sanitize_export_error(req.last_error),
        db=db,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="식단 기록을 찾을 수 없습니다.",
        )
    return _export_status_response(record)


async def delete_diet_record(
    user_id: str,
    record_id: str,
    db: AsyncSession,
) -> DietDeleteResponse:
    """Delete an owned DietRecord and return export metadata needed by the client."""
    record = await _diet_record_repo.delete_for_user(record_id, user_id, db)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="식단 기록을 찾을 수 없습니다.",
        )
    return DietDeleteResponse(
        record_id=record.id,
        deleted=True,
        health_connect_client_record_id=record.health_connect_client_record_id,
        health_connect_record_id=record.health_connect_record_id,
        health_connect_export_status=record.health_connect_export_status,
    )
