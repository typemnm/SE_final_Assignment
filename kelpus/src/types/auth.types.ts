export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}
