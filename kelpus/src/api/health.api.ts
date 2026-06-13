import {apiClient} from './index';
import type {
  HealthConnectSyncPayload,
  HealthConnectSyncResponse,
} from '@appTypes/health.types';

const unwrapHealthResponse = <T>(response: {data: T | {data: T}}): T => {
  const body = response.data as T | {data?: T};
  return 'data' in (body as object) && (body as {data?: T}).data
    ? (body as {data: T}).data
    : (body as T);
};

export const healthApi = {
  syncHealthData: async (
    data: HealthConnectSyncPayload,
  ): Promise<HealthConnectSyncResponse> => {
    const response = await apiClient.post<HealthConnectSyncResponse | {data: HealthConnectSyncResponse}>(
      '/api/v1/health/sync',
      data,
    );
    return unwrapHealthResponse<HealthConnectSyncResponse>(response);
  },
};
