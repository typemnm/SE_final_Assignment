"""
SNS 크롤러 서비스.
해시태그 게시물 수집 및 SNS 스토리 동기화를 백그라운드 태스크로 실행한다.
다이어그램의 SNS_크롤러_서비스(Service)에 해당한다.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger(__name__)

# 크롤링 주기 (초)
_CRAWL_INTERVAL_SECONDS = 600  # 10분

# 수집할 기본 해시태그 목록
_DEFAULT_HASHTAGS = [
    "헬스",
    "런닝",
    "다이어트",
    "식단관리",
    "건강식",
    "러닝크루",
    "마라톤",
    "홈트",
]


class SNSCrawlerService:
    """
    SNS 크롤러 서비스 (SNS_크롤러_서비스).

    해시태그_게시물_수집(태그:String), SNS_스토리_동기화(사용자_ID) 메서드를 제공한다.
    실제 환경에서는 Instagram Graph API 또는 공개 크롤러와 연동한다.
    """

    def __init__(self) -> None:
        """SNSCrawlerService 초기화."""
        self._instagram_token = settings.INSTAGRAM_API_TOKEN
        self._is_running = False

    async def collect_hashtag_posts(self, tag: str) -> list[dict]:
        """
        특정 해시태그의 게시물을 수집한다 (해시태그_게시물_수집).

        Args:
            tag: 수집할 해시태그 (# 없이).

        Returns:
            수집된 게시물 딕셔너리 목록.
            각 항목: {id, original_url, author_account, hashtags, like_count, platform}
        """
        logger.info("SNS 크롤러: 해시태그 수집 시작 - #%s", tag)

        # TODO: Instagram Graph API 또는 공개 크롤러 연동
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(
        #         "https://graph.instagram.com/ig_hashtag_search",
        #         params={"q": tag, "access_token": self._instagram_token},
        #     )
        #     return self._parse_posts(response.json())

        # Mock 응답 (구조 검증용)
        return [
            {
                "id": f"mock_{tag}_{i}",
                "original_url": f"https://www.instagram.com/p/mock_{tag}_{i}/",
                "author_account": f"runner_{i:03d}",
                "hashtags": [tag, "운동", "건강"],
                "like_count": 100 + i * 10,
                "platform": "instagram",
                "crawled_at": datetime.now(timezone.utc).isoformat(),
            }
            for i in range(3)
        ]

    async def sync_sns_stories(self, user_id: str) -> None:
        """
        특정 사용자의 SNS 스토리를 동기화한다 (SNS_스토리_동기화).

        Args:
            user_id: 동기화할 사용자 UUID 문자열.
        """
        logger.info("SNS 크롤러: 사용자 스토리 동기화 - user_id=%s", user_id)

        # TODO: 사용자 연결 SNS 계정의 스토리 동기화 구현
        # 1. DB에서 사용자의 연결된 SNS 계정 조회
        # 2. 해당 계정의 최신 스토리 수집
        # 3. VlogFeed 테이블에 저장

    async def _crawl_once(self) -> None:
        """모든 기본 해시태그에 대해 크롤링을 1회 실행한다."""
        logger.info("SNS 크롤러: 주기적 크롤링 실행 (%d개 태그)", len(_DEFAULT_HASHTAGS))
        for tag in _DEFAULT_HASHTAGS:
            try:
                posts = await self.collect_hashtag_posts(tag)
                logger.debug("해시태그 #%s: %d개 게시물 수집", tag, len(posts))
                # TODO: 수집된 posts를 VlogFeedRepository를 통해 DB에 저장
            except Exception as e:
                logger.error("해시태그 #%s 크롤링 실패: %s", tag, e)

    async def start_periodic_crawling(self) -> None:
        """
        백그라운드 주기적 크롤링을 시작한다.

        애플리케이션 lifespan에서 asyncio.create_task()로 실행된다.
        """
        self._is_running = True
        logger.info(
            "SNS 크롤러 백그라운드 태스크 시작 (주기: %ds)", _CRAWL_INTERVAL_SECONDS
        )
        while self._is_running:
            await self._crawl_once()
            await asyncio.sleep(_CRAWL_INTERVAL_SECONDS)

    def stop(self) -> None:
        """백그라운드 크롤링을 중지한다."""
        self._is_running = False
        logger.info("SNS 크롤러 백그라운드 태스크 중지")
