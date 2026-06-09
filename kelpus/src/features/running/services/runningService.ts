import {apiClient} from '@api/index';
import type {RunningCourse, LeaderboardListEntry, LeaderboardNearbyResponse, LeaderboardPeriod, LeaderboardCriterion} from '../types';

export interface RunningRecordDto {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgPace: number;
  calories: number;
  route: Array<{lat: number; lng: number; altitude?: number; timestamp: string}>;
  splitPaces: Array<{km: number; pace: number}>;
}

export interface SyncRequest {
  distance: number;
  avg_pace: number;
  gps_coordinates: Array<{lat: number; lng: number; altitude?: number; timestamp: string}>;
  duration_seconds: number;
  calories: number;
  external_id?: string;
  recorded_at?: string;
}

export interface SyncResponse {
  record_id: string;
  distance: number;
  avg_pace: number;
  percentile: number;
  overall_rank: number;
  message: string;
}

interface LeaderboardListResponseDto {
  entries: LeaderboardListEntry[];
  period: string;
  criterion: string;
  myRank: number | null;
  myValue: number | null;
}

export const runningService = {
  listRecords: async (): Promise<RunningRecordDto[]> => {
    const res = await apiClient.get<RunningRecordDto[]>('/api/v1/running');
    return res.data;
  },

  getRecord: async (id: string): Promise<RunningRecordDto> => {
    const res = await apiClient.get<RunningRecordDto>(`/api/v1/running/${id}`);
    return res.data;
  },

  syncRecord: async (data: SyncRequest): Promise<SyncResponse> => {
    const res = await apiClient.post<SyncResponse>('/api/v1/running/sync', data);
    return res.data;
  },

  getCourses: async (): Promise<RunningCourse[]> => {
    const res = await apiClient.get<RunningCourse[]>('/api/v1/running/courses');
    return res.data;
  },

  getLeaderboard: async (
    period: LeaderboardPeriod,
    criterion: LeaderboardCriterion,
  ): Promise<LeaderboardListResponseDto> => {
    const res = await apiClient.get<LeaderboardListResponseDto>(
      `/api/v1/running/leaderboard?period=${period}&criterion=${criterion}&limit=50`,
    );
    return res.data;
  },

  deleteRecord: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/running/${id}`);
  },

  getNearbyLeaderboard: async (
    period: LeaderboardPeriod,
    criterion: LeaderboardCriterion,
    window = 3,
  ): Promise<LeaderboardNearbyResponse> => {
    const res = await apiClient.get<LeaderboardNearbyResponse>(
      `/api/v1/running/leaderboard/nearby?period=${period}&criterion=${criterion}&window=${window}`,
    );
    return res.data;
  },
};
