import {apiClient} from './index';
import type {LoginRequest, LoginResponse, SignUpRequest} from '@appTypes/auth.types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/v1/auth/login', data),
  signUp: (data: SignUpRequest) =>
    apiClient.post<LoginResponse>('/api/v1/auth/register', data),
  logout: () =>
    apiClient.post('/api/v1/auth/logout'),
  refreshToken: (refreshToken: string) =>
    apiClient.post<{access_token: string; expires_in: number}>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    }),
};
