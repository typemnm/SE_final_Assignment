import {apiClient} from './index';
import type {HealthSyncData} from '@appTypes/health.types';

export const healthApi = {
  syncHealthData: (data: HealthSyncData) => apiClient.post('/health/sync', data),
  getLastSyncTime: () => apiClient.get<{lastSync: string}>('/health/last-sync'),
};
