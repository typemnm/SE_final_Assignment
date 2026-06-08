import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {profileApi} from '@api/profile.api';

export type HealthGoal = 'weight_loss' | 'muscle_gain' | 'health_maintenance';

export interface ProfileState {
  email: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  goal: HealthGoal | null;
  height: number | null;
  weight: number | null;
  subscriptionType: 'free' | 'premium' | null;
  dailyAiLimit: number;
  todayUsage: number;
  remaining: number;
  loading: boolean;
  loadingUpdate: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  email: null, age: null, gender: null, goal: null, height: null, weight: null,
  subscriptionType: null, dailyAiLimit: 0, todayUsage: 0, remaining: 0,
  loading: false, loadingUpdate: false, error: null,
};

export const fetchProfileThunk = createAsyncThunk('profile/fetch', async (_, {rejectWithValue}) => {
  try {
    const res = await profileApi.getProfile();
    return res.data;
  } catch {
    return rejectWithValue('프로필을 불러오지 못했습니다.');
  }
});

export const updateProfileThunk = createAsyncThunk(
  'profile/update',
  async (data: {age?: number | null; gender?: 'male' | 'female' | null; health_goal?: string | null}, {rejectWithValue}) => {
    try {
      const res = await profileApi.updateProfile(data);
      return res.data;
    } catch {
      return rejectWithValue('프로필 수정에 실패했습니다.');
    }
  },
);

export const fetchSubscriptionThunk = createAsyncThunk('profile/fetchSubscription', async (_, {rejectWithValue}) => {
  try {
    const res = await profileApi.getSubscriptionLimit();
    return res.data;
  } catch {
    return rejectWithValue('구독 정보를 불러오지 못했습니다.');
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Partial<ProfileState>>) => ({...state, ...action.payload}),
    resetProfile: () => initialState,
  },
  extraReducers: builder => {
    builder
      // fetchProfile
      .addCase(fetchProfileThunk.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.email = action.payload.email;
        state.age = action.payload.age;
        state.gender = action.payload.gender;
        state.goal = action.payload.health_goal as HealthGoal | null;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateProfile
      .addCase(updateProfileThunk.pending, state => { state.loadingUpdate = true; state.error = null; })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.loadingUpdate = false;
        state.age = action.payload.age;
        state.gender = action.payload.gender;
        state.goal = action.payload.health_goal as HealthGoal | null;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.loadingUpdate = false;
        state.error = action.payload as string;
      })
      // fetchSubscription
      .addCase(fetchSubscriptionThunk.fulfilled, (state, action) => {
        state.dailyAiLimit = action.payload.daily_ai_limit;
        state.todayUsage = action.payload.today_usage;
        state.remaining = action.payload.remaining;
      });
  },
});

export const {setProfile, resetProfile} = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
