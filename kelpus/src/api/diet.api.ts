import {apiClient} from './index';
import type {DietRecord, DietAnalysisResult, DietAnalysisRequest} from '@appTypes/diet.types';

export const dietApi = {
  getDietRecords: (date: string) => apiClient.get<DietRecord[]>(`/diet?date=${date}`),
  requestAnalysis: (data: DietAnalysisRequest) =>
    apiClient.post<DietAnalysisResult>('/diet/analyze', data),
  getAnalysisHistory: () => apiClient.get<DietAnalysisResult[]>('/diet/history'),
  getAnalysisCount: () => apiClient.get<{remaining: number; total: number}>('/diet/count'),
};
