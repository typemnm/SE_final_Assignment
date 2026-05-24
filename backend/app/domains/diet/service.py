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
    DietSyncRequest,
    DietSyncResponse,
)
from app.domains.user.repository import SubscriptionPlanRepository
from app.infrastructure.adapters.ai_analyzer import AIAnalyzerService

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
            detail="일일 AI 분석 한도를 초과했습니다. 구독 플랜을 업그레이드하세요.",
        )

    # 2. 식단 기록 생성 또는 기존 기록 사용
    if req.diet_record_id:
        existing = await _diet_record_repo.get_by_id(req.diet_record_id, db)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="식단 기록을 찾을 수 없습니다.",
            )
        record = existing
    else:
        record = await _diet_record_repo.create_with_image(
            user_id=user_id,
            image_url=req.image_url,
            db=db,
        )

    # 3. AI 분석 엔진 호출 (식단_이미지_분석)
    analysis_data = await _ai_analyzer.analyze_image(req.image_url)

    # 4. 결과 저장
    analysis_result = await _analysis_repo.save_analysis(
        user_id=user_id,
        diet_record_id=record.id,
        analysis_data=analysis_data,
        db=db,
    )

    # 5. 사용량 증가 (사용량_갱신)
    plan.update_usage()
    await db.flush()

    return DietAnalysisResponse(
        id=analysis_result.id,
        diet_record_id=analysis_result.diet_record_id,
        total_calories=analysis_result.total_calories,
        carb_ratio=analysis_result.carb_ratio,
        protein_ratio=analysis_result.protein_ratio,
        fat_ratio=analysis_result.fat_ratio,
        ai_comment=analysis_result.ai_comment,
        analyzed_at=analysis_result.analyzed_at,
        visualization=analysis_result.get_visualization_data(),
    )
