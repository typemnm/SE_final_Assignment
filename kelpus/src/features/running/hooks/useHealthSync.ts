import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {Platform} from 'react-native';
import type {AppDispatch} from '@store/index';
import {setSyncStatus, setRecords, setLoading} from '../store/runningSlice';
import {runningService} from '../services/runningService';
import {SamsungHealthAdapter} from '../../health/adapters/SamsungHealthAdapter';
import {AppleHealthAdapter} from '../../health/adapters/AppleHealthAdapter';
import type {HealthRunningRecord, GpsPoint} from '@appTypes/health.types';

const getAdapter = () =>
  Platform.OS === 'ios' ? new AppleHealthAdapter() : new SamsungHealthAdapter();

const toGpsCoords = (points: GpsPoint[]) =>
  points.map(p => ({
    lat: p.latitude,
    lng: p.longitude,
    altitude: p.altitude,
    timestamp: p.timestamp,
  }));

const calcAvgPace = (record: HealthRunningRecord): number => {
  if (record.distance <= 0) return 0;
  const durationSec =
    record.durationSeconds ??
    (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000;
  return durationSec / 60 / record.distance;
};

export const useHealthSync = () => {
  const dispatch = useDispatch<AppDispatch>();

  const syncFromHealth = useCallback(
    async (days = 7): Promise<{synced: number; skipped: number; failed: number}> => {
      const adapter = getAdapter();
      dispatch(setSyncStatus({status: 'syncing'}));

      const hasPermission = await adapter.requestPermissions();
      if (!hasPermission) {
        dispatch(setSyncStatus({status: 'error'}));
        return {synced: 0, skipped: 0, failed: 0};
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let records: HealthRunningRecord[] = [];
      try {
        records = await adapter.getRunningRecords(startDate, endDate);
      } catch {
        dispatch(setSyncStatus({status: 'error'}));
        return {synced: 0, skipped: 0, failed: 0};
      }

      let synced = 0;
      let skipped = 0;
      let failed = 0;

      for (const rec of records) {
        if (rec.distance <= 0) {
          skipped++;
          continue;
        }
        try {
          const durationSec =
            rec.durationSeconds ??
            Math.round(
              (new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime()) / 1000,
            );

          const res = await runningService.syncRecord({
            distance: rec.distance,
            avg_pace: calcAvgPace(rec),
            gps_coordinates: toGpsCoords(rec.route ?? []),
            duration_seconds: durationSec,
            calories: rec.calories,
            external_id: rec.externalId || undefined,
            recorded_at: rec.startTime,
          });

          if (res.message?.includes('이미')) {
            skipped++;
          } else {
            synced++;
          }
        } catch {
          failed++;
        }
      }

      // 동기화 후 목록 갱신
      try {
        dispatch(setLoading(true));
        const updated = await runningService.listRecords();
        dispatch(setRecords(updated as any[]));
      } catch {
        // ignore
      } finally {
        dispatch(setLoading(false));
      }

      dispatch(setSyncStatus({status: 'done', time: new Date().toISOString()}));
      return {synced, skipped, failed};
    },
    [dispatch],
  );

  return {syncFromHealth};
};
