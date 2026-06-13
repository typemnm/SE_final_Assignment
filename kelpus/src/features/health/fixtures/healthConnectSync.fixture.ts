import type {
  HealthConnectSyncPayload,
  HealthConnectSyncResponse,
} from '@appTypes/health.types';

/**
 * Canonical frontend fixture mirroring contracts/health-connect/success-request.json.
 * Keep semantic fields aligned with backend/app/domains/health/schemas.py.
 */
export const healthConnectSyncFixture: HealthConnectSyncPayload = {
  platform: 'health_connect',
  syncedAt: '2026-06-11T00:00:00Z',
  running: [
    {
      externalId: 'hc-run-1',
      recordedAt: '2026-06-10T09:00:00Z',
      distanceKm: 5.2,
      durationSeconds: 1800,
      avgPace: 5.77,
      calories: 320,
      route: [{lat: 37.1, lng: 127.1, timestamp: '2026-06-10T09:00:00Z'}],
    },
  ],
  nutrition: [
    {
      externalId: 'hc-nutrition-1',
      recordedAt: '2026-06-10T12:00:00Z',
      calories: 650,
      protein: 30,
      carbs: 80,
      fat: 20,
      name: 'Health Connect meal',
    },
  ],
  dailyActivity: [
    {
      externalId: 'hc-day-2026-06-10',
      date: '2026-06-10',
      steps: 9300,
      activeCalories: 410,
      totalCalories: 2200,
    },
  ],
  heartRate: [
    {
      externalId: 'hc-hr-1',
      startTime: '2026-06-10T09:00:00Z',
      endTime: '2026-06-10T09:30:00Z',
      samples: [{time: '2026-06-10T09:01:00Z', bpm: 132}],
    },
  ],
};

export const healthConnectPartialSuccessResponseFixture: HealthConnectSyncResponse = {
  status: 'partial_success',
  total: {created: 3, skipped: 1, failed: 1, errors: []},
  groups: {
    running: {created: 1, skipped: 0, failed: 0, errors: []},
    nutrition: {created: 1, skipped: 1, failed: 0, errors: []},
    dailyActivity: {created: 1, skipped: 0, failed: 0, errors: []},
    heartRate: {
      created: 0,
      skipped: 0,
      failed: 1,
      errors: ['heartRate[0].samples[0].bpm must be >= 0'],
    },
  },
};

export const healthConnectFailedCountsResponseFixture: HealthConnectSyncResponse = {
  status: 'failed',
  total: {created: 0, skipped: 0, failed: 4, errors: []},
  groups: {
    running: {created: 0, skipped: 0, failed: 1, errors: ['running[0] invalid']},
    nutrition: {created: 0, skipped: 0, failed: 1, errors: ['nutrition[0] invalid']},
    dailyActivity: {created: 0, skipped: 0, failed: 1, errors: ['dailyActivity[0] invalid']},
    heartRate: {created: 0, skipped: 0, failed: 1, errors: ['heartRate[0] invalid']},
  },
};
