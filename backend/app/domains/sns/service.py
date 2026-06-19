"""
SNS 도메인 비즈니스 로직 서비스.
피드 조회 (캐시 우선), 피드 목록 반환을 담당한다.
"""

import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.sns.repository import VlogFeedRepository
from app.domains.sns.schemas import FeedListResponse, VlogFeedItem
from app.infrastructure.crawlers.sns_crawler import SNSCrawlerService

logger = logging.getLogger(__name__)

_feed_repo = VlogFeedRepository()
_crawler = SNSCrawlerService()

# 캐시 TTL (초)
_CACHE_TTL_SECONDS = 300


async def trigger_crawl(db: AsyncSession) -> int:
    """
    #kelpus 해시태그 크롤링을 실행하고 DB에 저장한다.

    Args:
        db: 비동기 DB 세션.

    Returns:
        저장된 피드 수.
    """
    posts = await _crawler.collect_hashtag_posts("kelpus")
    if not posts:
        return 0
    count = await _feed_repo.upsert_many(posts, db)
    await db.commit()
    return count


async def get_feed_list(
    page: int,
    page_size: int,
    db: AsyncSession,
    redis_client=None,
) -> FeedListResponse:
    """
    피드 목록을 조회한다. Redis 캐시가 있으면 캐시를 우선 사용한다 (캐싱된_피드_데이터_조회 → 피드_리스트_반환).

    Args:
        page: 페이지 번호.
        page_size: 페이지당 항목 수.
        db: 비동기 DB 세션.
        redis_client: Redis 클라이언트 (선택, None이면 캐싱 생략).

    Returns:
        피드 목록 응답.
    """
    cache_key = f"feed:list:page={page}:size={page_size}"

    # 1. 캐시 우선 조회
    if redis_client is not None:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                data = json.loads(cached)
                return FeedListResponse(**data)
        except Exception as e:
            logger.warning("Redis 캐시 조회 실패, DB로 대체: %s", e)

    # 2. DB 조회
    feeds_orm, total = await _feed_repo.list_recent(page=page, page_size=page_size, db=db)
    items = [VlogFeedItem.model_validate(f) for f in feeds_orm]

    response = FeedListResponse(
        items=items,
        total=total,
        from_cache=False,
        page=page,
        page_size=page_size,
    )

    # 3. 캐시 저장
    if redis_client is not None:
        try:
            await redis_client.setex(
                cache_key,
                _CACHE_TTL_SECONDS,
                response.model_dump_json(),
            )
        except Exception as e:
            logger.warning("Redis 캐시 저장 실패: %s", e)

    return response
