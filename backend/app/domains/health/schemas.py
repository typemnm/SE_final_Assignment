"""Health Connect grouped sync contract schemas.

These schemas intentionally separate the endpoint envelope from per-record
validation. The future `/api/v1/health/sync` endpoint should parse only the
platform and top-level grouped arrays with :class:`HealthConnectSyncEnvelope` so
malformed individual records can be counted as per-record failures instead of
rejecting the whole request.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

HealthPlatform = Literal["health_connect"]
HealthSyncStatus = Literal["success", "partial_success", "failed"]


class HealthSchema(BaseModel):
    """Base schema accepting both Python and JSON/camelCase field names."""

    model_config = ConfigDict(populate_by_name=True)


class HealthConnectRoutePoint(HealthSchema):
    """GPS route point used by Health Connect running records."""

    lat: float
    lng: float
    timestamp: datetime
    altitude: float | None = None


class HealthConnectRunningRecord(HealthSchema):
    """Canonical running contract.

    Speed samples are not persisted in the MVP. If available, Health Connect
    Speed data should be used by the adapter to derive pace/split-compatible
    values before this record reaches the backend.
    """

    external_id: str | None = Field(None, alias="externalId", min_length=1)
    recorded_at: datetime = Field(..., alias="recordedAt")
    distance_km: float = Field(..., alias="distanceKm", ge=0.0)
    duration_seconds: int = Field(..., alias="durationSeconds", ge=0)
    avg_pace: float = Field(..., alias="avgPace", ge=0.0)
    calories: int = Field(default=0, ge=0)
    route: list[HealthConnectRoutePoint] = Field(default_factory=list)


class HealthConnectNutritionRecord(HealthSchema):
    """Canonical nutrition contract projected into DietRecord."""

    external_id: str | None = Field(None, alias="externalId", min_length=1)
    recorded_at: datetime = Field(..., alias="recordedAt")
    calories: float = Field(..., ge=0.0)
    protein: float = Field(default=0.0, ge=0.0)
    carbs: float = Field(default=0.0, ge=0.0)
    fat: float = Field(default=0.0, ge=0.0)
    name: str | None = None


class HealthConnectDailyActivityRecord(HealthSchema):
    """Daily steps/calories contract."""

    external_id: str | None = Field(None, alias="externalId", min_length=1)
    date: date
    steps: int = Field(default=0, ge=0)
    active_calories: float = Field(default=0.0, alias="activeCalories", ge=0.0)
    total_calories: float = Field(default=0.0, alias="totalCalories", ge=0.0)


class HealthConnectHeartRateSample(HealthSchema):
    """Single heart-rate sample."""

    time: datetime
    bpm: int = Field(..., ge=0)


class HealthConnectHeartRateRecord(HealthSchema):
    """Heart-rate sample group contract."""

    external_id: str | None = Field(None, alias="externalId", min_length=1)
    start_time: datetime = Field(..., alias="startTime")
    end_time: datetime = Field(..., alias="endTime")
    samples: list[HealthConnectHeartRateSample] = Field(default_factory=list)


class HealthConnectSyncEnvelope(HealthSchema):
    """Top-level endpoint envelope.

    Groups are intentionally `list[dict]` at the endpoint boundary. The service
    validates each item with the per-record models above so one invalid record
    can become an HTTP 200 `failed` count while valid sibling records persist.
    Non-array groups or an unsupported platform remain top-level envelope
    failures and should return HTTP 422.
    """

    platform: HealthPlatform
    synced_at: datetime = Field(..., alias="syncedAt")
    running: list[dict[str, Any]] = Field(default_factory=list)
    nutrition: list[dict[str, Any]] = Field(default_factory=list)
    daily_activity: list[dict[str, Any]] = Field(default_factory=list, alias="dailyActivity")
    heart_rate: list[dict[str, Any]] = Field(default_factory=list, alias="heartRate")


class HealthConnectSyncContract(HealthSchema):
    """Fully typed contract used by tests/fixtures, not the endpoint boundary."""

    platform: HealthPlatform
    synced_at: datetime = Field(..., alias="syncedAt")
    running: list[HealthConnectRunningRecord] = Field(default_factory=list)
    nutrition: list[HealthConnectNutritionRecord] = Field(default_factory=list)
    daily_activity: list[HealthConnectDailyActivityRecord] = Field(default_factory=list, alias="dailyActivity")
    heart_rate: list[HealthConnectHeartRateRecord] = Field(default_factory=list, alias="heartRate")


class HealthConnectGroupCounts(HealthSchema):
    """Created/skipped/failed counts for one record group."""

    created: int = Field(default=0, ge=0)
    skipped: int = Field(default=0, ge=0)
    failed: int = Field(default=0, ge=0)
    errors: list[str] = Field(default_factory=list)


class HealthConnectSyncResponse(HealthSchema):
    """Canonical grouped sync response."""

    status: HealthSyncStatus
    total: HealthConnectGroupCounts
    groups: dict[str, HealthConnectGroupCounts]


FALLBACK_KEY_POLICY = {
    "primary": "Health Connect metadata.id or clientRecordId when present",
    "fallback": "user_id + record_type + source + stable time window + stable record values",
    "speed": "Speed is adapter-side derivation input only; raw speed samples are not part of the MVP persistence key.",
}
