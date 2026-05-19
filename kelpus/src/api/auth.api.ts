import {apiClient} from './index';
import type {LoginRequest, LoginResponse, SignUpRequest, User} from '@appTypes/auth.types';

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', data),
  signUp: (data: SignUpRequest) => apiClient.post<User>('/auth/signup', data),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: (refreshToken: string) =>
    apiClient.post<{accessToken: string}>('/auth/refresh', {refreshToken}),
  socialLogin: (provider: string, token: string) =>
    apiClient.post<LoginResponse>('/auth/social', {provider, token}),
};
