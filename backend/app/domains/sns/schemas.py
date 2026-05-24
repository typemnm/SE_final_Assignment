"""
SNS 도메인 Pydantic v2 스키마.
피드 조회 요청/응답 데이터 검증 및 직렬화를 담당한다.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class VlogFeedItem(BaseModel):
    """브이로그 피드 단일 항목 스키마."""

    model_config = {"from_attributes": True}

    id: str = Field(..., description="SNS 게시물 고유 ID")
    original_url: str = Field(..., description="원본 게시물 URL")
    author_account: str = Field(..., description="작성자 계정명")
    hashtags: list[str] = Field(default_factory=list, description="해시태그 목록")
    like_count: int = Field(..., description="좋아요 수")
    platform: str = Field(..., description="SNS 플랫폼")
    crawled_at: datetime = Field(..., description="크롤링 일시")


class FeedListResponse(BaseModel):
    """피드 목록 응답 스키마."""

    items: list[VlogFeedItem] = Field(..., description="피드 항목 목록")
    total: int = Field(..., description="전체 피드 수")
    from_cache: bool = Field(..., description="캐시에서 조회 여부")
    page: int = Field(default=1, description="현재 페이지")
    page_size: int = Field(default=20, description="페이지당 항목 수")
