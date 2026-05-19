import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RunningRecord, LeaderboardEntry} from '@appTypes/running.types';

interface RunningState {
  records: RunningRecord[];
  selectedRecord: RunningRecord | null;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: RunningState = {records: [], selectedRecord: null, leaderboard: [], loading: false, error: null};

const runningSlice = createSlice({
  name: 'running',
  initialState,
  reducers: {
    setRecords: (state, action: PayloadAction<RunningRecord[]>) => { state.records = action.payload; },
    selectRecord: (state, action: PayloadAction<RunningRecord>) => { state.selectedRecord = action.payload; },
    setLeaderboard: (state, action: PayloadAction<LeaderboardEntry[]>) => { state.leaderboard = action.payload; },
    setLoading: (state, action: PayloadAction<boolean>) => { state.loading = action.payload; },
  },
});

export const {setRecords, selectRecord, setLeaderboard, setLoading} = runningSlice.actions;
export const runningReducer = runningSlice.reducer;
