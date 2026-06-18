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

// 앱 첫 실행 시 보여줄 데모 릴스 (AsyncStorage가 비어있을 때만 사용)
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const DEMO_REELS: SavedReel[] = [
  {
    id: 'demo_reel_1',
    createdAt: daysAgo(0),
    caption: '🍽️ 오늘 식단 분석 | 🏃 5.43km 러닝 완주',
    hashtags: ['#kelpus', '#건강기록', '#헬스', '#러닝'],
    frames: [
      {
        type: 'diet',
        id: 'demo_diet_today',
        analyzedAt: daysAgo(0),
        totalCalories: 1842,
        carbRatio: 48,
        proteinRatio: 32,
        fatRatio: 20,
        aiComment: '단백질 섭취가 충분합니다. 탄수화물 비율이 이상적이에요.',
        meals: [
          {mealType: '아침', calories: 420, items: ['오트밀', '바나나', '아몬드밀크']},
          {mealType: '점심', calories: 680, items: ['닭가슴살덮밥', '된장국', '김치']},
          {mealType: '저녁', calories: 520, items: ['연어구이', '브로콜리', '현미밥']},
          {mealType: '간식', calories: 222, items: ['그릭요거트', '블루베리']},
        ],
      } as ReelFrame,
      {
        type: 'running',
        id: 'demo_run_today',
        date: daysAgo(0),
        distanceKm: 5.43,
        durationSeconds: 1890,
        avgPaceMinPerKm: 5.8,
        calories: 378,
        route: [],
      } as ReelFrame,
    ],
  },
  {
    id: 'demo_reel_2',
    createdAt: daysAgo(0),
    caption: '🍽️ 896kcal 저녁 식단 분석',
    hashtags: ['#kelpus', '#저녁식단', '#다이어트'],
    frames: [
      {
        type: 'diet',
        id: 'demo_diet_today2',
        analyzedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        totalCalories: 896,
        carbRatio: 42,
        proteinRatio: 38,
        fatRatio: 20,
        aiComment: '고단백 저탄수화물 식단으로 다이어트에 효과적입니다.',
        meals: [
          {mealType: '저녁', calories: 580, items: ['닭가슴살', '계란2개', '아스파라거스']},
          {mealType: '간식', calories: 316, items: ['프로틴쉐이크', '견과류']},
        ],
      } as ReelFrame,
    ],
  },
  {
    id: 'demo_reel_3',
    createdAt: daysAgo(2),
    caption: '🏃 6.2km 아침 러닝 완주 — 페이스 5\'12\"/km',
    hashtags: ['#kelpus', '#아침러닝', '#러닝스타그램'],
    frames: [
      {
        type: 'running',
        id: 'demo_run_2d',
        date: daysAgo(2),
        distanceKm: 6.2,
        durationSeconds: 2280,
        avgPaceMinPerKm: 5.2,
        calories: 431,
        route: [],
      } as ReelFrame,
    ],
  },
  {
    id: 'demo_reel_4',
    createdAt: daysAgo(4),
    caption: '🍽️ 오늘 하루 식단 공유해요',
    hashtags: ['#kelpus', '#건강식단', '#영양관리'],
    frames: [
      {
        type: 'diet',
        id: 'demo_diet_4d',
        analyzedAt: daysAgo(4),
        totalCalories: 2104,
        carbRatio: 55,
        proteinRatio: 25,
        fatRatio: 20,
        aiComment: '균형 잡힌 식단이에요. 탄수화물 비율이 조금 높으니 조절해보세요.',
        meals: [
          {mealType: '아침', calories: 380, items: ['토스트', '달걀프라이', '오렌지주스']},
          {mealType: '점심', calories: 890, items: ['제육볶음', '밥', '된장국', '나물']},
          {mealType: '저녁', calories: 634, items: ['파스타', '샐러드', '빵']},
          {mealType: '간식', calories: 200, items: ['과자', '커피']},
        ],
      } as ReelFrame,
    ],
  },
];

export const useSavedReels = () => {
  const [reels, setReels] = useState<SavedReel[]>([]);
  const [loadingReels, setLoadingReels] = useState(false);

  const loadReels = useCallback(async () => {
    setLoadingReels(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as SavedReel[]) : null;
      // 저장된 릴스가 없을 때만 데모 데이터 표시
      setReels(stored && stored.length > 0 ? stored : DEMO_REELS);
    } catch {
      setReels(DEMO_REELS);
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
