"""Health Connect grouped sync service."""

from __future__ import annotations

import hashlib
import json
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.diet.models import DataSourceEnum, DietRecord
from app.domains.health.models import HealthDailyActivityRecord, HealthHeartRateRecord
from app.domains.health.schemas import (
    HealthConnectDailyActivityRecord,
    HealthConnectGroupCounts,
    HealthConnectHeartRateRecord,
    HealthConnectNutritionRecord,
    HealthConnectRunningRecord,
    HealthConnectSyncEnvelope,
    HealthConnectSyncResponse,
)
from app.domains.running.schemas import RunningSyncRequest
from app.domains.running.service import sync_running_record

GROUP_KEYS = ("running", "nutrition", "dailyActivity", "heartRate")


@dataclass
class _MutableCounts:
    created: int = 0
    skipped: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)

    def to_schema(self) -> HealthConnectGroupCounts:
        return HealthConnectGroupCounts(
            created=self.created,
            skipped=self.skipped,
            failed=self.failed,
            errors=list(self.errors),
        )


def _stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def build_fallback_external_id(
    user_id: str | uuid.UUID,
    record_type: str,
    payload: dict[str, Any],
) -> str:
    """Build a deterministic fallback key for records without Health metadata IDs."""

    source = "health_connect"
    stable_parts = {
        "user_id": str(user_id),
        "record_type": record_type,
        "source": source,
        "time": payload.get("recordedAt")
        or payload.get("startTime")
        or payload.get("date")
        or payload.get("endTime"),
        "values": payload,
    }
    digest = hashlib.sha256(_stable_json(stable_parts).encode("utf-8")).hexdigest()[:32]
    return f"hc:{record_type}:{digest}"


def _external_id(
    user_id: str | uuid.UUID,
    record_type: str,
    raw: dict[str, Any],
    parsed: BaseModel,
) -> str:
    explicit = getattr(parsed, "external_id", None) or raw.get("clientRecordId")
    if explicit:
        return str(explicit)
    metadata = raw.get("metadata")
    if isinstance(metadata, dict):
        metadata_id = metadata.get("id") or metadata.get("clientRecordId")
        if metadata_id:
            return str(metadata_id)
    return build_fallback_external_id(user_id, record_type, raw)


@asynccontextmanager
async def _record_unit(db: AsyncSession):
    """Rollback-safe per-record unit under the request-scoped DB session."""

    async with db.begin_nested():
        yield


def _empty_counts() -> dict[str, _MutableCounts]:
    return {key: _MutableCounts() for key in GROUP_KEYS}


def _response(counts: dict[str, _MutableCounts]) -> HealthConnectSyncResponse:
    total = _MutableCounts(
        created=sum(item.created for item in counts.values()),
        skipped=sum(item.skipped for item in counts.values()),
        failed=sum(item.failed for item in counts.values()),
    )
    if total.failed and (total.created or total.skipped):
        status = "partial_success"
    elif total.failed:
        status = "failed"
    else:
        status = "success"
    return HealthConnectSyncResponse(
        status=status,
        total=total.to_schema(),
        groups={key: value.to_schema() for key, value in counts.items()},
    )


def _validation_error(group: str, index: int, exc: ValidationError) -> str:
    first = exc.errors()[0] if exc.errors() else {"loc": (), "msg": str(exc)}
    loc = ".".join(str(part) for part in first.get("loc", ()))
    suffix = f".{loc}" if loc else ""
    return f"{group}[{index}]{suffix}: {first.get('msg', str(exc))}"


async def _process_group(
    *,
    group: str,
    raw_records: list[dict[str, Any]],
    schema: type[BaseModel],
    user_id: str,
    db: AsyncSession,
    handler: Callable[[str, dict[str, Any], BaseModel, AsyncSession], Awaitable[bool]],
    counts: _MutableCounts,
) -> None:
    for index, raw in enumerate(raw_records):
        try:
            parsed = schema.model_validate(raw)
        except ValidationError as exc:
            counts.failed += 1
            counts.errors.append(_validation_error(group, index, exc))
            continue

        try:
            created = await handler(user_id, raw, parsed, db)
            if created:
                counts.created += 1
            else:
                counts.skipped += 1
        except Exception as exc:  # noqa: BLE001 - record-level failures become counts
            counts.failed += 1
            counts.errors.append(f"{group}[{index}]: {exc}")


async def _sync_running(
    user_id: str,
    raw: dict[str, Any],
    parsed: HealthConnectRunningRecord,
    db: AsyncSession,
) -> bool:
    external_id = _external_id(user_id, "running", raw, parsed)
    req = RunningSyncRequest(
        distance=parsed.distance_km,
        avg_pace=parsed.avg_pace,
        gps_coordinates=[point.model_dump(mode="json") for point in parsed.route],
        duration_seconds=parsed.duration_seconds,
        calories=parsed.calories,
        external_id=external_id,
        recorded_at=parsed.recorded_at,
    )
    async with _record_unit(db):
        response = await sync_running_record(user_id, req, db)
    return response.created


async def _sync_nutrition(
    user_id: str,
    raw: dict[str, Any],
    parsed: HealthConnectNutritionRecord,
    db: AsyncSession,
) -> bool:
    user_uuid = uuid.UUID(str(user_id))
    external_id = _external_id(user_id, "nutrition", raw, parsed)
    result = await db.execute(
        select(DietRecord).where(
            DietRecord.user_id == user_uuid,
            DietRecord.data_source == DataSourceEnum.health_connect,
            DietRecord.external_id == external_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        return False

    async with _record_unit(db):
        record = DietRecord(
            user_id=user_uuid,
            data_source=DataSourceEnum.health_connect,
            recorded_at=parsed.recorded_at,
        )
        record.map_health_connect_nutrition(
            {
                "calories": parsed.calories,
                "carbs": parsed.carbs,
                "protein": parsed.protein,
                "fat": parsed.fat,
                "name": parsed.name,
            },
            external_id=external_id,
        )
        db.add(record)
        await db.flush()
    return True


async def _sync_daily_activity(
    user_id: str,
    raw: dict[str, Any],
    parsed: HealthConnectDailyActivityRecord,
    db: AsyncSession,
) -> bool:
    user_uuid = uuid.UUID(str(user_id))
    external_id = _external_id(user_id, "dailyActivity", raw, parsed)
    result = await db.execute(
        select(HealthDailyActivityRecord).where(
            HealthDailyActivityRecord.user_id == user_uuid,
            HealthDailyActivityRecord.external_id == external_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        return False

    async with _record_unit(db):
        db.add(
            HealthDailyActivityRecord(
                user_id=user_uuid,
                external_id=external_id,
                activity_date=parsed.date,
                steps=parsed.steps,
                active_calories=parsed.active_calories,
                total_calories=parsed.total_calories,
                raw_data=raw,
            )
        )
        await db.flush()
    return True


async def _sync_heart_rate(
    user_id: str,
    raw: dict[str, Any],
    parsed: HealthConnectHeartRateRecord,
    db: AsyncSession,
) -> bool:
    user_uuid = uuid.UUID(str(user_id))
    external_id = _external_id(user_id, "heartRate", raw, parsed)
    result = await db.execute(
        select(HealthHeartRateRecord).where(
            HealthHeartRateRecord.user_id == user_uuid,
            HealthHeartRateRecord.external_id == external_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        return False

    async with _record_unit(db):
        db.add(
            HealthHeartRateRecord(
                user_id=user_uuid,
                external_id=external_id,
                start_time=parsed.start_time,
                end_time=parsed.end_time,
                samples=[sample.model_dump(mode="json") for sample in parsed.samples],
                recorded_at=datetime.now(timezone.utc),
                raw_data=raw,
            )
        )
        await db.flush()
    return True


async def sync_health_data(
    user_id: str,
    envelope: HealthConnectSyncEnvelope,
    db: AsyncSession,
) -> HealthConnectSyncResponse:
    """Synchronize grouped Health Connect records with per-record failure counts."""

    counts = _empty_counts()
    await _process_group(
        group="running",
        raw_records=envelope.running,
        schema=HealthConnectRunningRecord,
        user_id=user_id,
        db=db,
        handler=_sync_running,
        counts=counts["running"],
    )
    await _process_group(
        group="nutrition",
        raw_records=envelope.nutrition,
        schema=HealthConnectNutritionRecord,
        user_id=user_id,
        db=db,
        handler=_sync_nutrition,
        counts=counts["nutrition"],
    )
    await _process_group(
        group="dailyActivity",
        raw_records=envelope.daily_activity,
        schema=HealthConnectDailyActivityRecord,
        user_id=user_id,
        db=db,
        handler=_sync_daily_activity,
        counts=counts["dailyActivity"],
    )
    await _process_group(
        group="heartRate",
        raw_records=envelope.heart_rate,
        schema=HealthConnectHeartRateRecord,
        user_id=user_id,
        db=db,
        handler=_sync_heart_rate,
        counts=counts["heartRate"],
    )
    return _response(counts)
