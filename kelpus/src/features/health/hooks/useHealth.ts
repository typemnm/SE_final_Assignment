import {useState, useCallback} from 'react';
import {SdkAvailabilityStatus} from 'react-native-health-connect';
import {HealthConnectAdapter} from '../adapters/HealthConnectAdapter';
import {healthApi} from '@api/health.api';
import type {
  HealthConnectNutritionRecord,
  HealthConnectRunningRecord,
  HealthConnectSyncPayload,
  HealthConnectSyncResponse,
  HealthDietRecord,
  HealthRunningRecord,
} from '@appTypes/health.types';

export type HealthSyncUxStatus =
  | 'idle'
  | 'unavailable'
  | 'update_required'
  | 'denied'
  | 'no_data'
  | 'syncing'
  | 'partial_success'
  | 'success'
  | 'failed'
  | 'error';

export type HealthConnectSyncResult = {
  status: HealthSyncUxStatus;
  response?: HealthConnectSyncResponse;
  payload?: HealthConnectSyncPayload;
  message?: string;
};

export type HealthConnectSyncOptions = {
  days?: number;
  adapter?: HealthConnectAdapter;
  now?: Date;
};

const toRoute = (record: HealthRunningRecord): HealthConnectRunningRecord['route'] =>
  (record.route ?? []).map(point => ({
    lat: point.latitude,
    lng: point.longitude,
    altitude: point.altitude,
    timestamp: point.timestamp,
  }));

export const toHealthConnectRunningRecord = (
  record: HealthRunningRecord,
): HealthConnectRunningRecord => {
  const durationSeconds =
    record.durationSeconds ??
    Math.max(
      0,
      Math.round(
        (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000,
      ),
    );
  const avgPace =
    record.avgPace ?? (record.distance > 0 ? durationSeconds / 60 / record.distance : 0);

  return {
    externalId: record.externalId,
    recordedAt: record.startTime,
    distanceKm: record.distance,
    durationSeconds,
    avgPace,
    calories: record.calories,
    route: toRoute(record),
  };
};

export const toHealthConnectNutritionRecord = (
  record: HealthDietRecord,
): HealthConnectNutritionRecord => ({
  externalId: record.externalId,
  recordedAt: record.date,
  calories: record.calories,
  protein: record.nutrients?.protein ?? 0,
  carbs: record.nutrients?.carbs ?? 0,
  fat: record.nutrients?.fat ?? 0,
  name: record.mealType,
});

export const buildHealthConnectSyncPayload = async ({
  days = 7,
  adapter = new HealthConnectAdapter(),
  now = new Date(),
}: HealthConnectSyncOptions = {}): Promise<HealthConnectSyncPayload> => {
  const endDate = now;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const [dietRecords, runningRecords, dailyActivity, heartRate] = await Promise.all([
    adapter.getDietRecords(startDate, endDate),
    adapter.getRunningRecords(startDate, endDate),
    adapter.getDailyActivityRecords(startDate, endDate),
    adapter.getHeartRateRecords(startDate, endDate),
  ]);

  return {
    platform: 'health_connect',
    syncedAt: now.toISOString(),
    running: runningRecords.map(toHealthConnectRunningRecord),
    nutrition: dietRecords.map(toHealthConnectNutritionRecord),
    dailyActivity,
    heartRate,
  };
};

const totalPayloadRecords = (payload: HealthConnectSyncPayload): number =>
  payload.running.length +
  payload.nutrition.length +
  payload.dailyActivity.length +
  payload.heartRate.length;

export const syncHealthConnectData = async (
  options: HealthConnectSyncOptions = {},
): Promise<HealthConnectSyncResult> => {
  const adapter = options.adapter ?? new HealthConnectAdapter();
  const availability = await adapter.getAvailabilityStatus();

  if (availability === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    return {
      status: 'update_required',
      message: 'Health Connect 업데이트가 필요합니다.',
    };
  }

  if (availability !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return {
      status: 'unavailable',
      message: '이 기기에서 Health Connect를 사용할 수 없습니다.',
    };
  }

  const hasPermission = await adapter.requestPermissions();
  if (!hasPermission) {
    return {status: 'denied', message: 'Health Connect 권한이 필요합니다.'};
  }

  let payload: HealthConnectSyncPayload;
  try {
    payload = await buildHealthConnectSyncPayload({...options, adapter});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health Connect 데이터를 읽지 못했습니다.';
    return {status: 'error', message};
  }

  if (totalPayloadRecords(payload) === 0) {
    return {status: 'no_data', payload, message: '동기화할 Health Connect 데이터가 없습니다.'};
  }

  try {
    const response = await healthApi.syncHealthData(payload);
    return {
      status: response.status,
      response,
      payload,
      message: response.status === 'failed' ? 'Health Connect 기록 동기화에 실패했습니다.' : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health Connect 동기화 API 호출에 실패했습니다.';
    return {status: 'error', payload, message};
  }
};

export const useHealth = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<HealthSyncUxStatus>('idle');
  const [lastResult, setLastResult] = useState<HealthConnectSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncHealthData = useCallback(async (days = 7): Promise<HealthConnectSyncResult> => {
    setSyncing(true);
    setSyncStatus('syncing');
    setErrorMessage(null);

    try {
      const result = await syncHealthConnectData({days});
      setSyncStatus(result.status);
      setLastResult(result);
      if (result.status === 'success' || result.status === 'partial_success') {
        setLastSyncTime(new Date().toISOString());
      }
      if (result.message) {
        setErrorMessage(result.message);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Health Connect 동기화에 실패했습니다.';
      const result = {status: 'error' as const, message};
      setSyncStatus('error');
      setErrorMessage(message);
      setLastResult(result);
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  return {syncing, syncStatus, lastSyncTime, lastResult, errorMessage, syncHealthData};
};
