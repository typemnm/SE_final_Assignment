"""
애플리케이션 환경 설정 모듈.
pydantic-settings를 통해 환경 변수를 로드하고 유효성을 검사한다.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경 변수 기반 애플리케이션 설정."""

    # 데이터베이스
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/kelpus_db"

    # JWT 인증
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # AI 분석 서비스
    AI_ANALYSIS_API_KEY: str = "dummy-key"
    AI_ANALYSIS_BASE_URL: str = "https://api.openai.com/v1"

    # SNS 크롤러
    INSTAGRAM_API_TOKEN: str = "dummy-token"

    # 지도 API
    MAP_API_KEY: str = "dummy-map-key"

    # 구독 플랜 일일 한도
    FREE_PLAN_DAILY_LIMIT: int = 3
    PREMIUM_PLAN_DAILY_LIMIT: int = 10

    # Redis (피드 캐싱)
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """싱글턴 Settings 인스턴스를 반환한다."""
    return Settings()


settings: Settings = get_settings()
