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
  postedAt: string;
  cachedAt: string;
}
