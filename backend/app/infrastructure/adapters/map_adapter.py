"""
지도 API 어댑터.
IMapAdapter 인터페이스와 MapAPIAdapter 구현체를 제공한다.
"""

import logging
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class IMapAdapter(ABC):
    """
    지도 API 어댑터 인터페이스.

    GPS 좌표 처리, 경로 분석 등 지도 관련 기능을 추상화한다.
    """

    @abstractmethod
    async def calculate_distance(self, coordinates: list[dict]) -> float:
        """
        GPS 좌표 목록을 기반으로 총 이동 거리를 계산한다.

        Args:
            coordinates: GPS 좌표 목록 ([{"lat": float, "lng": float}]).

        Returns:
            총 이동 거리 (km).
        """
        ...

    @abstractmethod
    async def get_route_info(self, coordinates: list[dict]) -> dict:
        """
        GPS 좌표 경로의 상세 정보를 반환한다.

        Args:
            coordinates: GPS 좌표 목록.

        Returns:
            경로 정보 딕셔너리 (distance, elevation_gain 등).
        """
        ...


class MapAPIAdapter(IMapAdapter):
    """
    지도 API 어댑터 구현체.

    실제 환경에서는 Google Maps API 또는 Kakao Maps API와 연동한다.
    현재는 mock 패턴으로 구조만 구현되어 있다.
    """

    def __init__(self) -> None:
        """MapAPIAdapter 초기화."""
        self._api_key = settings.MAP_API_KEY

    async def calculate_distance(self, coordinates: list[dict]) -> float:
        """
        Haversine 공식으로 GPS 좌표 간 총 거리를 계산한다.

        Args:
            coordinates: GPS 좌표 목록.

        Returns:
            총 이동 거리 (km).
        """
        if len(coordinates) < 2:
            return 0.0

        import math

        def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
            """두 좌표 간 거리를 Haversine 공식으로 계산한다 (km)."""
            r = 6371.0
            d_lat = math.radians(lat2 - lat1)
            d_lng = math.radians(lng2 - lng1)
            a = (
                math.sin(d_lat / 2) ** 2
                + math.cos(math.radians(lat1))
                * math.cos(math.radians(lat2))
                * math.sin(d_lng / 2) ** 2
            )
            return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        total = 0.0
        for i in range(len(coordinates) - 1):
            total += _haversine(
                coordinates[i]["lat"],
                coordinates[i]["lng"],
                coordinates[i + 1]["lat"],
                coordinates[i + 1]["lng"],
            )
        return round(total, 3)

    async def get_route_info(self, coordinates: list[dict]) -> dict:
        """
        경로 상세 정보를 반환한다.

        Args:
            coordinates: GPS 좌표 목록.

        Returns:
            경로 정보 딕셔너리.
        """
        logger.debug("지도 API: 경로 정보 조회 (%d 좌표)", len(coordinates))
        distance = await self.calculate_distance(coordinates)
        # TODO: 실제 Maps API 호출로 고도 변화(elevation), 지형 정보 추가
        return {
            "total_distance_km": distance,
            "waypoints": len(coordinates),
            "elevation_gain_m": 0.0,
        }
