"""
Apple Health 어댑터 구현체.
IHealthAdapter를 구현하여 Apple HealthKit 데이터를 제공한다.
"""

import logging

from app.infrastructure.adapters.health_adapter import IHealthAdapter

logger = logging.getLogger(__name__)


class AppleHealthAdapter(IHealthAdapter):
    """
    Apple HealthKit 어댑터.

    실제 환경에서는 iOS 앱의 HealthKit SDK와 연동하여 데이터를 수신한다.
    현재는 mock 패턴으로 구조만 구현되어 있다.
    """

    async def get_health_data(self) -> dict:
        """
        Apple HealthKit에서 헬스 데이터 요약을 반환한다.

        Returns:
            헬스 데이터 딕셔너리.
        """
        logger.debug("Apple HealthKit: 헬스 데이터 조회")
        # TODO: 실제 HealthKit SDK 연동 구현
        return {
            "steps": 0,
            "calories_burned": 0.0,
            "active_minutes": 0,
            "platform": "apple_health",
        }

    async def get_diet_records(self) -> list[dict]:
        """
        Apple HealthKit에서 식단 기록을 반환한다.

        Returns:
            식단 기록 딕셔너리 목록.
        """
        logger.debug("Apple HealthKit: 식단 기록 조회")
        # TODO: HealthKit HKFoodItem 데이터 파싱 구현
        return []

    async def get_running_records(self) -> list[dict]:
        """
        Apple HealthKit에서 러닝 기록을 반환한다.

        Returns:
            러닝 기록 딕셔너리 목록.
        """
        logger.debug("Apple HealthKit: 러닝 기록 조회")
        # TODO: HealthKit HKWorkout 데이터 파싱 구현
        return []
