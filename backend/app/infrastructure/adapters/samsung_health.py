"""
Samsung Health 어댑터 구현체.
IHealthAdapter를 구현하여 Samsung Health SDK 데이터를 제공한다.
"""

import logging

from app.infrastructure.adapters.health_adapter import IHealthAdapter

logger = logging.getLogger(__name__)


class SamsungHealthAdapter(IHealthAdapter):
    """
    Samsung Health SDK 어댑터.

    실제 환경에서는 Android 앱의 Samsung Health SDK와 연동하여 데이터를 수신한다.
    현재는 mock 패턴으로 구조만 구현되어 있다.
    """

    async def get_health_data(self) -> dict:
        """
        Samsung Health SDK에서 헬스 데이터 요약을 반환한다.

        Returns:
            헬스 데이터 딕셔너리.
        """
        logger.debug("Samsung Health: 헬스 데이터 조회")
        # TODO: Samsung Health SDK API 연동 구현
        return {
            "steps": 0,
            "calories_burned": 0.0,
            "active_minutes": 0,
            "platform": "samsung_health",
        }

    async def get_diet_records(self) -> list[dict]:
        """
        Samsung Health에서 식단 기록을 반환한다.

        Returns:
            식단 기록 딕셔너리 목록.
        """
        logger.debug("Samsung Health: 식단 기록 조회")
        # TODO: Samsung Health Food Tracker 데이터 파싱 구현
        return []

    async def get_running_records(self) -> list[dict]:
        """
        Samsung Health에서 러닝 기록을 반환한다.

        Returns:
            러닝 기록 딕셔너리 목록.
        """
        logger.debug("Samsung Health: 러닝 기록 조회")
        # TODO: Samsung Health Exercise 데이터 파싱 구현
        return []
