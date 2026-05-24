"""
SNS 도메인 ORM 모델.
VlogFeed 엔티티를 SQLAlchemy 2.0 비동기 스타일로 정의한다.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VlogFeed(Base):
    """
    브이로그 피드 엔티티.

    Attributes:
        id: 문자열 기본키 (게시물_ID, SNS 플랫폼 고유 ID).
        original_url: 원본 게시물 URL.
        author_account: 작성자 계정명.
        hashtags: 해시태그 목록.
        like_count: 좋아요 수.
        crawled_at: 크롤링 일시.
        platform: SNS 플랫폼 (instagram, tiktok 등).
    """

    __tablename__ = "vlog_feeds"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    original_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    author_account: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashtags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    crawled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    platform: Mapped[str] = mapped_column(String(50), default="instagram", nullable=False)

    def display_feed_info(self) -> dict:
        """
        피드 정보를 표시용 딕셔너리로 반환한다 (피드_정보_표시).

        Returns:
            피드 정보 딕셔너리.
        """
        return {
            "id": self.id,
            "original_url": self.original_url,
            "author_account": self.author_account,
            "hashtags": self.hashtags,
            "like_count": self.like_count,
            "platform": self.platform,
            "crawled_at": self.crawled_at.isoformat() if self.crawled_at else None,
        }

    def register_like(self, delta: int = 1) -> "VlogFeed":
        """
        좋아요 수를 증가시킨다 (좋아요_등록).

        Args:
            delta: 증가량 (기본 1).

        Returns:
            업데이트된 VlogFeed 인스턴스.
        """
        self.like_count = max(0, self.like_count + delta)
        return self
