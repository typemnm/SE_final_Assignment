"""
Instagram 크롤링 가능 여부 테스트 스크립트.

실행: .venv/bin/python test_instagram_crawl.py [--tag 해시태그] [--limit 개수]
"""

import argparse
import sys
import time

def test_crawl(tag: str, limit: int) -> None:
    try:
        import instaloader
    except ImportError:
        print("[FAIL] instaloader 미설치. pip install instaloader 실행 필요")
        sys.exit(1)

    print(f"[INFO] instaloader {instaloader.__version__} 로드 성공")
    print(f"[INFO] #{tag} 해시태그 크롤링 시도 (최대 {limit}개)...\n")

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

    try:
        start = time.time()
        hashtag = instaloader.Hashtag.from_name(L.context, tag)
        posts = []
        for post in hashtag.get_posts():
            if len(posts) >= limit:
                break
            try:
                caption = post.caption or ""
                raw_tags = [w.lstrip("#") for w in caption.split() if w.startswith("#")]
                posts.append({
                    "id": str(post.mediaid),
                    "url": f"https://www.instagram.com/p/{post.shortcode}/",
                    "author": post.owner_username,
                    "likes": post.likes,
                    "hashtags": raw_tags[:5],  # 최대 5개만 표시
                })
            except Exception as e:
                print(f"  [WARN] 게시물 파싱 오류 (건너뜀): {e}")
                continue

        elapsed = time.time() - start

        if not posts:
            print("[FAIL] 게시물 0개 수집 — Instagram이 비로그인 접근을 차단했을 가능성 높음")
            sys.exit(1)

        print(f"[OK] #{tag} 게시물 {len(posts)}개 수집 완료 ({elapsed:.1f}s)\n")
        print(f"{'번호':<4} {'작성자':<25} {'좋아요':>7}  {'해시태그'}")
        print("-" * 70)
        for i, p in enumerate(posts, 1):
            tags_str = " ".join(f"#{t}" for t in p["hashtags"]) or "(없음)"
            print(f"{i:<4} {p['author']:<25} {p['likes']:>7,}  {tags_str}")
        print()
        print(f"[OK] 크롤링 정상 동작 — 백엔드 개발 진행 가능")

    except instaloader.exceptions.ConnectionException as e:
        print(f"[FAIL] 네트워크/차단 오류: {e}")
        print("       → Instagram이 비로그인 크롤링을 차단 중입니다.")
        print("       → 로그인 세션 사용 또는 시드 데이터로 대체 필요")
        sys.exit(1)
    except Exception as e:
        print(f"[FAIL] 예외 발생: {type(e).__name__}: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Instagram 해시태그 크롤링 테스트")
    parser.add_argument("--tag", default="kelpus", help="크롤링할 해시태그 (기본: kelpus)")
    parser.add_argument("--limit", type=int, default=5, help="수집할 최대 게시물 수 (기본: 5)")
    args = parser.parse_args()
    test_crawl(args.tag, args.limit)
