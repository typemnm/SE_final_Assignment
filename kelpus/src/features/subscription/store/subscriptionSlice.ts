import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {subscriptionApi} from '@api/subscription.api';
import type {SubscriptionPlan, DailyLimitStatus} from '@appTypes/subscription.types';
import {SubscriptionType} from '@appTypes/subscription.types';

export type PlanType = 'free' | 'premium';

interface SubscriptionState {
  plan: SubscriptionPlan | null;
  dailyLimitStatus: DailyLimitStatus | null; // 잔여 횟수 상태
  loading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  plan: null,
  dailyLimitStatus: null,
  loading: false,
  error: null,
};

// 구독 플랜 조회
export const fetchPlan = createAsyncThunk(
  'subscription/fetchPlan',
  async (_, {rejectWithValue}) => {
    try {
      return await subscriptionApi.getPlan();
    } catch {
      return rejectWithValue('구독 플랜을 불러오지 못했습니다.');
    }
  },
);

// 일일 AI 사용 한도 확인
export const checkLimit = createAsyncThunk(
  'subscription/checkLimit',
  async (_, {rejectWithValue}) => {
    try {
      return await subscriptionApi.checkDailyLimit();
    } catch {
      return rejectWithValue('사용 한도를 확인하지 못했습니다.');
    }
  },
);

// 구독 업그레이드
export const upgradePlan = createAsyncThunk(
  'subscription/upgradePlan',
  async (planType: SubscriptionType, {rejectWithValue}) => {
    try {
      return await subscriptionApi.upgradePlan(planType);
    } catch {
      return rejectWithValue('구독 업그레이드에 실패했습니다.');
    }
  },
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearSubscriptionError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // fetchPlan
      .addCase(fetchPlan.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlan.fulfilled, (state, action: PayloadAction<SubscriptionPlan>) => {
        state.loading = false;
        state.plan = action.payload;
      })
      .addCase(fetchPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // checkLimit
      .addCase(checkLimit.fulfilled, (state, action: PayloadAction<DailyLimitStatus>) => {
        state.dailyLimitStatus = action.payload;
      })
      // upgradePlan
      .addCase(upgradePlan.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upgradePlan.fulfilled, (state, action: PayloadAction<SubscriptionPlan>) => {
        state.loading = false;
        state.plan = action.payload;
      })
      .addCase(upgradePlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {clearSubscriptionError} = subscriptionSlice.actions;
export const subscriptionReducer = subscriptionSlice.reducer;
