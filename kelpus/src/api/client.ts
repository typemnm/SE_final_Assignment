// Axios 인스턴스 + 인터셉터 (인증 토큰 발급 플로우 반영)
import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import {Platform} from 'react-native';
import Config from 'react-native-config';
import {getAccessToken, getRefreshToken, updateAccessToken, clearTokens} from '@utils/tokenStorage';

const getApiBaseUrl = (): string => {
  const configuredUrl = Platform.OS === 'web' ? process.env.API_BASE_URL : Config.API_BASE_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (__DEV__) {
    // Web dev 서버는 webpack devServer proxy가 /api 요청을 백엔드로 전달한다.
    if (Platform.OS === 'web') {
      return '';
    }

    // 실제 Android 기기 테스트는 `adb reverse tcp:8000 tcp:8000` 기준으로 PC 백엔드에 연결한다.
    // iOS 시뮬레이터도 localhost로 호스트 머신에 접근할 수 있다.
    return 'http://localhost:8000';
  }

  return 'https://api.kelpus.com';
};

const API_BASE_URL = getApiBaseUrl();

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

// 요청 인터셉터: Keychain에서 액세스 토큰 읽어 Authorization 헤더 첨부
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
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

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

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
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new Error('리프레시 토큰이 없습니다.');
      }

      // 순환 참조 방지를 위해 원시 axios 사용
      const {data} = await axios.post<{access_token: string}>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        {refresh_token: refreshToken},
      );

      await updateAccessToken(data.access_token);
      flushQueue(null, data.access_token);

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      await clearTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
