"""
사용자 도메인 Pydantic v2 스키마.
요청/응답 데이터 검증 및 직렬화를 담당한다.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.domains.user.models import GenderEnum, SubscriptionTypeEnum


# ─── 인증 스키마 ───────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    """회원가입 요청 스키마."""

    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., min_length=8, max_length=100, description="비밀번호 (최소 8자)")
    age: int | None = Field(None, ge=0, le=150, description="나이")
    gender: GenderEnum | None = Field(None, description="성별")
    health_goal: str | None = Field(None, max_length=500, description="건강 목표")


class LoginRequest(BaseModel):
    """로그인 요청 스키마."""

    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., description="비밀번호")


class RefreshRequest(BaseModel):
    """토큰 갱신 요청 스키마."""

    refresh_token: str = Field(..., description="리프레시 토큰")


class UserInfo(BaseModel):
    """토큰 응답에 포함되는 최소 사용자 정보."""

    id: uuid.UUID
    email: str


class TokenResponse(BaseModel):
    """JWT 토큰 응답 스키마."""

    access_token: str = Field(..., description="JWT 액세스 토큰")
    refresh_token: str = Field(..., description="JWT 리프레시 토큰")
    token_type: str = Field(default="bearer", description="토큰 유형")
    expires_in: int = Field(..., description="액세스 토큰 만료 시간 (초)")
    user: UserInfo = Field(..., description="인증된 사용자 기본 정보")


class RefreshResponse(BaseModel):
    """토큰 갱신 응답 스키마."""

    access_token: str = Field(..., description="새 JWT 액세스 토큰")
    token_type: str = Field(default="bearer", description="토큰 유형")
    expires_in: int = Field(..., description="액세스 토큰 만료 시간 (초)")


# ─── 사용자 스키마 ────────────────────────────────────────────────────────────


class UserProfileResponse(BaseModel):
    """사용자 프로필 응답 스키마."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    age: int | None
    gender: GenderEnum | None
    health_goal: str | None
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    """프로필 수정 요청 스키마."""

    age: int | None = Field(None, ge=0, le=150, description="나이")
    gender: GenderEnum | None = Field(None, description="성별")
    health_goal: str | None = Field(None, max_length=500, description="건강 목표")


# ─── 구독 플랜 스키마 ─────────────────────────────────────────────────────────


class SubscriptionPlanResponse(BaseModel):
    """구독 플랜 응답 스키마."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    type: SubscriptionTypeEnum
    daily_ai_limit: int
    total_usage: int
    today_usage: int
    renewal_date: date | None


class SubscriptionLimitResponse(BaseModel):
    """구독 잔여 횟수 응답 스키마."""

    has_remaining: bool = Field(..., description="잔여 횟수 존재 여부")
    today_usage: int = Field(..., description="오늘 사용량")
    daily_ai_limit: int = Field(..., description="일일 한도")
    remaining: int = Field(..., description="잔여 횟수")
