import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RunningCourse, TrackingSession, TrackingPoint, TrackingStatus, LeaderboardListEntry, LeaderboardNearbyResponse} from '../types';
import {DUMMY_RECORD} from '../data/dummyRecord';

interface RunningRecord {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgPace: number;
  calories: number;
  route?: Array<{lat: number; lng: number; altitude?: number; timestamp: string}>;
  splitPaces?: Array<{km: number; pace: number}>;
}

const INITIAL_TRACKING: TrackingSession = {
  status: 'idle',
  elapsedSeconds: 0,
  route: [],
  distanceKm: 0,
  currentPaceMinPerKm: 0,
};

interface RunningState {
  records: RunningRecord[];
  selectedRecord: RunningRecord | null;
  leaderboardEntries: LeaderboardListEntry[];
  leaderboardPeriod: string;
  leaderboardCriterion: string;
  myRank: number | null;
  myValue: number | null;
  nearbyEntries: LeaderboardListEntry[];
  nearbyMyRank: number | null;
  nearbyMyValue: number | null;
  nearbyTotalUsers: number;
  syncStatus: 'idle' | 'syncing' | 'done' | 'error';
  lastSyncTime: string | null;
  loading: boolean;
  error: string | null;
  tracking: TrackingSession;
  courses: RunningCourse[];
  coursesLoading: boolean;
}

const initialState: RunningState = {
  records: [DUMMY_RECORD as any],
  selectedRecord: null,
  leaderboardEntries: [],
  leaderboardPeriod: 'weekly',
  leaderboardCriterion: 'total_distance',
  myRank: null,
  myValue: null,
  nearbyEntries: [],
  nearbyMyRank: null,
  nearbyMyValue: null,
  nearbyTotalUsers: 0,
  syncStatus: 'idle',
  lastSyncTime: null,
  loading: false,
  error: null,
  tracking: INITIAL_TRACKING,
  courses: [],
  coursesLoading: false,
};

const runningSlice = createSlice({
  name: 'running',
  initialState,
  reducers: {
    setRecords: (state, action: PayloadAction<RunningRecord[]>) => {
      state.records = action.payload;
    },
    removeRecord: (state, action: PayloadAction<string>) => {
      state.records = state.records.filter(r => r.id !== action.payload);
      if (state.selectedRecord?.id === action.payload) {
        state.selectedRecord = null;
      }
    },
    selectRecord: (state, action: PayloadAction<RunningRecord>) => {
      state.selectedRecord = action.payload;
    },
    setLeaderboardEntries: (
      state,
      action: PayloadAction<{
        entries: LeaderboardListEntry[];
        period: string;
        criterion: string;
        myRank: number | null;
        myValue: number | null;
      }>,
    ) => {
      state.leaderboardEntries = action.payload.entries;
      state.leaderboardPeriod = action.payload.period;
      state.leaderboardCriterion = action.payload.criterion;
      state.myRank = action.payload.myRank;
      state.myValue = action.payload.myValue;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // tracking actions
    setTrackingStatus: (state, action: PayloadAction<TrackingStatus>) => {
      state.tracking.status = action.payload;
    },
    addRoutePoint: (
      state,
      action: PayloadAction<{point: TrackingPoint; newDistanceKm: number}>,
    ) => {
      state.tracking.route.push(action.payload.point);
      state.tracking.distanceKm = action.payload.newDistanceKm;
      const {elapsedSeconds, distanceKm} = state.tracking;
      if (distanceKm > 0 && elapsedSeconds > 0) {
        state.tracking.currentPaceMinPerKm = elapsedSeconds / 60 / distanceKm;
      }
    },
    incrementElapsedSeconds: state => {
      state.tracking.elapsedSeconds += 1;
    },
    resetTracking: state => {
      state.tracking = INITIAL_TRACKING;
    },
    setNearbyEntries: (state, action: PayloadAction<LeaderboardNearbyResponse>) => {
      state.nearbyEntries = action.payload.entries;
      state.nearbyMyRank = action.payload.myRank;
      state.nearbyMyValue = action.payload.myValue;
      state.nearbyTotalUsers = action.payload.totalUsers;
    },
    setSyncStatus: (state, action: PayloadAction<{status: RunningState['syncStatus']; time?: string}>) => {
      state.syncStatus = action.payload.status;
      if (action.payload.time) state.lastSyncTime = action.payload.time;
    },
    setCourses: (state, action: PayloadAction<RunningCourse[]>) => {
      state.courses = action.payload;
    },
    setCoursesLoading: (state, action: PayloadAction<boolean>) => {
      state.coursesLoading = action.payload;
    },
  },
});

export const {
  setRecords,
  removeRecord,
  selectRecord,
  setLeaderboardEntries,
  setNearbyEntries,
  setSyncStatus,
  setLoading,
  setError,
  setTrackingStatus,
  addRoutePoint,
  incrementElapsedSeconds,
  resetTracking,
  setCourses,
  setCoursesLoading,
} = runningSlice.actions;

export const runningReducer = runningSlice.reducer;
