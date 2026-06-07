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

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    destination = _UPLOAD_DIR / filename
    destination.write_bytes(contents)

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
