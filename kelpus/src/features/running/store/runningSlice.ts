import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RunningRecord, LeaderboardEntry, Leaderboard} from '@appTypes/running.types';

interface RunningState {
  records: RunningRecord[];
  selectedRecord: RunningRecord | null;
  leaderboard: Leaderboard | null;          // 내 리더보드 기록 (다이어그램 모델: totalRank, percentile, earnedBadge)
  leaderboardEntries: LeaderboardEntry[];   // 리더보드 목록 (전체 순위표)
  loading: boolean;
  error: string | null;
}

const initialState: RunningState = {
  records: [],
  selectedRecord: null,
  leaderboard: null,
  leaderboardEntries: [],
  loading: false,
  error: null,
};

const runningSlice = createSlice({
  name: 'running',
  initialState,
  reducers: {
    setRecords: (state, action: PayloadAction<RunningRecord[]>) => {
      state.records = action.payload;
    },
    selectRecord: (state, action: PayloadAction<RunningRecord>) => {
      state.selectedRecord = action.payload;
    },
    setLeaderboard: (state, action: PayloadAction<Leaderboard>) => {
      state.leaderboard = action.payload;
    },
    setLeaderboardEntries: (state, action: PayloadAction<LeaderboardEntry[]>) => {
      state.leaderboardEntries = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {setRecords, selectRecord, setLeaderboard, setLeaderboardEntries, setLoading, setError} =
  runningSlice.actions;
export const runningReducer = runningSlice.reducer;
