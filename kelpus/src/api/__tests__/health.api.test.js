import {healthApi} from '../health.api';
import {apiClient} from '../index';

jest.mock('../index', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const payload = {
  platform: 'health_connect',
  syncedAt: '2026-06-11T00:00:00.000Z',
  running: [],
  nutrition: [],
  dailyActivity: [],
  heartRate: [],
};

const response = {
  status: 'success',
  total: {created: 0, skipped: 0, failed: 0, errors: []},
  groups: {
    running: {created: 0, skipped: 0, failed: 0, errors: []},
    nutrition: {created: 0, skipped: 0, failed: 0, errors: []},
    dailyActivity: {created: 0, skipped: 0, failed: 0, errors: []},
    heartRate: {created: 0, skipped: 0, failed: 0, errors: []},
  },
};

describe('healthApi', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
  });

  it('posts grouped Health Connect payloads to the canonical API path', async () => {
    apiClient.post.mockResolvedValue({data: response});

    await expect(healthApi.syncHealthData(payload)).resolves.toEqual(response);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/health/sync', payload);
  });

  it('unwraps backend {data} envelopes defensively', async () => {
    apiClient.post.mockResolvedValue({data: {data: response}});

    await expect(healthApi.syncHealthData(payload)).resolves.toEqual(response);
  });
});
