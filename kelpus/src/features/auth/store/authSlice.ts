import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import type {User, LoginRequest, SignUpRequest, SocialLoginRequest} from '@appTypes/auth.types';
import {authApi} from '@api/auth.api';
import {saveTokens, getAccessToken, clearTokens} from '@utils/tokenStorage';
import {setStorage, getStorage, removeStorage} from '@utils/storage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  loading: false,
  error: null,
};

// 앱 시작 시 Keychain에서 토큰을 읽어 로그인 상태를 복원 (자동 로그인)
export const initAuthThunk = createAsyncThunk('auth/init', async () => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  const userJson = await getStorage('auth_user');
  if (!userJson) return null;
  return {user: JSON.parse(userJson) as User, accessToken};
});

export const loginThunk = createAsyncThunk('auth/login', async (data: LoginRequest, {rejectWithValue}) => {
  try {
    const response = await authApi.login(data);
    await saveTokens(response.data.access_token, response.data.refresh_token);
    await setStorage('auth_user', JSON.stringify(response.data.user));
    return response.data;
  } catch {
    return rejectWithValue('로그인에 실패했습니다.');
  }
});

export const signUpThunk = createAsyncThunk('auth/signUp', async (data: SignUpRequest, {rejectWithValue}) => {
  try {
    const response = await authApi.signUp(data);
    await saveTokens(response.data.access_token, response.data.refresh_token);
    await setStorage('auth_user', JSON.stringify(response.data.user));
    return response.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}}).response?.status;
    if (status === 409) return rejectWithValue('이미 사용 중인 이메일입니다.');
    return rejectWithValue('회원가입에 실패했습니다.');
  }
});

export const socialLoginThunk = createAsyncThunk(
  'auth/socialLogin',
  async (data: SocialLoginRequest, {rejectWithValue}) => {
    try {
      const response = await authApi.socialLogin(data);
      await saveTokens(response.data.access_token, response.data.refresh_token);
      await setStorage('auth_user', JSON.stringify(response.data.user));
      return response.data;
    } catch {
      return rejectWithValue('소셜 로그인에 실패했습니다.');
    }
  },
);

export const logoutThunk = createAsyncThunk('auth/logout', async (_, {rejectWithValue}) => {
  try {
    await authApi.logout();
    await clearTokens();
    await removeStorage('auth_user');
  } catch {
    return rejectWithValue('로그아웃 처리 중 오류가 발생했습니다.');
  }
});

export const deleteAccountThunk = createAsyncThunk('auth/deleteAccount', async (_, {rejectWithValue}) => {
  try {
    await authApi.deleteAccount();
    await clearTokens();
    await removeStorage('auth_user');
  } catch {
    return rejectWithValue('회원 탈퇴 처리 중 오류가 발생했습니다.');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{user: User; accessToken: string}>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    clearAuth: state => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(initAuthThunk.fulfilled, (state, action) => {
        state.isInitialized = true;
        if (action.payload) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(initAuthThunk.rejected, state => {
        state.isInitialized = true;
      })
      .addCase(loginThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(signUpThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUpThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.isAuthenticated = true;
      })
      .addCase(signUpThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(socialLoginThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(socialLoginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.isAuthenticated = true;
      })
      .addCase(socialLoginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutThunk.fulfilled, state => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccountThunk.fulfilled, state => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccountThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {setCredentials, clearAuth} = authSlice.actions;
export const authReducer = authSlice.reducer;
