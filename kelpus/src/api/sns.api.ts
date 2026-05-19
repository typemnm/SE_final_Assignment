import {apiClient} from './index';
import type {SnsPost} from '@appTypes/sns.types';

export const snsApi = {
  getFeed: (page: number) => apiClient.get<SnsPost[]>(`/sns/feed?page=${page}`),
  refreshFeed: () => apiClient.post('/sns/refresh'),
};
