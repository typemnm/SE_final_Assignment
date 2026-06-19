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
    "kelpus",
    "헬스",
    "런닝",
    "다이어트",
    "식단관리",
    "건강식",
    "러닝크루",
    "마라톤",
    "홈트",
]

# instaloader 실패 시 사용할 #kelpus 시드 데이터 (실제 Instagram 포스트 형식)
_KELPUS_SEED_POSTS = [
    {
        "id": "kelpus_seed_001",
        "original_url": "https://www.instagram.com/p/C8kelpus001/",
        "author_account": "runner_jisu_kr",
        "hashtags": ["kelpus", "kelpus러닝", "새벽러닝", "한강", "7km", "러닝"],
        "like_count": 12400,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_002",
        "original_url": "https://www.instagram.com/p/C8kelpus002/",
        "author_account": "fit_mirae_official",
        "hashtags": ["kelpus", "kelpus식단", "샐러드", "클린이팅", "다이어트", "건강식"],
        "like_count": 28700,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_003",
        "original_url": "https://www.instagram.com/p/C8kelpus003/",
        "author_account": "marathon_sungwoo",
        "hashtags": ["kelpus", "kelpus러닝", "마라톤준비", "10km", "러닝크루", "달리기"],
        "like_count": 9300,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_004",
        "original_url": "https://www.instagram.com/p/C8kelpus004/",
        "author_account": "diet_queen_hayeon",
        "hashtags": ["kelpus", "kelpus식단", "단백질식단", "닭가슴살", "헬스식단", "다이어트"],
        "like_count": 34100,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_005",
        "original_url": "https://www.instagram.com/p/C8kelpus005/",
        "author_account": "morning_run_dahye",
        "hashtags": ["kelpus", "kelpus러닝", "아침러닝", "5km완주", "러닝스타그램"],
        "like_count": 7800,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_006",
        "original_url": "https://www.instagram.com/p/C8kelpus006/",
        "author_account": "healthy_junho_log",
        "hashtags": ["kelpus", "kelpus후기", "3개월후기", "다이어트성공", "운동스타그램"],
        "like_count": 48700,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_007",
        "original_url": "https://www.instagram.com/p/C8kelpus007/",
        "author_account": "salad_life_yoona",
        "hashtags": ["kelpus", "kelpus식단", "그릭요거트", "건강아침", "파르페", "식단관리"],
        "like_count": 21500,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_008",
        "original_url": "https://www.instagram.com/p/C8kelpus008/",
        "author_account": "trail_runner_minseok",
        "hashtags": ["kelpus", "kelpus러닝", "트레일런닝", "산악달리기", "주말러닝"],
        "like_count": 15200,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_009",
        "original_url": "https://www.instagram.com/p/C8kelpus009/",
        "author_account": "bodychange_sora",
        "hashtags": ["kelpus", "kelpus운동", "홈트", "근력운동", "바디체인지", "운동일기"],
        "like_count": 19800,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_010",
        "original_url": "https://www.instagram.com/p/C8kelpus010/",
        "author_account": "keto_diet_jiwon",
        "hashtags": ["kelpus", "kelpus식단", "케토다이어트", "저탄고지", "케일샐러드"],
        "like_count": 11300,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_011",
        "original_url": "https://www.instagram.com/p/C8kelpus011/",
        "author_account": "half_marathon_eunji",
        "hashtags": ["kelpus", "kelpus러닝", "하프마라톤", "21km", "러닝챌린지"],
        "like_count": 23600,
        "platform": "instagram",
    },
    {
        "id": "kelpus_seed_012",
        "original_url": "https://www.instagram.com/p/C8kelpus012/",
        "author_account": "wellness_taeyang",
        "hashtags": ["kelpus", "kelpus앱추천", "건강관리앱", "운동기록", "칼로리관리"],
        "like_count": 6700,
        "platform": "instagram",
    },
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

    def _seed_posts_for_tag(self, tag: str) -> list[dict]:
        """태그에 해당하는 시드 데이터를 현재 시각의 crawled_at으로 반환한다."""
        if tag == "kelpus":
            now = datetime.now(timezone.utc).isoformat()
            return [{**p, "crawled_at": now} for p in _KELPUS_SEED_POSTS]
        return []

    async def collect_hashtag_posts(self, tag: str) -> list[dict]:
        """
        특정 해시태그의 게시물을 수집한다 (해시태그_게시물_수집).

        instaloader로 실제 크롤링을 시도하고, 실패 시 시드 데이터를 반환한다.

        Args:
            tag: 수집할 해시태그 (# 없이).

        Returns:
            수집된 게시물 딕셔너리 목록.
            각 항목: {id, original_url, author_account, hashtags, like_count, platform, crawled_at}
        """
        logger.info("SNS 크롤러: 해시태그 수집 시작 - #%s", tag)
        try:
            import instaloader
            L = instaloader.Instaloader(
                download_pictures=False,
                download_videos=False,
                download_video_thumbnails=False,
                download_geotags=False,
                download_comments=False,
                save_metadata=False,
                compress_json=False,
                quiet=True,
            )
            hashtag = instaloader.Hashtag.from_name(L.context, tag)
            posts = []
            for post in hashtag.get_posts():
                if len(posts) >= 20:
                    break
                try:
                    caption = post.caption or ""
                    raw_tags = [w.lstrip("#") for w in caption.split() if w.startswith("#")]
                    posts.append({
                        "id": str(post.mediaid),
                        "original_url": f"https://www.instagram.com/p/{post.shortcode}/",
                        "author_account": post.owner_username,
                        "hashtags": raw_tags if raw_tags else [tag],
                        "like_count": post.likes,
                        "platform": "instagram",
                        "crawled_at": datetime.now(timezone.utc).isoformat(),
                    })
                except Exception as e:
                    logger.warning("게시물 파싱 오류 (건너뜀): %s", e)
                    continue
            if posts:
                logger.info("SNS 크롤러: #%s 게시물 %d개 수집 완료", tag, len(posts))
                return posts
            # instaloader가 성공했지만 결과가 없으면 시드로 대체
            logger.warning("SNS 크롤러: #%s 결과 없음 — 시드 데이터 사용", tag)
            return self._seed_posts_for_tag(tag)
        except Exception as e:
            logger.warning("instaloader 크롤링 실패 (#%s): %s — 시드 데이터 사용", tag, e)
            return self._seed_posts_for_tag(tag)

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
        """모든 기본 해시태그에 대해 크롤링을 1회 실행하고 DB에 저장한다."""
        from app.database import AsyncSessionLocal
        from app.domains.sns.repository import VlogFeedRepository

        repo = VlogFeedRepository()
        logger.info("SNS 크롤러: 주기적 크롤링 실행 (%d개 태그)", len(_DEFAULT_HASHTAGS))
        for tag in _DEFAULT_HASHTAGS:
            try:
                posts = await self.collect_hashtag_posts(tag)
                if not posts:
                    continue
                async with AsyncSessionLocal() as db:
                    count = await repo.upsert_many(posts, db)
                    await db.commit()
                    logger.info("해시태그 #%s: %d개 게시물 저장 완료", tag, count)
            except Exception as e:
                logger.error("해시태그 #%s 크롤링/저장 실패: %s", tag, e)

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
