import {apiClient} from './client';

export interface ProfileResponse {
  id: string;
  email: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  health_goal: string | null;
  created_at: string;
}

export interface UpdateProfileRequest {
  age?: number | null;
  gender?: 'male' | 'female' | null;
  health_goal?: string | null;
}

export interface SubscriptionLimitResponse {
  has_remaining: boolean;
  today_usage: number;
  daily_ai_limit: number;
  remaining: number;
}

export interface SubscriptionPlanResponse {
  id: string;
  type: 'free' | 'premium';
  daily_ai_limit: number;
  total_usage: number;
  today_usage: number;
  renewal_date: string | null;
}

export const profileApi = {
  getProfile: () => apiClient.get<ProfileResponse>('/api/v1/users/me'),
  updateProfile: (data: UpdateProfileRequest) => apiClient.patch<ProfileResponse>('/api/v1/users/me', data),
  getSubscriptionPlan: () => apiClient.get<SubscriptionPlanResponse>('/api/v1/subscription/plan'),
  getSubscriptionLimit: () => apiClient.get<SubscriptionLimitResponse>('/api/v1/subscription/limit'),
};
