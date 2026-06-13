"""
FastAPI 애플리케이션 진입점.
lifespan 컨텍스트, CORS 미들웨어, 라우터 등록, 백그라운드 태스크를 설정한다.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import create_tables
from app.domains.diet.router import diet_router
from app.domains.health.router import health_router
from app.domains.running.router import running_router
from app.domains.sns.router import feed_router
from app.domains.user.router import auth_router, subscription_router, user_router
from app.infrastructure.crawlers.sns_crawler import SNSCrawlerService

logger = logging.getLogger(__name__)

_sns_crawler = SNSCrawlerService()
_crawler_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    애플리케이션 수명주기 관리.

    시작 시: DB 테이블 생성, SNS 크롤러 백그라운드 태스크 실행.
    종료 시: 크롤러 태스크 취소.
    """
    global _crawler_task

    # 시작
    logger.info("Kelpus 백엔드 시작 중...")
    await create_tables()
    logger.info("DB 테이블 준비 완료")

    _crawler_task = asyncio.create_task(_sns_crawler.start_periodic_crawling())
    logger.info("SNS 크롤러 백그라운드 태스크 시작됨")

    yield

    # 종료
    logger.info("Kelpus 백엔드 종료 중...")
    _sns_crawler.stop()
    if _crawler_task and not _crawler_task.done():
        _crawler_task.cancel()
        try:
            await _crawler_task
        except asyncio.CancelledError:
            pass
    logger.info("정리 완료")


def create_app() -> FastAPI:
    """
    FastAPI 애플리케이션 인스턴스를 생성하고 설정한다.

    Returns:
        설정된 FastAPI 인스턴스.
    """
    app = FastAPI(
        title="Kelpus API",
        description=(
            "Kelpus 헬스케어 플랫폼 백엔드 API.\n\n"
            "식단 관리, 러닝 기록, SNS 피드, AI 분석 기능을 제공한다."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ─── CORS 미들웨어 ────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── 정적 식단 이미지 업로드 경로 ─────────────────────────────────────────
    diet_upload_dir = Path(__file__).resolve().parents[1] / "static" / "diet_uploads"
    diet_upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/static/diet_uploads",
        StaticFiles(directory=diet_upload_dir),
        name="diet_uploads",
    )

    # ─── 라우터 등록 ──────────────────────────────────────────────────────────
    app.include_router(auth_router)
    app.include_router(user_router)
    app.include_router(subscription_router)
    app.include_router(diet_router)
    app.include_router(running_router)
    app.include_router(health_router)
    app.include_router(feed_router)

    # ─── 헬스체크 엔드포인트 ──────────────────────────────────────────────────
    @app.get("/health", tags=["시스템"], summary="서버 상태 확인")
    async def health_check() -> dict:
        """서버 상태를 반환한다."""
        return {"status": "healthy", "version": "1.0.0"}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
