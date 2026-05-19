import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type HealthGoal = 'weight_loss' | 'muscle_gain' | 'health_maintenance';

export interface ProfileState {
  age: number | null;
  gender: 'male' | 'female' | null;
  goal: HealthGoal | null;
  height: number | null;
  weight: number | null;
  loading: boolean;
}

const initialState: ProfileState = {age: null, gender: null, goal: null, height: null, weight: null, loading: false};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Partial<ProfileState>>) => ({...state, ...action.payload}),
    resetProfile: () => initialState,
  },
});

export const {setProfile, resetProfile} = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
