import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import type {DietRecord, DietAnalysisResult} from '@appTypes/diet.types';
import {dietApi} from '@api/diet.api';

interface DietState {
  records: DietRecord[];
  analysisHistory: DietAnalysisResult[];
  currentAnalysis: DietAnalysisResult | null;
  loading: boolean;
  analyzing: boolean;
  error: string | null;
}

const initialState: DietState = {records: [], analysisHistory: [], currentAnalysis: null, loading: false, analyzing: false, error: null};

export const requestAnalysisThunk = createAsyncThunk('diet/analyze', async ({profileId, date}: {profileId: string; date: string}, {getState, rejectWithValue}) => {
  try {
    const state = getState() as {diet: DietState};
    const response = await dietApi.requestAnalysis({dietRecords: state.diet.records, profileId, date});
    return response.data;
  } catch (err: unknown) {
    return rejectWithValue('AI 분석 요청에 실패했습니다.');
  }
});

const dietSlice = createSlice({
  name: 'diet',
  initialState,
  reducers: {
    setRecords: (state, action: PayloadAction<DietRecord[]>) => { state.records = action.payload; },
    clearError: state => { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(requestAnalysisThunk.pending, state => { state.analyzing = true; state.error = null; })
      .addCase(requestAnalysisThunk.fulfilled, (state, action) => {
        state.analyzing = false;
        state.currentAnalysis = action.payload;
        state.analysisHistory.unshift(action.payload);
      })
      .addCase(requestAnalysisThunk.rejected, (state, action) => {
        state.analyzing = false;
        state.error = action.payload as string;
      });
  },
});

export const {setRecords, clearError} = dietSlice.actions;
export const dietReducer = dietSlice.reducer;
