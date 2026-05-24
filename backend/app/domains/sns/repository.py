"""
SNS 도메인 DB 접근 레이어.
VlogFeed ORM 객체의 CRUD 작업을 담당한다.
"""

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.sns.models import VlogFeed


class VlogFeedRepository:
    """브이로그 피드 엔티티 저장소."""

    async def upsert_many(
        self, feeds: list[dict], db: AsyncSession
    ) -> int:
        """
        피드 목록을 일괄 upsert한다 (중복 ID는 업데이트).

        Args:
            feeds: 피드 딕셔너리 목록.
            db: 비동기 DB 세션.

        Returns:
            처리된 피드 수.
        """
        if not feeds:
            return 0

        stmt = pg_insert(VlogFeed).values(feeds)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "like_count": stmt.excluded.like_count,
                "crawled_at": stmt.excluded.crawled_at,
            },
        )
        await db.execute(stmt)
        await db.flush()
        return len(feeds)

    async def list_recent(
        self, page: int, page_size: int, db: AsyncSession
    ) -> tuple[list[VlogFeed], int]:
        """
        최신 피드 목록을 페이지네이션하여 조회한다.

        Args:
            page: 페이지 번호 (1부터).
            page_size: 페이지당 항목 수.
            db: 비동기 DB 세션.

        Returns:
            (피드 목록, 전체 수) 튜플.
        """
        offset = (page - 1) * page_size

        count_result = await db.execute(select(func.count(VlogFeed.id)))
        total: int = count_result.scalar_one() or 0

        result = await db.execute(
            select(VlogFeed)
            .order_by(VlogFeed.crawled_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        feeds = list(result.scalars().all())
        return feeds, total

    async def list_by_hashtag(
        self, tag: str, limit: int, db: AsyncSession
    ) -> list[VlogFeed]:
        """
        특정 해시태그가 포함된 피드를 조회한다.

        Args:
            tag: 검색할 해시태그.
            limit: 최대 조회 수.
            db: 비동기 DB 세션.

        Returns:
            VlogFeed 인스턴스 목록.
        """
        result = await db.execute(
            select(VlogFeed)
            .where(VlogFeed.hashtags.contains([tag]))
            .order_by(VlogFeed.like_count.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
