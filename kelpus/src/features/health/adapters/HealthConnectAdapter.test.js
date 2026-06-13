jest.mock('react-native', () => ({
  Platform: {OS: 'android'},
}));

jest.mock('react-native-health-connect', () => ({
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  requestPermission: jest.fn(),
  readRecords: jest.fn(),
  SdkAvailabilityStatus: {
    SDK_AVAILABLE: 3,
    SDK_UNAVAILABLE: 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
  },
}));

import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';
import {
  HEALTH_CONNECT_ROUTE_READ_PERMISSION,
  HEALTH_CONNECT_READ_PERMISSIONS,
  HealthConnectAdapter,
} from './HealthConnectAdapter';

const startDate = new Date('2026-06-10T00:00:00Z');
const endDate = new Date('2026-06-11T00:00:00Z');

const mockRecords = records => Promise.resolve({records});

describe('HealthConnectAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSdkStatus.mockResolvedValue(3);
    initialize.mockResolvedValue(true);
    requestPermission.mockImplementation(async permissions => permissions);
    readRecords.mockReset();
  });

  it('requests only the selected MVP read permissions', async () => {
    const adapter = new HealthConnectAdapter();

    await expect(adapter.requestPermissions()).resolves.toBe(true);

    expect(requestPermission).toHaveBeenCalledWith(HEALTH_CONNECT_READ_PERMISSIONS);
    const requestedTypes = HEALTH_CONNECT_READ_PERMISSIONS.map(permission => permission.recordType);
    expect(requestedTypes).toEqual([
      'Nutrition',
      'ExerciseSession',
      'Distance',
      'TotalCaloriesBurned',
      'Speed',
      'Steps',
      'ActiveCaloriesBurned',
      'HeartRate',
    ]);
    expect(requestedTypes).not.toContain('SleepSession');
    expect(HEALTH_CONNECT_ROUTE_READ_PERMISSION).toBe('android.permission.health.READ_EXERCISE_ROUTES');
    expect(HEALTH_CONNECT_READ_PERMISSIONS.every(permission => permission.accessType === 'read')).toBe(true);
  });

  it('accepts Android READ_EXERCISE returned as Exercise for the ExerciseSession request', async () => {
    requestPermission.mockResolvedValueOnce(
      HEALTH_CONNECT_READ_PERMISSIONS.map(permission =>
        permission.recordType === 'ExerciseSession'
          ? {accessType: 'read', recordType: 'Exercise'}
          : permission,
      ),
    );

    await expect(new HealthConnectAdapter().requestPermissions()).resolves.toBe(true);
  });

  it('returns false when one selected MVP permission is still missing', async () => {
    requestPermission.mockResolvedValueOnce(
      HEALTH_CONNECT_READ_PERMISSIONS.filter(permission => permission.recordType !== 'HeartRate'),
    );

    await expect(new HealthConnectAdapter().requestPermissions()).resolves.toBe(false);
  });

  it('returns false when Health Connect is unavailable', async () => {
    getSdkStatus.mockResolvedValue(2);

    const adapter = new HealthConnectAdapter();

    await expect(adapter.requestPermissions()).resolves.toBe(false);
    expect(initialize).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('maps nutrition records and defaults missing macros to zero', async () => {
    readRecords.mockResolvedValueOnce({
      records: [
        {
          metadata: {clientRecordId: 'nutrition-client-1'},
          startTime: '2026-06-10T12:00:00Z',
          mealType: 2,
          energy: {inKilocalories: 650},
        },
      ],
    });

    const records = await new HealthConnectAdapter().getDietRecords(startDate, endDate);

    expect(records).toEqual([
      {
        externalId: 'nutrition-client-1',
        date: '2026-06-10T12:00:00Z',
        mealType: '2',
        calories: 650,
        nutrients: {protein: 0, carbs: 0, fat: 0},
      },
    ]);
  });

  it('leaves metadata-less record IDs unset so the backend deterministic fallback owns dedupe', async () => {
    readRecords.mockResolvedValueOnce({
      records: [
        {
          startTime: '2026-06-10T12:00:00Z',
          mealType: 2,
          energy: {inKilocalories: 650},
        },
      ],
    });

    const records = await new HealthConnectAdapter().getDietRecords(startDate, endDate);

    expect(records[0].externalId).toBeUndefined();
  });

  it('maps running route/calories/distance and uses Speed to derive pace', async () => {
    readRecords.mockImplementation(recordType => {
      if (recordType === 'ExerciseSession') {
        return mockRecords([
          {
            metadata: {id: 'run-1'},
            exerciseType: 37,
            startTime: '2026-06-10T09:00:00Z',
            endTime: '2026-06-10T09:30:00Z',
            exerciseRoute: {
              route: [
                {
                  latitude: 37.1,
                  longitude: 127.1,
                  altitude: {inMeters: 12},
                  time: '2026-06-10T09:01:00Z',
                },
              ],
            },
          },
        ]);
      }
      if (recordType === 'Distance') {
        return mockRecords([
          {startTime: '2026-06-10T09:00:00Z', endTime: '2026-06-10T09:30:00Z', distance: {inMeters: 6000}},
        ]);
      }
      if (recordType === 'TotalCaloriesBurned') {
        return mockRecords([
          {startTime: '2026-06-10T09:00:00Z', endTime: '2026-06-10T09:30:00Z', energy: {inKilocalories: 300}},
        ]);
      }
      if (recordType === 'Speed') {
        return mockRecords([
          {
            startTime: '2026-06-10T09:00:00Z',
            endTime: '2026-06-10T09:30:00Z',
            samples: [
              {time: '2026-06-10T09:05:00Z', speed: {inMetersPerSecond: 2}},
              {time: '2026-06-10T09:10:00Z', speed: {inMetersPerSecond: 4}},
            ],
          },
        ]);
      }
      return mockRecords([]);
    });

    const records = await new HealthConnectAdapter().getRunningRecords(startDate, endDate);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      externalId: 'run-1',
      distance: 6,
      calories: 300,
      durationSeconds: 1800,
      route: [{latitude: 37.1, longitude: 127.1, altitude: 12, timestamp: '2026-06-10T09:01:00Z'}],
    });
    expect(records[0].avgPace).toBeCloseTo(5.56, 2);
  });

  it('maps running sessions with missing route to an empty route', async () => {
    readRecords.mockImplementation(recordType => {
      if (recordType === 'ExerciseSession') {
        return mockRecords([
          {
            metadata: {id: 'run-no-route'},
            exerciseType: 37,
            startTime: '2026-06-10T09:00:00Z',
            endTime: '2026-06-10T09:20:00Z',
          },
        ]);
      }
      if (recordType === 'Distance') {
        return mockRecords([
          {startTime: '2026-06-10T09:00:00Z', endTime: '2026-06-10T09:20:00Z', distance: {inMeters: 4000}},
        ]);
      }
      return mockRecords([]);
    });

    const records = await new HealthConnectAdapter().getRunningRecords(startDate, endDate);

    expect(records[0].route).toEqual([]);
    expect(records[0].avgPace).toBe(5);
  });

  it('maps steps and calorie records into daily activity summaries', async () => {
    readRecords.mockImplementation(recordType => {
      if (recordType === 'Steps') {
        return mockRecords([{startTime: '2026-06-10T08:00:00Z', count: 9000}]);
      }
      if (recordType === 'ActiveCaloriesBurned') {
        return mockRecords([{startTime: '2026-06-10T08:00:00Z', energy: {inKilocalories: 410}}]);
      }
      if (recordType === 'TotalCaloriesBurned') {
        return mockRecords([{startTime: '2026-06-10T08:00:00Z', energy: {inKilocalories: 2200}}]);
      }
      return mockRecords([]);
    });

    const records = await new HealthConnectAdapter().getDailyActivityRecords(startDate, endDate);

    expect(records).toEqual([
      {
        externalId: 'health-connect-day-2026-06-10',
        date: '2026-06-10',
        steps: 9000,
        activeCalories: 410,
        totalCalories: 2200,
      },
    ]);
  });

  it('maps heart-rate samples', async () => {
    readRecords.mockResolvedValueOnce({
      records: [
        {
          metadata: {id: 'hr-1'},
          startTime: '2026-06-10T09:00:00Z',
          endTime: '2026-06-10T09:30:00Z',
          samples: [{time: '2026-06-10T09:01:00Z', beatsPerMinute: 132}],
        },
      ],
    });

    const records = await new HealthConnectAdapter().getHeartRateRecords(startDate, endDate);

    expect(records).toEqual([
      {
        externalId: 'hr-1',
        startTime: '2026-06-10T09:00:00Z',
        endTime: '2026-06-10T09:30:00Z',
        samples: [{time: '2026-06-10T09:01:00Z', bpm: 132}],
      },
    ]);
  });

  it('surfaces native read failures instead of converting them to empty sync groups', async () => {
    readRecords.mockRejectedValueOnce(new Error('permission revoked'));

    await expect(new HealthConnectAdapter().getDietRecords(startDate, endDate)).rejects.toThrow(
      'Health Connect nutrition records read failed: permission revoked',
    );
  });
});
