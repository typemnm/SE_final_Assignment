"""
식단 도메인 Pydantic v2 스키마.
식단 동기화, AI 분석 요청/응답 데이터 검증 및 직렬화를 담당한다.
"""

import uuid
from datetime import datetime

from pydantic import AliasChoices, BaseModel, Field

from app.domains.diet.models import DataSourceEnum, HealthConnectExportStatusEnum


class DietSyncRequest(BaseModel):
    """OS 헬스 식단 동기화 요청 스키마."""

    raw_data: dict = Field(..., description="OS 헬스 앱에서 수신한 원시 식단 데이터")
    recorded_at: datetime | None = Field(None, description="기록 일시 (None이면 현재 시각)")


class DietSyncResponse(BaseModel):
    """식단 동기화 응답 스키마."""

    record_id: uuid.UUID = Field(..., description="생성된 식단 기록 ID")
    nutrition_data: dict = Field(..., description="매핑된 영양소 데이터")
    message: str = Field(default="동기화 완료", description="처리 결과 메시지")


class DietAnalyzeRequest(BaseModel):
    """식단 이미지 AI 분석 요청 스키마.

    docs/API_DESIGN.md의 공개 계약(`diet_image_url`, `record_id`)을 기준으로 하되,
    기존 백엔드 호출부 호환을 위해 `image_url`, `diet_record_id`도 입력 별칭으로 허용한다.
    """

    diet_image_url: str = Field(
        ...,
        validation_alias=AliasChoices("diet_image_url", "image_url"),
        description="분석할 식단 이미지 URL",
    )
    record_id: uuid.UUID | None = Field(
        None,
        validation_alias=AliasChoices("record_id", "diet_record_id"),
        description="연결할 기존 식단 기록 ID (없으면 새로 생성)",
    )


class MacroRatios(BaseModel):
    """탄단지 비율 스키마."""

    carbohydrates: float = Field(..., ge=0.0, le=100.0, description="탄수화물 비율 (%)")
    protein: float = Field(..., ge=0.0, le=100.0, description="단백질 비율 (%)")
    fat: float = Field(..., ge=0.0, le=100.0, description="지방 비율 (%)")


class DietAnalysisResponse(BaseModel):
    """식단 분석 결과 응답 스키마."""

    model_config = {"from_attributes": True}

    analysis_id: uuid.UUID = Field(..., description="분석 결과 ID")
    record_id: uuid.UUID = Field(..., description="식단 기록 ID")
    total_calories: float = Field(..., description="총 칼로리 (kcal)")
    carb_ratio: float = Field(..., description="탄수화물 비율 (%)")
    protein_ratio: float = Field(..., description="단백질 비율 (%)")
    fat_ratio: float = Field(..., description="지방 비율 (%)")
    ai_comment: str | None = Field(None, description="AI 생성 맞춤 코멘트")
    analyzed_at: datetime
    visualization: dict = Field(default_factory=dict, description="시각화 데이터")


class DietImageUploadResponse(BaseModel):
    """식단 이미지 업로드 응답 스키마."""

    diet_image_url: str = Field(..., description="분석 요청에 사용할 업로드 이미지 URL")
    message: str = Field(default="이미지 업로드 완료", description="처리 결과 메시지")


class DietHealthConnectExportStatusUpdateRequest(BaseModel):
    """Health Connect Nutrition outbound export status update."""

    client_record_id: str = Field(
        ..., min_length=1, max_length=255, description="Deterministic Health Connect clientRecordId"
    )
    record_id: str | None = Field(
        None, max_length=255, description="Device-local Health Connect UUID/cache ID"
    )
    record_version: int | None = Field(None, ge=0, description="Health Connect clientRecordVersion")
    status: HealthConnectExportStatusEnum = Field(..., description="Export lifecycle status")
    exported_at: datetime | None = Field(None, description="Successful export timestamp")
    last_error: str | None = Field(None, max_length=1000, description="Sanitized export error")


class DietHealthConnectExportStatusResponse(BaseModel):
    """Persisted Health Connect Nutrition export status."""

    model_config = {"from_attributes": True}

    record_id: uuid.UUID
    health_connect_client_record_id: str | None
    health_connect_record_id: str | None
    health_connect_record_version: int | None
    health_connect_export_status: HealthConnectExportStatusEnum
    health_connect_exported_at: datetime | None
    health_connect_last_error: str | None


class DietHealthConnectExportableRecord(BaseModel):
    """Analyzed DietRecord payload that can be exported to Health Connect Nutrition."""

    record_id: uuid.UUID
    analysis_id: uuid.UUID
    recorded_at: datetime
    analyzed_at: datetime
    diet_image_url: str | None
    total_calories: float
    carb_ratio: float
    protein_ratio: float
    fat_ratio: float
    nutrition_data: dict | None
    health_connect_client_record_id: str | None
    health_connect_record_id: str | None
    health_connect_record_version: int | None
    health_connect_export_status: HealthConnectExportStatusEnum
    health_connect_exported_at: datetime | None
    health_connect_last_error: str | None


class DietDeleteResponse(BaseModel):
    """Diet record deletion response with outbound export metadata for client cleanup."""

    record_id: uuid.UUID
    deleted: bool = True
    health_connect_client_record_id: str | None
    health_connect_record_id: str | None
    health_connect_export_status: HealthConnectExportStatusEnum


class DietRecordResponse(BaseModel):
    """식단 기록 응답 스키마."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    data_source: DataSourceEnum
    diet_image_url: str | None
    nutrition_data: dict | None
    recorded_at: datetime
