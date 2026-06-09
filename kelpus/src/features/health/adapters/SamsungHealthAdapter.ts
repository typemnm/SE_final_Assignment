import {initialize, requestPermission, readRecords} from 'react-native-health-connect';
import type {HealthAdapter} from './HealthAdapter';
import type {HealthDietRecord, HealthRunningRecord, GpsPoint} from '@appTypes/health.types';

type HealthConnectLength = {
  value: number;
  unit: 'meters' | 'kilometers' | 'miles' | 'inches' | 'feet';
};

const toMeters = (length?: HealthConnectLength): number | undefined => {
  if (!length) return undefined;
  switch (length.unit) {
    case 'meters': return length.value;
    case 'kilometers': return length.value * 1000;
    case 'miles': return length.value * 1609.344;
    case 'feet': return length.value * 0.3048;
    case 'inches': return length.value * 0.0254;
  }
};

// Android Health Connect API 기반 어댑터.
// Samsung Health는 Android 14+에서 Health Connect와 자동 연동됩니다.
// Android 9~13에서는 Play Store의 'Health Connect' 앱 설치 필요.
export class SamsungHealthAdapter implements HealthAdapter {
  isAvailable(): boolean {
    return true;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const isInitialized = await initialize();
      if (!isInitialized) return false;

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
      const timeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };

      const [{records: exercises}, {records: distRecords}, {records: calRecords}] =
        await Promise.all([
          readRecords('ExerciseSession', {timeRangeFilter: timeFilter}),
          readRecords('Distance', {timeRangeFilter: timeFilter}),
          readRecords('TotalCaloriesBurned', {timeRangeFilter: timeFilter}),
        ]);

      // exerciseType 37 = RUNNING
      const runningExercises = exercises.filter(r => r.exerciseType === 37);

      return runningExercises.map(exercise => {
        const exStart = new Date(exercise.startTime).getTime();
        const exEnd = new Date(exercise.endTime).getTime();

        // 세션 시간 범위 안에 속하는 Distance 레코드 합산 (meters)
        const totalDistanceM = distRecords
          .filter(d => {
            const t = new Date(d.startTime).getTime();
            return t >= exStart && t <= exEnd;
          })
          .reduce((sum, d) => sum + ((d.distance as any)?.inMeters ?? 0), 0);

        // 세션 시간 범위 안에 속하는 Calories 레코드 합산 (kcal)
        const totalCalories = calRecords
          .filter(c => {
            const t = new Date(c.startTime).getTime();
            return t >= exStart && t <= exEnd;
          })
          .reduce((sum, c) => sum + ((c.energy as any)?.inKilocalories ?? 0), 0);

        const route: GpsPoint[] = (exercise.exerciseRoute?.route ?? []).map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          altitude: toMeters(loc.altitude as HealthConnectLength | undefined),
          timestamp: loc.time,
        }));

        const durationMs = exEnd - exStart;
        const durationSec = Math.round(durationMs / 1000);
        const distanceKm = totalDistanceM / 1000;

        return {
          externalId: exercise.metadata?.id ?? '',
          startTime: exercise.startTime,
          endTime: exercise.endTime,
          distance: distanceKm,
          calories: Math.round(totalCalories),
          durationSeconds: durationSec,
          route,
        };
      });
    } catch {
      return [];
    }
  }
}
