import {useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ReelFrame} from './useReelCreator';

const STORAGE_KEY = '@kelpus_saved_reels';

export interface SavedReel {
  id: string;
  createdAt: string;
  frames: ReelFrame[];
  caption: string;
  hashtags: string[];
}

export const useSavedReels = () => {
  const [reels, setReels] = useState<SavedReel[]>([]);
  const [loadingReels, setLoadingReels] = useState(false);

  const loadReels = useCallback(async () => {
    setLoadingReels(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setReels(raw ? (JSON.parse(raw) as SavedReel[]) : []);
    } catch {
      setReels([]);
    } finally {
      setLoadingReels(false);
    }
  }, []);

  const saveReel = useCallback(
    async (
      frames: ReelFrame[],
      caption: string,
      hashtags: string[],
    ): Promise<SavedReel> => {
      const newReel: SavedReel = {
        id: `reel_${Date.now()}`,
        createdAt: new Date().toISOString(),
        frames,
        caption,
        hashtags,
      };
      setReels(prev => {
        const updated = [newReel, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return newReel;
    },
    [],
  );

  const deleteReel = useCallback(async (id: string) => {
    setReels(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return {reels, loadingReels, loadReels, saveReel, deleteReel};
};
