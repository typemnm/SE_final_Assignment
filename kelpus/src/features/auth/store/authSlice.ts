import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import type {User, LoginRequest} from '@appTypes/auth.types';
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
    await setStorage('auth_token', response.data.accessToken);
    await setStorage('refresh_token', response.data.refreshToken);
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue('로그인에 실패했습니다.');
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
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
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
