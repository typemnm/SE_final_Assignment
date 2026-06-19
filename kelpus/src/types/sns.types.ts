export interface SnsPost {
  id: string;
  platform: 'instagram';
  author: {
    username: string;
    profileImage?: string;
  };
  thumbnail: string;
  caption: string;
  hashtags: string[];
  originalUrl: string;
  likesCount: number;
  postedAt: string;
  cachedAt: string;
}

// 브이로그 피드 도메인 모델 (클래스 다이어그램 기반)
export interface VlogFeed {
  postId: string;
  originalUrl: string;
  authorAccount: string;
  hashtags: string[];
  likesCount: number;
}

export interface VlogFeedItem {
  id: string;
  original_url: string;
  author_account: string;
  hashtags: string[];
  like_count: number;
  platform: string;
  crawled_at: string;
}

export interface FeedListResponse {
  items: VlogFeedItem[];
  total: number;
  from_cache: boolean;
  page: number;
  page_size: number;
}
