"""
VlogFeedRepository coverage tests.
Tests list_recent, list_by_hashtag, and upsert_many methods.
"""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.sns.repository import VlogFeedRepository
from app.domains.sns.models import VlogFeed


def run(coro):
    return asyncio.run(coro)


def make_feed(fid="f1"):
    return VlogFeed(
        id=fid,
        original_url="https://example.com",
        author_account="author",
        hashtags=["run"],
        like_count=5,
        platform="instagram",
        crawled_at=datetime.now(timezone.utc),
    )


def make_db_session():
    """Return an AsyncMock db session with scalable result mocking."""
    session = AsyncMock()
    return session


def _make_execute_result(scalar_one_value=None, scalars_list=None):
    """Helper to create a mock execute result."""
    result = MagicMock()
    result.scalar_one.return_value = scalar_one_value if scalar_one_value is not None else 0
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_list or []
    result.scalars.return_value = scalars_mock
    return result


class TestListRecent:
    def test_returns_feeds_and_total(self):
        feed = make_feed()
        db = make_db_session()
        count_result = _make_execute_result(scalar_one_value=1)
        feed_result = _make_execute_result(scalars_list=[feed])
        db.execute = AsyncMock(side_effect=[count_result, feed_result])

        repo = VlogFeedRepository()
        feeds, total = run(repo.list_recent(1, 20, db))

        assert total == 1
        assert len(feeds) == 1
        assert feeds[0].id == "f1"

    def test_returns_empty_list(self):
        db = make_db_session()
        count_result = _make_execute_result(scalar_one_value=0)
        feed_result = _make_execute_result(scalars_list=[])
        db.execute = AsyncMock(side_effect=[count_result, feed_result])

        repo = VlogFeedRepository()
        feeds, total = run(repo.list_recent(1, 20, db))

        assert total == 0
        assert feeds == []

    def test_pagination_offset(self):
        db = make_db_session()
        count_result = _make_execute_result(scalar_one_value=25)
        feed_result = _make_execute_result(scalars_list=[make_feed("f2")])
        db.execute = AsyncMock(side_effect=[count_result, feed_result])

        repo = VlogFeedRepository()
        feeds, total = run(repo.list_recent(2, 20, db))

        assert total == 25
        assert feeds[0].id == "f2"

    def test_scalar_none_returns_zero_total(self):
        db = make_db_session()
        count_result = _make_execute_result(scalar_one_value=None)
        feed_result = _make_execute_result(scalars_list=[])
        db.execute = AsyncMock(side_effect=[count_result, feed_result])

        repo = VlogFeedRepository()
        feeds, total = run(repo.list_recent(1, 10, db))

        assert total == 0
        assert feeds == []

    def test_multiple_feeds(self):
        feeds_data = [make_feed(f"f{i}") for i in range(5)]
        db = make_db_session()
        count_result = _make_execute_result(scalar_one_value=5)
        feed_result = _make_execute_result(scalars_list=feeds_data)
        db.execute = AsyncMock(side_effect=[count_result, feed_result])

        repo = VlogFeedRepository()
        feeds, total = run(repo.list_recent(1, 5, db))

        assert total == 5
        assert len(feeds) == 5


class TestListByHashtag:
    def test_returns_matching_feeds(self):
        feed = make_feed()
        db = make_db_session()
        result = _make_execute_result(scalars_list=[feed])
        db.execute = AsyncMock(return_value=result)

        repo = VlogFeedRepository()
        feeds = run(repo.list_by_hashtag("run", 10, db))

        assert len(feeds) == 1
        assert feeds[0].id == "f1"

    def test_returns_empty_for_no_match(self):
        db = make_db_session()
        result = _make_execute_result(scalars_list=[])
        db.execute = AsyncMock(return_value=result)

        repo = VlogFeedRepository()
        feeds = run(repo.list_by_hashtag("nonexistent", 10, db))

        assert feeds == []

    def test_respects_limit(self):
        feeds_data = [make_feed(f"f{i}") for i in range(3)]
        db = make_db_session()
        result = _make_execute_result(scalars_list=feeds_data)
        db.execute = AsyncMock(return_value=result)

        repo = VlogFeedRepository()
        feeds = run(repo.list_by_hashtag("run", 3, db))

        assert len(feeds) == 3


class TestUpsertMany:
    def test_upsert_returns_count(self):
        db = make_db_session()
        db.execute = AsyncMock(return_value=MagicMock())
        db.flush = AsyncMock()

        repo = VlogFeedRepository()
        feed_dicts = [
            {
                "id": "f1",
                "original_url": "https://example.com",
                "author_account": "author",
                "hashtags": ["run"],
                "like_count": 5,
                "platform": "instagram",
                "crawled_at": datetime.now(timezone.utc),
            }
        ]
        count = run(repo.upsert_many(feed_dicts, db))

        assert count == 1
        db.execute.assert_awaited_once()
        db.flush.assert_awaited_once()

    def test_upsert_empty_list_returns_zero(self):
        db = make_db_session()

        repo = VlogFeedRepository()
        count = run(repo.upsert_many([], db))

        assert count == 0
        db.execute.assert_not_awaited()

    def test_upsert_multiple_returns_count(self):
        db = make_db_session()
        db.execute = AsyncMock(return_value=MagicMock())
        db.flush = AsyncMock()

        repo = VlogFeedRepository()
        feed_dicts = [
            {
                "id": f"f{i}",
                "original_url": f"https://example.com/{i}",
                "author_account": "author",
                "hashtags": ["run"],
                "like_count": i,
                "platform": "instagram",
                "crawled_at": datetime.now(timezone.utc),
            }
            for i in range(3)
        ]
        count = run(repo.upsert_many(feed_dicts, db))

        assert count == 3
