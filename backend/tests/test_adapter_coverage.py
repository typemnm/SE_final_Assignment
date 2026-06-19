"""
Adapter coverage tests for health adapters and map adapter.
Covers apple_health, samsung_health, health_adapter, and map_adapter.
"""

import asyncio

import pytest

from app.infrastructure.adapters.apple_health import AppleHealthAdapter
from app.infrastructure.adapters.samsung_health import SamsungHealthAdapter
from app.infrastructure.adapters.map_adapter import MapAPIAdapter


def run(coro):
    return asyncio.run(coro)


class TestAppleHealthAdapter:
    def test_get_health_data_returns_dict(self):
        adapter = AppleHealthAdapter()
        result = run(adapter.get_health_data())
        assert result["platform"] == "apple_health"
        assert result["steps"] == 0
        assert result["calories_burned"] == 0.0
        assert result["active_minutes"] == 0

    def test_get_diet_records_returns_empty_list(self):
        adapter = AppleHealthAdapter()
        result = run(adapter.get_diet_records())
        assert result == []

    def test_get_running_records_returns_empty_list(self):
        adapter = AppleHealthAdapter()
        result = run(adapter.get_running_records())
        assert result == []


class TestSamsungHealthAdapter:
    def test_get_health_data_returns_dict(self):
        adapter = SamsungHealthAdapter()
        result = run(adapter.get_health_data())
        assert result["platform"] == "samsung_health"
        assert result["steps"] == 0
        assert result["calories_burned"] == 0.0
        assert result["active_minutes"] == 0

    def test_get_diet_records_returns_empty_list(self):
        adapter = SamsungHealthAdapter()
        result = run(adapter.get_diet_records())
        assert result == []

    def test_get_running_records_returns_empty_list(self):
        adapter = SamsungHealthAdapter()
        result = run(adapter.get_running_records())
        assert result == []


class TestMapAPIAdapter:
    def test_calculate_distance_empty(self):
        adapter = MapAPIAdapter()
        result = run(adapter.calculate_distance([]))
        assert result == 0.0

    def test_calculate_distance_single_point(self):
        adapter = MapAPIAdapter()
        result = run(adapter.calculate_distance([{"lat": 35.0, "lng": 128.0}]))
        assert result == 0.0

    def test_calculate_distance_two_points(self):
        adapter = MapAPIAdapter()
        coords = [
            {"lat": 35.2400, "lng": 128.6922},
            {"lat": 35.2450, "lng": 128.6950},
        ]
        result = run(adapter.calculate_distance(coords))
        assert result > 0.0
        assert isinstance(result, float)

    def test_calculate_distance_multiple_points(self):
        adapter = MapAPIAdapter()
        coords = [
            {"lat": 35.2400, "lng": 128.6922},
            {"lat": 35.2410, "lng": 128.6930},
            {"lat": 35.2420, "lng": 128.6940},
            {"lat": 35.2430, "lng": 128.6950},
        ]
        result = run(adapter.calculate_distance(coords))
        assert result > 0.0

    def test_get_route_info_returns_dict(self):
        adapter = MapAPIAdapter()
        coords = [
            {"lat": 35.2400, "lng": 128.6922},
            {"lat": 35.2450, "lng": 128.6950},
        ]
        result = run(adapter.get_route_info(coords))
        assert "total_distance_km" in result
        assert result["waypoints"] == 2
        assert result["elevation_gain_m"] == 0.0

    def test_get_route_info_empty_coords(self):
        adapter = MapAPIAdapter()
        result = run(adapter.get_route_info([]))
        assert result["total_distance_km"] == 0.0
        assert result["waypoints"] == 0
