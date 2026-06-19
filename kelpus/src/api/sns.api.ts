import {apiClient} from './index';
import type {FeedListResponse} from '@appTypes/sns.types';

export const snsApi = {
  getFeed: (page: number) => apiClient.get<FeedListResponse>(`/api/v1/feed?page=${page}`),
  refreshFeed: () => apiClient.post('/api/v1/feed/refresh'),
};
