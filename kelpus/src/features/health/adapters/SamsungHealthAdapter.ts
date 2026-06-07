import {initialize, requestPermission, readRecords} from 'react-native-health-connect';
import type {HealthAdapter} from './HealthAdapter';
import type {HealthDietRecord, HealthRunningRecord, GpsPoint} from '@appTypes/health.types';

type HealthConnectLength = {
  value: number;
  unit: 'meters' | 'kilometers' | 'miles' | 'inches' | 'feet';
};

const toMeters = (length?: HealthConnectLength): number | undefined => {
  if (!length) {
    return undefined;
  }

  switch (length.unit) {
    case 'meters':
      return length.value;
    case 'kilometers':
      return length.value * 1000;
    case 'miles':
      return length.value * 1609.344;
    case 'feet':
      return length.value * 0.3048;
    case 'inches':
      return length.value * 0.0254;
  }
};

// Android Health Connect API 기반 어댑터
// Samsung Health는 Android 14+에서 Health Connect와 자동 연동됩니다.
// Android 9~13에서는 Play Store의 'Health Connect' 앱 설치 필요.
export class SamsungHealthAdapter implements HealthAdapter {
  isAvailable(): boolean {
    return true;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const isInitialized = await initialize();
      if (!isInitialized) {
        return false;
      }

      const granted = await requestPermission([
        {accessType: 'read', recordType: 'Nutrition'},
        {accessType: 'read', recordType: 'ExerciseSession'},
        {accessType: 'read', recordType: 'Distance'},
        {accessType: 'read', recordType: 'TotalCaloriesBurned'},
        {accessType: 'read', recordType: 'Speed'},
      ]);

      return granted.length > 0;
    } catch {
      return false;
    }
  }

  async getDietRecords(startDate: Date, endDate: Date): Promise<HealthDietRecord[]> {
    try {
      const {records} = await readRecords('Nutrition', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return records.map(r => ({
        externalId: r.metadata?.id ?? '',
        date: r.startTime,
        mealType: String(r.mealType ?? 'unknown'),
        calories: r.energy?.inKilocalories ?? 0,
        nutrients: {
          protein: r.protein?.inGrams ?? 0,
          carbs: r.totalCarbohydrate?.inGrams ?? 0,
          fat: r.totalFat?.inGrams ?? 0,
        },
      }));
    } catch {
      return [];
    }
  }

  async getRunningRecords(startDate: Date, endDate: Date): Promise<HealthRunningRecord[]> {
    try {
      const {records} = await readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      // exerciseType 37 = RUNNING
      const runningRecords = records.filter(r => r.exerciseType === 37);

      return runningRecords.map(r => {
        const route: GpsPoint[] = (r.exerciseRoute?.route ?? []).map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          altitude: toMeters(loc.altitude),
          timestamp: loc.time,
        }));

        return {
          externalId: r.metadata?.id ?? '',
          startTime: r.startTime,
          endTime: r.endTime,
          distance: 0,
          calories: 0,
          route,
        };
      });
    } catch {
      return [];
    }
  }
}
