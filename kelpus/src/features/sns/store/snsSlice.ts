import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import type {SnsPost} from '@appTypes/sns.types';
import {snsApi} from '@api/sns.api';

interface SnsState {
  posts: SnsPost[];
  page: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: SnsState = {posts: [], page: 1, loading: false, refreshing: false, error: null};

export const fetchFeedThunk = createAsyncThunk('sns/fetchFeed', async (page: number, {rejectWithValue}) => {
  try {
    const response = await snsApi.getFeed(page);
    return {posts: response.data, page};
  } catch (err: unknown) {
    return rejectWithValue('피드를 불러오지 못했습니다.');
  }
});

export const refreshFeedThunk = createAsyncThunk('sns/refreshFeed', async (_, {dispatch}) => {
  await snsApi.refreshFeed();
  dispatch(fetchFeedThunk(1));
});

const snsSlice = createSlice({
  name: 'sns',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFeedThunk.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchFeedThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.page === 1 ? action.payload.posts : [...state.posts, ...action.payload.posts];
        state.page = action.payload.page;
      })
      .addCase(fetchFeedThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshFeedThunk.pending, state => { state.refreshing = true; })
      .addCase(refreshFeedThunk.fulfilled, state => { state.refreshing = false; });
  },
});

export const snsReducer = snsSlice.reducer;
