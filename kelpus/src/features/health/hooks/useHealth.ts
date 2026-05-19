import {Platform} from 'react-native';
import {useState, useCallback} from 'react';
import type {HealthAdapter} from '../adapters/HealthAdapter';
import {AppleHealthAdapter} from '../adapters/AppleHealthAdapter';
import {SamsungHealthAdapter} from '../adapters/SamsungHealthAdapter';
import {healthApi} from '@api/health.api';

// Android: Health Connect API (Samsung Health 포함)
// iOS:     Apple HealthKit (Mac + Xcode 환경에서만 실제 동작)
const getAdapter = (): HealthAdapter =>
  Platform.OS === 'ios' ? new AppleHealthAdapter() : new SamsungHealthAdapter();

export const useHealth = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const syncHealthData = useCallback(async () => {
    const adapter = getAdapter();
    const hasPermission = await adapter.requestPermissions();
    if (!hasPermission) return;

    setSyncing(true);
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const [dietRecords, runningRecords] = await Promise.all([
        adapter.getDietRecords(startDate, endDate),
        adapter.getRunningRecords(startDate, endDate),
      ]);

      await healthApi.syncHealthData({
        platform: Platform.OS === 'ios' ? 'apple' : 'samsung',
        dietRecords,
        runningRecords,
        syncedAt: new Date().toISOString(),
      });

      setLastSyncTime(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
  }, []);

  return {syncing, lastSyncTime, syncHealthData};
};
