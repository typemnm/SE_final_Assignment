import {Platform} from 'react-native';
import type {HealthAdapter} from './HealthAdapter';
import type {
  HealthConnectDailyActivityRecord,
  HealthConnectHeartRateRecord,
  HealthDietRecord,
  HealthRunningRecord,
} from '@appTypes/health.types';

// react-native-health는 iOS 네이티브 빌드(EAS Build / Xcode)에서만 동작합니다.
// 개발 중 웹/Android에서 import 오류를 방지하기 위해 동적 require를 사용합니다.
const loadAppleHealth = (): any | null => {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-health');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
};

const MEAL_TYPE_MAP: Record<number, string> = {
  1: 'breakfast',
  2: 'lunch',
  3: 'dinner',
  4: 'snack',
};

export class AppleHealthAdapter implements HealthAdapter {
  isAvailable(): boolean {
    return Platform.OS === 'ios';
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    const AppleHealth = loadAppleHealth();
    if (!AppleHealth) return false;

    const {Permissions} = AppleHealth;
    const permissions = {
      permissions: {
        read: [
          Permissions.ActiveEnergyBurned,
          Permissions.Workout,
          Permissions.DistanceWalkingRunning,
          Permissions.DietaryEnergyConsumed,
          Permissions.DietaryProtein,
          Permissions.DietaryCarbohydrates,
          Permissions.DietaryFatTotal,
        ],
        write: [],
      },
    };

    return new Promise(resolve => {
      AppleHealth.initHealthKit(permissions, (err: any) => {
        resolve(!err);
      });
    });
  }

  async getDietRecords(startDate: Date, endDate: Date): Promise<HealthDietRecord[]> {
    if (Platform.OS !== 'ios') return [];
    const AppleHealth = loadAppleHealth();
    if (!AppleHealth) return [];

    const options = {startDate: startDate.toISOString(), endDate: endDate.toISOString()};

    const [energyRecords] = await Promise.all([
      new Promise<any[]>(resolve =>
        AppleHealth.getDietaryEnergyConsumedSamples(options, (_err: any, res: any[]) =>
          resolve(res ?? []),
        ),
      ),
    ]);

    return energyRecords.map(r => ({
      externalId: `apple-diet-${r.start ?? r.startDate}`,
      date: r.start ?? r.startDate,
      mealType: MEAL_TYPE_MAP[r.metadata?.HKFoodType] ?? 'unknown',
      calories: r.value ?? 0,
      nutrients: {},
    }));
  }

  async getRunningRecords(startDate: Date, endDate: Date): Promise<HealthRunningRecord[]> {
    if (Platform.OS !== 'ios') return [];
    const AppleHealth = loadAppleHealth();
    if (!AppleHealth) return [];

    const {HKWorkoutActivityTypeRunning} = AppleHealth;
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: HKWorkoutActivityTypeRunning,
      ascending: false,
      limit: 100,
    };

    const workouts: any[] = await new Promise(resolve =>
      AppleHealth.getSamples(options, (_err: any, res: any[]) => resolve(res ?? [])),
    );

    return workouts.map(w => {
      const startMs = new Date(w.start ?? w.startDate).getTime();
      const endMs = new Date(w.end ?? w.endDate).getTime();
      const durationSec = Math.round((endMs - startMs) / 1000);
      const distanceKm = (w.distance ?? 0) / 1000;

      return {
        externalId: `apple-workout-${w.start ?? w.startDate}`,
        startTime: w.start ?? w.startDate,
        endTime: w.end ?? w.endDate,
        distance: distanceKm,
        calories: Math.round(w.calories ?? 0),
        durationSeconds: durationSec,
        route: [],
      };
    });
  }

  async getDailyActivityRecords(
    _startDate: Date,
    _endDate: Date,
  ): Promise<HealthConnectDailyActivityRecord[]> {
    return [];
  }

  async getHeartRateRecords(
    _startDate: Date,
    _endDate: Date,
  ): Promise<HealthConnectHeartRateRecord[]> {
    return [];
  }

}
