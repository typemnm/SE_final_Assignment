"""
식단 도메인 Pydantic v2 스키마.
식단 동기화, AI 분석 요청/응답 데이터 검증 및 직렬화를 담당한다.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.domains.diet.models import DataSourceEnum


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
    """식단 이미지 AI 분석 요청 스키마."""

    image_url: str = Field(..., description="분석할 식단 이미지 URL")
    diet_record_id: uuid.UUID | None = Field(
        None, description="연결할 기존 식단 기록 ID (없으면 새로 생성)"
    )


class MacroRatios(BaseModel):
    """탄단지 비율 스키마."""

    carbohydrates: float = Field(..., ge=0.0, le=100.0, description="탄수화물 비율 (%)")
    protein: float = Field(..., ge=0.0, le=100.0, description="단백질 비율 (%)")
    fat: float = Field(..., ge=0.0, le=100.0, description="지방 비율 (%)")


class DietAnalysisResponse(BaseModel):
    """식단 분석 결과 응답 스키마."""

    model_config = {"from_attributes": True}

    id: uuid.UUID = Field(..., description="분석 결과 ID")
    diet_record_id: uuid.UUID
    total_calories: float = Field(..., description="총 칼로리 (kcal)")
    carb_ratio: float = Field(..., description="탄수화물 비율 (%)")
    protein_ratio: float = Field(..., description="단백질 비율 (%)")
    fat_ratio: float = Field(..., description="지방 비율 (%)")
    ai_comment: str | None = Field(None, description="AI 생성 맞춤 코멘트")
    analyzed_at: datetime
    visualization: dict = Field(default_factory=dict, description="시각화 데이터")


class DietRecordResponse(BaseModel):
    """식단 기록 응답 스키마."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    data_source: DataSourceEnum
    diet_image_url: str | None
    nutrition_data: dict | None
    recorded_at: datetime
