"""
식단 도메인 라우터.
/api/v1/diet 엔드포인트를 제공한다.
"""

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.domains.diet import schemas, service

diet_router = APIRouter(prefix="/api/v1/diet", tags=["식단"])

_UPLOAD_DIR = Path(__file__).resolve().parents[3] / "static" / "diet_uploads"
_ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_UPLOAD_CHUNK_BYTES = 1024 * 1024


async def _read_limited_upload(file: UploadFile) -> bytes:
    """업로드 파일을 제한 크기까지만 읽고 초과 시 즉시 거부한다."""
    chunks: list[bytes] = []
    total_size = 0

    while True:
        chunk = await file.read(_UPLOAD_CHUNK_BYTES)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > _MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="이미지 파일은 5MB 이하만 업로드할 수 있습니다.",
            )
        chunks.append(chunk)

    if total_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="빈 이미지 파일은 업로드할 수 없습니다.",
        )

    return b"".join(chunks)


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
    "/upload",
    response_model=schemas.DietImageUploadResponse,
    status_code=200,
    summary="식단 이미지 업로드",
    description=(
        "AI 식단 분석에 사용할 이미지를 multipart로 업로드하고 "
        "diet_image_url로 사용할 수 있는 정적 경로를 반환한다."
    ),
)
async def upload_diet_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> schemas.DietImageUploadResponse:
    """식단 이미지 업로드 엔드포인트.

    새 의존성 없이 FastAPI UploadFile을 사용한다. 클라이언트 파일명은 신뢰하지 않고,
    검증된 MIME 타입에서 확장자를 정한 뒤 UUID 파일명으로 저장한다.
    """
    del current_user  # 인증 요구를 명시하되 사용자별 파일 분리는 이번 범위 밖이다.

    extension = _ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 업로드할 수 있습니다.",
        )

    contents = await _read_limited_upload(file)
    await file.close()

    import asyncio

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    destination = _UPLOAD_DIR / filename
    await asyncio.to_thread(destination.write_bytes, contents)

    return schemas.DietImageUploadResponse(
        diet_image_url=f"/static/diet_uploads/{filename}",
        message="식단 이미지 업로드 완료",
    )

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


@diet_router.get(
    "/exportable",
    response_model=list[schemas.DietHealthConnectExportableRecord],
    status_code=200,
    summary="Health Connect Nutrition 내보내기 대상 식단 목록",
    description="현재 사용자의 최신 AI 분석 식단 기록을 Health Connect Nutrition export 대상으로 반환한다.",
)
async def list_health_connect_exportable_diets(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[schemas.DietHealthConnectExportableRecord]:
    """Health Connect Nutrition backfill/export 대상 조회 엔드포인트."""
    return await service.list_health_connect_exportable_diets(current_user["user_id"], db)


@diet_router.patch(
    "/{record_id}/health-connect-export",
    response_model=schemas.DietHealthConnectExportStatusResponse,
    status_code=200,
    summary="Health Connect Nutrition 내보내기 상태 갱신",
    description="Android 클라이언트가 Health Connect Nutrition write 결과와 idempotency metadata를 저장한다.",
)
async def update_health_connect_export_status(
    record_id: str,
    req: schemas.DietHealthConnectExportStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.DietHealthConnectExportStatusResponse:
    """Health Connect Nutrition export status update endpoint."""
    return await service.update_health_connect_export_status(
        current_user["user_id"], record_id, req, db
    )


@diet_router.delete(
    "/{record_id}",
    response_model=schemas.DietDeleteResponse,
    status_code=200,
    summary="식단 기록 삭제",
    description="소유권을 확인한 뒤 식단 기록을 삭제하고 Health Connect export metadata snapshot을 반환한다.",
)
async def delete_diet_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.DietDeleteResponse:
    """식단 기록 삭제 엔드포인트."""
    return await service.delete_diet_record(current_user["user_id"], record_id, db)
