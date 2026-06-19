"""
SNS crawler service coverage tests.
Tests SNSCrawlerService methods without hitting real Instagram.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.infrastructure.crawlers.sns_crawler import SNSCrawlerService


def run(coro):
    return asyncio.run(coro)


class TestSNSCrawlerService:
    def test_init(self):
        svc = SNSCrawlerService()
        assert svc._is_running is False

    def test_seed_posts_for_kelpus_tag(self):
        svc = SNSCrawlerService()
        posts = svc._seed_posts_for_tag("kelpus")
        assert len(posts) == 12
        for post in posts:
            assert "crawled_at" in post
            assert post["platform"] == "instagram"

    def test_seed_posts_for_other_tag_returns_empty(self):
        svc = SNSCrawlerService()
        posts = svc._seed_posts_for_tag("unknown_tag")
        assert posts == []

    def test_collect_hashtag_posts_falls_back_to_seed_on_instaloader_failure(self):
        svc = SNSCrawlerService()
        with patch("builtins.__import__", side_effect=ImportError("no instaloader")):
            # collect_hashtag_posts catches exceptions and returns seed
            posts = run(svc.collect_hashtag_posts("kelpus"))
        assert len(posts) == 12

    def test_collect_hashtag_posts_instaloader_exception_returns_seed(self):
        svc = SNSCrawlerService()
        # Simulate instaloader raising on Hashtag.from_name
        mock_instaloader = MagicMock()
        mock_instaloader.Instaloader.return_value = MagicMock()
        mock_instaloader.Hashtag.from_name.side_effect = Exception("rate limited")
        with patch.dict("sys.modules", {"instaloader": mock_instaloader}):
            posts = run(svc.collect_hashtag_posts("kelpus"))
        assert len(posts) == 12

    def test_collect_hashtag_posts_empty_result_uses_seed(self):
        svc = SNSCrawlerService()
        mock_instaloader = MagicMock()
        mock_L = MagicMock()
        mock_instaloader.Instaloader.return_value = mock_L
        mock_hashtag = MagicMock()
        mock_hashtag.get_posts.return_value = []
        mock_instaloader.Hashtag.from_name.return_value = mock_hashtag
        with patch.dict("sys.modules", {"instaloader": mock_instaloader}):
            posts = run(svc.collect_hashtag_posts("kelpus"))
        assert len(posts) == 12

    def test_collect_hashtag_posts_returns_real_posts_when_available(self):
        svc = SNSCrawlerService()
        mock_post = MagicMock()
        mock_post.mediaid = 12345
        mock_post.shortcode = "abc123"
        mock_post.owner_username = "test_user"
        mock_post.caption = "#running #fitness"
        mock_post.likes = 100

        mock_instaloader = MagicMock()
        mock_L = MagicMock()
        mock_instaloader.Instaloader.return_value = mock_L
        mock_hashtag = MagicMock()
        mock_hashtag.get_posts.return_value = [mock_post]
        mock_instaloader.Hashtag.from_name.return_value = mock_hashtag
        with patch.dict("sys.modules", {"instaloader": mock_instaloader}):
            posts = run(svc.collect_hashtag_posts("running"))
        assert len(posts) == 1
        assert posts[0]["author_account"] == "test_user"
        assert posts[0]["like_count"] == 100

    def test_collect_hashtag_posts_skips_bad_posts(self):
        svc = SNSCrawlerService()
        bad_post = MagicMock()
        bad_post.mediaid = PropertyError()

        good_post = MagicMock()
        good_post.mediaid = 99
        good_post.shortcode = "xyz"
        good_post.owner_username = "user2"
        good_post.caption = None
        good_post.likes = 5

        mock_instaloader = MagicMock()
        mock_L = MagicMock()
        mock_instaloader.Instaloader.return_value = mock_L
        mock_hashtag = MagicMock()
        mock_hashtag.get_posts.return_value = [bad_post, good_post]
        mock_instaloader.Hashtag.from_name.return_value = mock_hashtag
        with patch.dict("sys.modules", {"instaloader": mock_instaloader}):
            posts = run(svc.collect_hashtag_posts("test"))
        # good_post has no hashtags in caption (None), uses tag as fallback
        assert any(p["hashtags"] == ["test"] for p in posts)

    def test_sync_sns_stories_runs_without_error(self):
        svc = SNSCrawlerService()
        run(svc.sync_sns_stories("user-123"))

    def test_stop_sets_is_running_false(self):
        svc = SNSCrawlerService()
        svc._is_running = True
        svc.stop()
        assert svc._is_running is False


class PropertyError(Exception):
    pass
