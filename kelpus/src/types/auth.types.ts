export interface User {
  id: string;
  email: string;
  name?: string;
  profileImage?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// 백엔드 TokenResponse와 일치 (snake_case)
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: Pick<User, 'id' | 'email'>;
}

export interface SignUpRequest {
  email: string;
  password: string;
  age?: number;
  gender?: 'male' | 'female';
  health_goal?: string;
}

export type SocialProvider = 'google' | 'apple' | 'kakao';

export interface SocialLoginRequest {
  provider: SocialProvider;
  id_token: string;
}
