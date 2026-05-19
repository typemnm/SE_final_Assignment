import axios from 'axios';
import {getStorage} from '@utils/storage';

const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.kelpus.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
});

apiClient.interceptors.request.use(async config => {
  const token = await getStorage('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 토큰 만료 처리 - auth store에서 로그아웃
    }
    return Promise.reject(error);
  },
);
