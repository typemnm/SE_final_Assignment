import {useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {RunningStats} from '../data/mockFeedData';

const STORAGE_KEY = '@kelpus_user_feed_posts';

export interface UserPost {
  id: string;
  createdAt: string;
  caption: string;
  hashtags: string[];
  reelId?: string;
  runningStats?: RunningStats;
  totalCalories?: number;
}

export const useUserPosts = () => {
  const [posts, setPosts] = useState<UserPost[]>([]);

  const loadPosts = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setPosts(raw ? (JSON.parse(raw) as UserPost[]) : []);
    } catch {
      setPosts([]);
    }
  }, []);

  const createPost = useCallback(
    async (data: Omit<UserPost, 'id' | 'createdAt'>): Promise<UserPost> => {
      const post: UserPost = {
        id: `upost_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...data,
      };
      setPosts(prev => {
        const updated = [post, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return post;
    },
    [],
  );

  const deletePost = useCallback(async (id: string) => {
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return {posts, loadPosts, createPost, deletePost};
};
