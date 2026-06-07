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

interface RequestAnalysisArgs {
  dietImageUrl: string;
  recordId?: string;
}

const initialState: DietState = {
  records: [],
  analysisHistory: [],
  currentAnalysis: null,
  loading: false,
  analyzing: false,
  error: null,
};

const getErrorStatus = (err: unknown): number | undefined =>
  (err as {response?: {status?: number}}).response?.status;

export const requestAnalysisThunk = createAsyncThunk<
  DietAnalysisResult,
  RequestAnalysisArgs,
  {rejectValue: string}
>('diet/analyze', async ({dietImageUrl, recordId}, {rejectWithValue}) => {
  try {
    return await dietApi.requestAnalysis({
      diet_image_url: dietImageUrl,
      ...(recordId ? {record_id: recordId} : {}),
    });
  } catch (err: unknown) {
    if (getErrorStatus(err) === 402) {
      return rejectWithValue('일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.');
    }
    return rejectWithValue('AI 분석 요청에 실패했습니다.');
  }
});

const dietSlice = createSlice({
  name: 'diet',
  initialState,
  reducers: {
    setRecords: (state, action: PayloadAction<DietRecord[]>) => {
      state.records = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(requestAnalysisThunk.pending, state => {
        state.analyzing = true;
        state.error = null;
      })
      .addCase(requestAnalysisThunk.fulfilled, (state, action) => {
        state.analyzing = false;
        state.currentAnalysis = action.payload;
        state.analysisHistory.unshift(action.payload);
      })
      .addCase(requestAnalysisThunk.rejected, (state, action) => {
        state.analyzing = false;
        state.error = action.payload ?? 'AI 분석 요청에 실패했습니다.';
      });
  },
});

export const {setRecords, clearError} = dietSlice.actions;
export const dietReducer = dietSlice.reducer;
