import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type PlanType = 'free' | 'premium';

interface SubscriptionState {
  plan: PlanType;
  remainingAnalyses: number;
  totalAnalyses: number;
  expiresAt: string | null;
  loading: boolean;
}

const PLAN_LIMITS = {free: 2, premium: 10};

const initialState: SubscriptionState = {
  plan: 'free',
  remainingAnalyses: PLAN_LIMITS.free,
  totalAnalyses: PLAN_LIMITS.free,
  expiresAt: null,
  loading: false,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setPlan: (state, action: PayloadAction<PlanType>) => {
      state.plan = action.payload;
      state.totalAnalyses = PLAN_LIMITS[action.payload];
    },
    decrementAnalyses: state => {
      if (state.remainingAnalyses > 0) state.remainingAnalyses -= 1;
    },
    resetDailyAnalyses: state => {
      state.remainingAnalyses = PLAN_LIMITS[state.plan];
    },
  },
});

export const {setPlan, decrementAnalyses, resetDailyAnalyses} = subscriptionSlice.actions;
export const subscriptionReducer = subscriptionSlice.reducer;
