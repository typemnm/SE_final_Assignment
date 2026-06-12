import {SdkAvailabilityStatus} from 'react-native-health-connect';
import {
  buildHealthConnectSyncPayload,
  syncHealthConnectData,
  toHealthConnectNutritionRecord,
  toHealthConnectRunningRecord,
} from './useHealth';
import {healthApi} from '@api/health.api';

jest.mock('@api/health.api', () => ({
  healthApi: {
    syncHealthData: jest.fn(),
  },
}));

const emptyCounts = {created: 0, skipped: 0, failed: 0, errors: []};
const response = {
  status: 'success',
  total: {created: 4, skipped: 1, failed: 0, errors: []},
  groups: {
    running: {created: 1, skipped: 0, failed: 0, errors: []},
    nutrition: {created: 1, skipped: 0, failed: 0, errors: []},
    dailyActivity: {created: 1, skipped: 1, failed: 0, errors: []},
    heartRate: {created: 1, skipped: 0, failed: 0, errors: []},
  },
};

const createAdapter = overrides => ({
  getAvailabilityStatus: jest.fn().mockResolvedValue(SdkAvailabilityStatus.SDK_AVAILABLE),
  requestPermissions: jest.fn().mockResolvedValue(true),
  getDietRecords: jest.fn().mockResolvedValue([]),
  getRunningRecords: jest.fn().mockResolvedValue([]),
  getDailyActivityRecords: jest.fn().mockResolvedValue([]),
  getHeartRateRecords: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('Health Connect sync helpers', () => {
  beforeEach(() => {
    healthApi.syncHealthData.mockReset();
  });

  it('maps legacy adapter running and nutrition records to grouped Health Connect payload records', () => {
    expect(
      toHealthConnectRunningRecord({
        externalId: 'run-1',
        startTime: '2026-06-10T00:00:00.000Z',
        endTime: '2026-06-10T00:30:00.000Z',
        distance: 5,
        calories: 300,
        route: [{latitude: 37, longitude: 127, timestamp: '2026-06-10T00:00:00.000Z'}],
      }),
    ).toEqual({
      externalId: 'run-1',
      recordedAt: '2026-06-10T00:00:00.000Z',
      distanceKm: 5,
      durationSeconds: 1800,
      avgPace: 6,
      calories: 300,
      route: [{lat: 37, lng: 127, timestamp: '2026-06-10T00:00:00.000Z'}],
    });

    expect(
      toHealthConnectNutritionRecord({
        externalId: 'meal-1',
        date: '2026-06-10T01:00:00.000Z',
        mealType: 'breakfast',
        calories: 500,
      }),
    ).toEqual({
      externalId: 'meal-1',
      recordedAt: '2026-06-10T01:00:00.000Z',
      calories: 500,
      protein: 0,
      carbs: 0,
      fat: 0,
      name: 'breakfast',
    });
  });

  it('builds one grouped payload from all Health Connect adapter record groups', async () => {
    const adapter = createAdapter({
      getDietRecords: jest.fn().mockResolvedValue([
        {externalId: 'meal-1', date: '2026-06-10T01:00:00.000Z', mealType: 'lunch', calories: 600},
      ]),
      getRunningRecords: jest.fn().mockResolvedValue([
        {
          externalId: 'run-1',
          startTime: '2026-06-10T00:00:00.000Z',
          endTime: '2026-06-10T00:10:00.000Z',
          distance: 2,
          calories: 120,
          avgPace: 5,
        },
      ]),
      getDailyActivityRecords: jest.fn().mockResolvedValue([
        {externalId: 'day-1', date: '2026-06-10', steps: 1000, activeCalories: 100, totalCalories: 2000},
      ]),
      getHeartRateRecords: jest.fn().mockResolvedValue([
        {externalId: 'hr-1', startTime: 'a', endTime: 'b', samples: [{time: 'a', bpm: 70}]},
      ]),
    });

    const payload = await buildHealthConnectSyncPayload({
      adapter,
      now: new Date('2026-06-11T00:00:00.000Z'),
      days: 3,
    });

    expect(payload.platform).toBe('health_connect');
    expect(payload.syncedAt).toBe('2026-06-11T00:00:00.000Z');
    expect(payload.running).toHaveLength(1);
    expect(payload.nutrition).toHaveLength(1);
    expect(payload.dailyActivity).toHaveLength(1);
    expect(payload.heartRate).toHaveLength(1);
  });

  it('returns unavailable, update-required, denied, and no-data UX statuses without posting', async () => {
    await expect(
      syncHealthConnectData({
        adapter: createAdapter({
          getAvailabilityStatus: jest.fn().mockResolvedValue(SdkAvailabilityStatus.SDK_UNAVAILABLE),
        }),
      }),
    ).resolves.toMatchObject({status: 'unavailable'});

    await expect(
      syncHealthConnectData({
        adapter: createAdapter({
          getAvailabilityStatus: jest
            .fn()
            .mockResolvedValue(SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED),
        }),
      }),
    ).resolves.toMatchObject({status: 'update_required'});

    await expect(
      syncHealthConnectData({
        adapter: createAdapter({requestPermissions: jest.fn().mockResolvedValue(false)}),
      }),
    ).resolves.toMatchObject({status: 'denied'});

    await expect(syncHealthConnectData({adapter: createAdapter()})).resolves.toMatchObject({
      status: 'no_data',
    });

    expect(healthApi.syncHealthData).not.toHaveBeenCalled();
  });

  it('posts non-empty grouped payloads and surfaces partial success', async () => {
    const adapter = createAdapter({
      getRunningRecords: jest.fn().mockResolvedValue([
        {
          startTime: '2026-06-10T00:00:00.000Z',
          endTime: '2026-06-10T00:10:00.000Z',
          distance: 2,
          calories: 120,
        },
      ]),
    });
    healthApi.syncHealthData.mockResolvedValue({
      ...response,
      status: 'partial_success',
      groups: {...response.groups, heartRate: {...emptyCounts, failed: 1, errors: ['bad sample']}},
    });

    await expect(syncHealthConnectData({adapter})).resolves.toMatchObject({
      status: 'partial_success',
      response: {status: 'partial_success'},
    });
    expect(healthApi.syncHealthData).toHaveBeenCalledWith(
      expect.objectContaining({platform: 'health_connect', running: expect.any(Array)}),
    );
  });

  it('surfaces failed backend status instead of mapping it to success', async () => {
    const adapter = createAdapter({
      getRunningRecords: jest.fn().mockResolvedValue([
        {
          startTime: '2026-06-10T00:00:00.000Z',
          endTime: '2026-06-10T00:10:00.000Z',
          distance: 2,
          calories: 120,
        },
      ]),
    });
    healthApi.syncHealthData.mockResolvedValue({
      ...response,
      status: 'failed',
      total: {...emptyCounts, failed: 1, errors: ['bad record']},
      groups: {...response.groups, running: {...emptyCounts, failed: 1, errors: ['bad record']}},
    });

    await expect(syncHealthConnectData({adapter})).resolves.toMatchObject({
      status: 'failed',
      response: {status: 'failed'},
      message: 'Health Connect 기록 동기화에 실패했습니다.',
    });
  });

  it('returns error UX status when native Health Connect reads fail', async () => {
    const adapter = createAdapter({
      getDietRecords: jest.fn().mockRejectedValue(new Error('permission revoked')),
    });

    await expect(syncHealthConnectData({adapter})).resolves.toMatchObject({
      status: 'error',
      message: 'permission revoked',
    });
    expect(healthApi.syncHealthData).not.toHaveBeenCalled();
  });
});
