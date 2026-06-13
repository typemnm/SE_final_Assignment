"""Health Connect sync router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.health import schemas, service

health_router = APIRouter(prefix="/api/v1/health", tags=["헬스"])


@health_router.post(
    "/sync",
    response_model=schemas.HealthConnectSyncResponse,
    status_code=200,
    summary="Health Connect grouped sync",
    description="Android Health Connect grouped records are synchronized idempotently.",
)
async def sync_health(
    req: schemas.HealthConnectSyncEnvelope,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.HealthConnectSyncResponse:
    return await service.sync_health_data(current_user["user_id"], req, db)
