import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import {Platform} from 'react-native';
import type {HealthAdapter} from './HealthAdapter';
import type {
  GpsPoint,
  HealthConnectDailyActivityRecord,
  HealthConnectHeartRateRecord,
  HealthDietRecord,
  HealthRunningRecord,
} from '@appTypes/health.types';

type HealthConnectLength = {
  value?: number;
  unit?: 'meters' | 'kilometers' | 'miles' | 'inches' | 'feet';
  inMeters?: number;
};

type TimeRangeFilter = {
  operator: 'between';
  startTime: string;
  endTime: string;
};

const RUNNING_EXERCISE_TYPE = 37;

export const HEALTH_CONNECT_ROUTE_READ_PERMISSION = 'android.permission.health.READ_EXERCISE_ROUTES' as const;

export const HEALTH_CONNECT_READ_PERMISSIONS = [
  {accessType: 'read' as const, recordType: 'Nutrition' as const},
  // Runtime Health Connect requests route-capable sessions through ExerciseSession.
  // The route-specific manifest permission is declared separately as
  // READ_EXERCISE_ROUTES because react-native-health-connect does not model
  // ExerciseRoute as a standalone recordType permission.
  {accessType: 'read' as const, recordType: 'ExerciseSession' as const},
  {accessType: 'read' as const, recordType: 'Distance' as const},
  {accessType: 'read' as const, recordType: 'TotalCaloriesBurned' as const},
  {accessType: 'read' as const, recordType: 'Speed' as const},
  {accessType: 'read' as const, recordType: 'Steps' as const},
  {accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const},
  {accessType: 'read' as const, recordType: 'HeartRate' as const},
];

type HealthConnectPermission = (typeof HEALTH_CONNECT_READ_PERMISSIONS)[number];

const permissionKey = (permission: {accessType: string; recordType: string}): string =>
  `${permission.accessType}:${permission.recordType}`;

const GRANTED_PERMISSION_ALIASES: Partial<Record<HealthConnectPermission['recordType'], string[]>> = {
  // react-native-health-connect maps ExerciseSessionRecord to Android's
  // android.permission.health.READ_EXERCISE permission, then maps the granted
  // permission string back to recordType "Exercise". Treat that as the granted
  // form of the ExerciseSession runtime request; otherwise the app reports
  // "권한 필요" even after the user grants the Exercise permission.
  ExerciseSession: ['read:Exercise'],
};

const isGrantedPermission = (
  requested: HealthConnectPermission,
  grantedKeys: Set<string>,
): boolean => {
  const requestedKey = permissionKey(requested);
  if (grantedKeys.has(requestedKey)) return true;
  return (GRANTED_PERMISSION_ALIASES[requested.recordType] ?? []).some(alias =>
    grantedKeys.has(alias),
  );
};

const toTimeRangeFilter = (startDate: Date, endDate: Date): TimeRangeFilter => ({
  operator: 'between',
  startTime: startDate.toISOString(),
  endTime: endDate.toISOString(),
});

const toMeters = (length?: HealthConnectLength): number | undefined => {
  if (!length) return undefined;
  if (typeof length.inMeters === 'number') return length.inMeters;
  const value = length.value ?? 0;
  switch (length.unit) {
    case 'meters':
      return value;
    case 'kilometers':
      return value * 1000;
    case 'miles':
      return value * 1609.344;
    case 'feet':
      return value * 0.3048;
    case 'inches':
      return value * 0.0254;
    default:
      return undefined;
  }
};

const metadataId = (record: any): string | undefined =>
  record?.metadata?.id ?? record?.metadata?.clientRecordId;

const readFailure = (group: string, error: unknown): Error => {
  const detail = error instanceof Error ? error.message : 'unknown native read error';
  return new Error(`Health Connect ${group} records read failed: ${detail}`);
};

const toCalories = (energy?: {inKilocalories?: number; value?: number; unit?: string}): number => {
  if (!energy) return 0;
  if (typeof energy.inKilocalories === 'number') return energy.inKilocalories;
  if (energy.unit === 'kilocalories') return energy.value ?? 0;
  if (energy.unit === 'calories') return (energy.value ?? 0) / 1000;
  return energy.value ?? 0;
};

const isWithin = (record: {startTime?: string; endTime?: string; time?: string}, startMs: number, endMs: number): boolean => {
  const recordStart = new Date(record.startTime ?? record.time ?? 0).getTime();
  const recordEnd = new Date(record.endTime ?? record.time ?? record.startTime ?? 0).getTime();
  return recordStart <= endMs && recordEnd >= startMs;
};

const average = (values: number[]): number | undefined => {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const speedMetersPerSecond = (sample: any): number | undefined => {
  const speed = sample?.speed;
  if (!speed) return undefined;
  if (typeof speed.inMetersPerSecond === 'number') return speed.inMetersPerSecond;
  if (speed.unit === 'metersPerSecond') return speed.value ?? 0;
  if (speed.unit === 'kilometersPerHour') return (speed.value ?? 0) / 3.6;
  if (speed.unit === 'milesPerHour') return (speed.value ?? 0) * 0.44704;
  return undefined;
};

const deriveAvgPaceFromSpeed = (speedRecords: any[], startMs: number, endMs: number): number | undefined => {
  const speeds = speedRecords
    .filter(record => isWithin(record, startMs, endMs))
    .flatMap(record => record.samples ?? [])
    .map(speedMetersPerSecond)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  const avgMetersPerSecond = average(speeds);
  if (!avgMetersPerSecond) return undefined;
  return 1000 / avgMetersPerSecond / 60;
};

const dateOnly = (isoTime: string): string => isoTime.slice(0, 10);

// Android Health Connect API boundary.
// Samsung Health may be a data origin, but Kelpus Android sync talks to Health Connect.
export class HealthConnectAdapter implements HealthAdapter {
  async getAvailabilityStatus(): Promise<number> {
    if (Platform.OS !== 'android') return SdkAvailabilityStatus.SDK_UNAVAILABLE;
    try {
      return await getSdkStatus();
    } catch {
      return SdkAvailabilityStatus.SDK_UNAVAILABLE;
    }
  }

  isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const sdkStatus = await this.getAvailabilityStatus();
      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;

      const isInitialized = await initialize();
      if (!isInitialized) return false;

      const granted = await requestPermission(HEALTH_CONNECT_READ_PERMISSIONS);
      const grantedKeys = new Set(granted.map(permissionKey));
      return HEALTH_CONNECT_READ_PERMISSIONS.every(permission => isGrantedPermission(permission, grantedKeys));
    } catch {
      return false;
    }
  }

  async getDietRecords(startDate: Date, endDate: Date): Promise<HealthDietRecord[]> {
    try {
      const {records} = await readRecords('Nutrition', {
        timeRangeFilter: toTimeRangeFilter(startDate, endDate),
      });

      return records.map(record => ({
        externalId: metadataId(record),
        date: record.startTime,
        mealType: String(record.mealType ?? 'unknown'),
        calories: toCalories(record.energy),
        nutrients: {
          protein: record.protein?.inGrams ?? 0,
          carbs: record.totalCarbohydrate?.inGrams ?? 0,
          fat: record.totalFat?.inGrams ?? 0,
        },
      }));
    } catch (error) {
      throw readFailure('nutrition', error);
    }
  }

  async getRunningRecords(startDate: Date, endDate: Date): Promise<HealthRunningRecord[]> {
    try {
      const timeRangeFilter = toTimeRangeFilter(startDate, endDate);

      const [
        {records: exercises},
        {records: distanceRecords},
        {records: calorieRecords},
        {records: speedRecords},
      ] = await Promise.all([
        readRecords('ExerciseSession', {timeRangeFilter}),
        readRecords('Distance', {timeRangeFilter}),
        readRecords('TotalCaloriesBurned', {timeRangeFilter}),
        readRecords('Speed', {timeRangeFilter}),
      ]);

      return exercises
        .filter(exercise => exercise.exerciseType === RUNNING_EXERCISE_TYPE)
        .map(exercise => {
          const startMs = new Date(exercise.startTime).getTime();
          const endMs = new Date(exercise.endTime).getTime();
          const totalDistanceM = distanceRecords
            .filter(record => isWithin(record, startMs, endMs))
            .reduce((sum, record) => sum + (record.distance?.inMeters ?? 0), 0);
          const totalCalories = calorieRecords
            .filter(record => isWithin(record, startMs, endMs))
            .reduce((sum, record) => sum + toCalories(record.energy), 0);
          const route: GpsPoint[] = (exercise.exerciseRoute?.route ?? []).map(location => ({
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: toMeters(location.altitude as HealthConnectLength | undefined),
            timestamp: location.time,
          }));
          const durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
          const distanceKm = totalDistanceM / 1000;
          const speedDerivedPace = deriveAvgPaceFromSpeed(speedRecords, startMs, endMs);
          const durationDerivedPace = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;

          return {
            externalId: metadataId(exercise),
            startTime: exercise.startTime,
            endTime: exercise.endTime,
            distance: distanceKm,
            calories: Math.round(totalCalories),
            durationSeconds,
            avgPace: speedDerivedPace ?? durationDerivedPace,
            route,
          };
        });
    } catch (error) {
      throw readFailure('running', error);
    }
  }

  async getDailyActivityRecords(
    startDate: Date,
    endDate: Date,
  ): Promise<HealthConnectDailyActivityRecord[]> {
    try {
      const timeRangeFilter = toTimeRangeFilter(startDate, endDate);
      const [{records: stepsRecords}, {records: activeCaloriesRecords}, {records: totalCaloriesRecords}] =
        await Promise.all([
          readRecords('Steps', {timeRangeFilter}),
          readRecords('ActiveCaloriesBurned', {timeRangeFilter}),
          readRecords('TotalCaloriesBurned', {timeRangeFilter}),
        ]);

      const byDate = new Map<string, HealthConnectDailyActivityRecord>();
      const ensureDate = (isoTime: string): HealthConnectDailyActivityRecord => {
        const date = dateOnly(isoTime);
        const existing = byDate.get(date);
        if (existing) return existing;
        const created = {
          externalId: `health-connect-day-${date}`,
          date,
          steps: 0,
          activeCalories: 0,
          totalCalories: 0,
        };
        byDate.set(date, created);
        return created;
      };

      stepsRecords.forEach(record => {
        ensureDate(record.startTime).steps += record.count ?? 0;
      });
      activeCaloriesRecords.forEach(record => {
        ensureDate(record.startTime).activeCalories += toCalories(record.energy);
      });
      totalCaloriesRecords.forEach(record => {
        ensureDate(record.startTime).totalCalories += toCalories(record.energy);
      });

      return Array.from(byDate.values()).map(record => ({
        ...record,
        steps: Math.round(record.steps),
        activeCalories: Math.round(record.activeCalories),
        totalCalories: Math.round(record.totalCalories),
      }));
    } catch (error) {
      throw readFailure('daily activity', error);
    }
  }

  async getHeartRateRecords(startDate: Date, endDate: Date): Promise<HealthConnectHeartRateRecord[]> {
    try {
      const {records} = await readRecords('HeartRate', {
        timeRangeFilter: toTimeRangeFilter(startDate, endDate),
      });

      return records.map(record => ({
        externalId: metadataId(record),
        startTime: record.startTime,
        endTime: record.endTime,
        samples: (record.samples ?? []).map(sample => ({
          time: sample.time,
          bpm: sample.beatsPerMinute,
        })),
      }));
    } catch (error) {
      throw readFailure('heart-rate', error);
    }
  }
}
