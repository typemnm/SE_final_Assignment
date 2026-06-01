import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import type {User, LoginRequest, SignUpRequest} from '@appTypes/auth.types';
import {authApi} from '@api/auth.api';
import {setStorage, removeStorage} from '@utils/storage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const loginThunk = createAsyncThunk('auth/login', async (data: LoginRequest, {rejectWithValue}) => {
  try {
    const response = await authApi.login(data);
    await setStorage('auth_token', response.data.access_token);
    await setStorage('refresh_token', response.data.refresh_token);
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue('로그인에 실패했습니다.');
  }
});

export const signUpThunk = createAsyncThunk('auth/signUp', async (data: SignUpRequest, {rejectWithValue}) => {
  try {
    const response = await authApi.signUp(data);
    await setStorage('auth_token', response.data.access_token);
    await setStorage('refresh_token', response.data.refresh_token);
    return response.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}}).response?.status;
    if (status === 409) return rejectWithValue('이미 사용 중인 이메일입니다.');
    return rejectWithValue('회원가입에 실패했습니다.');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async (_, {rejectWithValue}) => {
  try {
    await authApi.logout();
    await removeStorage('auth_token');
    await removeStorage('refresh_token');
  } catch (err: unknown) {
    return rejectWithValue('로그아웃 처리 중 오류가 발생했습니다.');
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
      .addCase(loginThunk.pending, state => { state.loading = true; state.error = null; })
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
      .addCase(signUpThunk.pending, state => { state.loading = true; state.error = null; })
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
      .addCase(logoutThunk.fulfilled, state => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const {setCredentials, clearAuth} = authSlice.actions;
export const authReducer = authSlice.reducer;
