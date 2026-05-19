import {apiClient} from './index';
import type {RunningRecord, LeaderboardEntry} from '@appTypes/running.types';

export const runningApi = {
  getRunningRecords: () => apiClient.get<RunningRecord[]>('/running'),
  getRunningDetail: (id: string) => apiClient.get<RunningRecord>(`/running/${id}`),
  getLeaderboard: (period: 'weekly' | 'monthly' | 'all', criterion: string) =>
    apiClient.get<LeaderboardEntry[]>(`/running/leaderboard?period=${period}&criterion=${criterion}`),
  syncRunningData: (data: RunningRecord[]) => apiClient.post('/running/sync', data),
};
