"""
OS 헬스 어댑터 인터페이스 및 추상 기반 클래스.
클래스 다이어그램의 «Interface» IHealthAdapter를 정의한다.
"""

from abc import ABC, abstractmethod


class IHealthAdapter(ABC):
    """
    OS 헬스 어댑터 인터페이스 (클래스 다이어그램 «Interface»).

    Apple Health, Samsung Health 등 다양한 플랫폼의 헬스 데이터를
    동일한 인터페이스로 접근할 수 있도록 추상화한다.
    """

    @abstractmethod
    async def get_health_data(self) -> dict:
        """
        헬스 데이터 요약 정보를 반환한다.

        Returns:
            헬스 데이터 딕셔너리 (steps, calories_burned 등).
        """
        ...

    @abstractmethod
    async def get_diet_records(self) -> list[dict]:
        """
        식단 기록 목록을 반환한다.

        Returns:
            식단 기록 딕셔너리 목록.
            각 항목: {energyConsumed, carbohydrates, protein, totalFat, dietaryFiber, timestamp}
        """
        ...

    @abstractmethod
    async def get_running_records(self) -> list[dict]:
        """
        러닝 기록 목록을 반환한다.

        Returns:
            러닝 기록 딕셔너리 목록.
            각 항목: {distance, avg_pace, gps_coordinates, recorded_at}
        """
        ...
