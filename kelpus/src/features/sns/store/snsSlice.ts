import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import type {SnsPost, VlogFeed, VlogFeedItem, FeedListResponse} from '@appTypes/sns.types';
import {snsApi} from '@api/sns.api';

interface SnsState {
  feed: VlogFeed[];       // 브이로그 피드 목록 (다이어그램 모델)
  posts: SnsPost[];       // 원본 API 응답 (캐시)
  page: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: SnsState = {
  feed: [],
  posts: [],
  page: 1,
  loading: false,
  refreshing: false,
  error: null,
};

const vlogItemToSnsPost = (item: VlogFeedItem): SnsPost => ({
  id: item.id,
  platform: 'instagram',
  author: {
    username: item.author_account,
    profileImage: undefined,
  },
  thumbnail: '',
  caption: item.hashtags.map(t => `#${t}`).join(' '),
  hashtags: item.hashtags,
  originalUrl: item.original_url,
  likesCount: item.like_count,
  postedAt: item.crawled_at,
  cachedAt: item.crawled_at,
});

/** SnsPost를 VlogFeed 도메인 모델로 변환 */
const toVlogFeed = (post: SnsPost): VlogFeed => ({
  postId: post.id,
  originalUrl: post.originalUrl,
  authorAccount: post.author.username,
  hashtags: post.hashtags,
  likesCount: post.likesCount,
});

export const fetchFeedThunk = createAsyncThunk(
  'sns/fetchFeed',
  async (page: number, {rejectWithValue}) => {
    try {
      const response = await snsApi.getFeed(page);
      const posts = response.data.items.map(vlogItemToSnsPost);
      return {posts, page};
    } catch (e) {
      console.error('[SNS] 피드 로드 실패:', e);
      return rejectWithValue('피드를 불러오지 못했습니다.');
    }
  },
);

export const refreshFeedThunk = createAsyncThunk(
  'sns/refreshFeed',
  async (_, {dispatch}) => {
    await snsApi.refreshFeed();
    dispatch(fetchFeedThunk(1));
  },
);

const snsSlice = createSlice({
  name: 'sns',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFeedThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchFeedThunk.fulfilled,
        (state, action: PayloadAction<{posts: SnsPost[]; page: number}>) => {
          state.loading = false;
          const incoming = action.payload.posts;
          const incomingFeed = incoming.map(toVlogFeed);

          if (action.payload.page === 1) {
            state.posts = incoming;
            state.feed = incomingFeed;
          } else {
            state.posts = [...state.posts, ...incoming];
            state.feed = [...state.feed, ...incomingFeed];
          }
          state.page = action.payload.page;
        },
      )
      .addCase(fetchFeedThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshFeedThunk.pending, state => {
        state.refreshing = true;
      })
      .addCase(refreshFeedThunk.fulfilled, state => {
        state.refreshing = false;
      });
  },
});

export const snsReducer = snsSlice.reducer;
