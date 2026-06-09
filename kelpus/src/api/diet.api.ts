import {apiClient} from './index';
import type {
  DietRecord,
  DietAnalysisResult,
  DietAnalysisRequest,
  DietImageUploadResponse,
} from '@appTypes/diet.types';

type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  message?: string;
};

const unwrapApiData = <T>(payload: T | ApiEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

export const dietApi = {
  getDietRecords: (date: string) => apiClient.get<DietRecord[]>(`/api/v1/diet?date=${date}`),
  requestAnalysis: async (data: DietAnalysisRequest): Promise<DietAnalysisResult> => {
    const response = await apiClient.post<DietAnalysisResult | ApiEnvelope<DietAnalysisResult>>(
      '/api/v1/diet/analyze',
      data,
    );
    return unwrapApiData(response.data);
  },
  uploadDietImage: async (data: FormData): Promise<DietImageUploadResponse> => {
    const response = await apiClient.post<
      DietImageUploadResponse | ApiEnvelope<DietImageUploadResponse>
    >('/api/v1/diet/upload', data, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    return unwrapApiData(response.data);
  },
  getAnalysisHistory: () => apiClient.get<DietAnalysisResult[]>('/api/v1/diet/history'),
  getAnalysisCount: () => apiClient.get<{remaining: number; total: number}>('/api/v1/diet/count'),
};
