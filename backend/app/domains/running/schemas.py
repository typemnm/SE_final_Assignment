"""
러닝 도메인 Pydantic v2 스키마.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class RunningSyncRequest(BaseModel):
    """러닝 기록 동기화 요청 스키마."""

    distance: float = Field(..., ge=0.0, description="이동 거리 (km)")
    avg_pace: float = Field(..., ge=0.0, description="평균 페이스 (분/km)")
    gps_coordinates: list[dict] = Field(
        default_factory=list,
        description="GPS 좌표 목록 ([{'lat': float, 'lng': float, 'timestamp': str}])",
    )
    duration_seconds: int = Field(default=0, ge=0, description="총 소요 시간 (초)")
    calories: int = Field(default=0, ge=0, description="소모 칼로리 (kcal)")
    external_id: str | None = Field(None, description="헬스 앱 외부 기록 ID (중복 방지)")
    recorded_at: datetime | None = Field(None, description="기록 일시 (None이면 현재 시각)")


class RunningSyncResponse(BaseModel):
    """러닝 기록 동기화 응답 스키마."""

    record_id: uuid.UUID = Field(..., description="생성된 러닝 기록 ID")
    created: bool = Field(default=True, description="새 기록 생성 여부")
    distance: float
    avg_pace: float
    percentile: float = Field(..., description="산출된 상위 백분율")
    overall_rank: int = Field(..., description="전체 순위")
    message: str = Field(default="러닝 기록 동기화 완료")


class RunningRecordResponse(BaseModel):
    """러닝 기록 단일 응답 스키마 (프론트엔드 호환)."""

    id: str
    date: str
    distance: float
    duration: int
    avgPace: float
    calories: int
    route: list[dict]
    splitPaces: list[dict]


class LeaderboardEntry(BaseModel):
    """리더보드 단일 항목 스키마 (캐시 테이블용)."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    overall_rank: int
    percentile: float
    badge: str | None
    distance: float = Field(..., description="연결된 러닝 기록의 이동 거리")
    updated_at: datetime


class LeaderboardResponse(BaseModel):
    """리더보드 전체 응답 스키마."""

    entries: list[LeaderboardEntry] = Field(..., description="리더보드 항목 목록")
    total_users: int = Field(..., description="전체 참여자 수")
    my_rank: int | None = Field(None, description="현재 사용자의 순위")
    my_percentile: float | None = Field(None, description="현재 사용자의 상위 백분율")


class LeaderboardListEntry(BaseModel):
    """리더보드 목록용 항목 스키마 (프론트엔드 호환)."""

    rank: int
    userId: str
    userName: str
    value: float
    badge: str | None = None
    isCurrentUser: bool = False


class LeaderboardListResponse(BaseModel):
    """리더보드 목록 응답 스키마."""

    entries: list[LeaderboardListEntry]
    period: str
    criterion: str
    myRank: int | None = None
    myValue: float | None = None


class LeaderboardNearbyResponse(BaseModel):
    """현재 사용자 주변 순위 응답 스키마."""

    entries: list[LeaderboardListEntry]
    myRank: int | None = None
    myValue: float | None = None
    totalUsers: int = 0
    period: str
    criterion: str


class RunningCourseItem(BaseModel):
    """추천 러닝 코스 스키마."""

    id: str
    name: str
    distance: float
    difficulty: str
    description: str
    location: str
    estimatedTime: int
    rating: float
