// Axios 인스턴스 + 인터셉터 (인증 토큰 발급 플로우 반영)
import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import {getStorage, setStorage, clearStorage} from '@utils/storage';

const API_BASE_URL = process.env.API_BASE_URL || '';

// 토큰 갱신 중 중복 요청 방지를 위한 큐
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (reason: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null = null): void => {
  pendingQueue.forEach(({resolve, reject}) => {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  });
  pendingQueue = [];
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
});

// 요청 인터셉터: AsyncStorage에서 액세스 토큰 읽어 Authorization 헤더 첨부
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getStorage('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 → 토큰 갱신 후 재시도, 갱신 실패 시 로그아웃
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {_retry?: boolean};

    // 401이 아니거나 이미 재시도한 요청이면 그냥 실패
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 다른 요청이 갱신 중이면 큐에 추가해 대기
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({resolve, reject});
      }).then(newToken => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getStorage('refresh_token');
      if (!refreshToken) {
        throw new Error('리프레시 토큰이 없습니다.');
      }

      // 토큰 갱신 (순환 참조 방지를 위해 원시 axios 사용)
      const {data} = await axios.post<{access_token: string}>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        {refresh_token: refreshToken},
      );

      await setStorage('auth_token', data.access_token);
      flushQueue(null, data.access_token);

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      // 갱신 실패 시 스토리지 초기화 (로그아웃 처리)
      await clearStorage();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
