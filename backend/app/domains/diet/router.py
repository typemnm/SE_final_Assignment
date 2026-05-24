"""
식단 도메인 라우터.
/api/v1/diet 엔드포인트를 제공한다.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.diet import schemas, service

diet_router = APIRouter(prefix="/api/v1/diet", tags=["식단"])


@diet_router.post(
    "/sync",
    response_model=schemas.DietSyncResponse,
    status_code=200,
    summary="OS 헬스 식단 데이터 동기화",
    description="OS 헬스 앱의 식단 데이터를 수신하고 영양소를 매핑하여 저장한다.",
)
async def sync_diet(
    req: schemas.DietSyncRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.DietSyncResponse:
    """OS 헬스 식단 동기화 엔드포인트."""
    return await service.sync_os_health_diet(current_user["user_id"], req, db)


@diet_router.post(
    "/analyze",
    response_model=schemas.DietAnalysisResponse,
    status_code=200,
    summary="식단 이미지 AI 분석",
    description=(
        "구독 플랜 한도를 확인하고 식단 이미지를 AI로 분석한 후 결과를 저장한다. "
        "일일 한도 초과 시 402 에러를 반환한다."
    ),
)
async def analyze_diet(
    req: schemas.DietAnalyzeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.DietAnalysisResponse:
    """식단 AI 분석 엔드포인트."""
    return await service.analyze_diet(current_user["user_id"], req, db)
