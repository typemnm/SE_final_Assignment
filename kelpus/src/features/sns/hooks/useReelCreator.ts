import {useState, useCallback, useMemo} from 'react';
import {useSelector} from 'react-redux';
import type {RootState} from '@store/index';
import {shareService, type ShareContent} from '../services/shareService';

// ──────────────────────────────────────────────
// 릴스 프레임 타입 (Redux 타입과 독립)
// ──────────────────────────────────────────────

export interface MealEntry {
  mealType: '아침' | '점심' | '저녁' | '간식';
  calories: number;
  items: string[];
}

export interface DietFrame {
  type: 'diet';
  id: string;
  analyzedAt: string;
  totalCalories: number;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  aiComment: string | null;
  meals?: MealEntry[];
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RunningFrame {
  type: 'running';
  id: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number;
  calories: number;
  route?: RoutePoint[];
}

export type ReelFrame = DietFrame | RunningFrame;

// ──────────────────────────────────────────────
// 기본 해시태그
// ──────────────────────────────────────────────

const DEFAULT_HASHTAGS = ['#kelpus', '#건강기록', '#헬스'].join(' ');

// 식단 분석 기록이 없을 때 보여줄 데모 프레임
const DEMO_DIET: DietFrame = {
  type: 'diet',
  id: '__demo_diet__',
  analyzedAt: new Date(Date.now() - 86400000).toISOString(),
  totalCalories: 892,
  carbRatio: 52,
  proteinRatio: 28,
  fatRatio: 20,
  aiComment: '단백질과 탄수화물 비율이 적절합니다. 채소 섭취를 좀 더 늘려보세요.',
  meals: [
    {mealType: '아침', calories: 320, items: ['현미밥', '된장국', '계란말이']},
    {mealType: '점심', calories: 385, items: ['비빔밥', '김치찌개']},
    {mealType: '저녁', calories: 187, items: ['닭가슴살', '샐러드']},
  ],
};

const summarize = (frames: ReelFrame[]): string =>
  frames
    .map(f => {
      if (f.type === 'diet') {
        return `🍽️ ${f.totalCalories.toLocaleString()}kcal 식단 분석`;
      }
      const km = f.distanceKm;
      return `🏃 ${km >= 1 ? `${km.toFixed(2)}km` : `${Math.round(km * 1000)}m`} 러닝 완주`;
    })
    .join(' | ');

// ──────────────────────────────────────────────
// useReelCreator 훅
// ──────────────────────────────────────────────

export const useReelCreator = () => {
  // Redux에서 원본 데이터 읽기 (read-only)
  const dietHistory = useSelector((s: RootState) => s.diet.analysisHistory);
  const runningRecords = useSelector((s: RootState) => s.running.records);

  // Redux 데이터를 릴스 프레임으로 변환
  const dietFrames: DietFrame[] = useMemo(() => {
    const real = dietHistory.map(a => ({
      type: 'diet' as const,
      id: a.analysis_id,
      analyzedAt: a.analyzed_at,
      totalCalories: a.total_calories,
      carbRatio: a.carb_ratio,
      proteinRatio: a.protein_ratio,
      fatRatio: a.fat_ratio,
      aiComment: a.ai_comment,
    }));
    // 실제 분석 기록이 없으면 데모 데이터로 대체
    return real.length > 0 ? real : [DEMO_DIET];
  }, [dietHistory]);

  const runningFrames: RunningFrame[] = useMemo(
    () =>
      (runningRecords as any[]).map(r => ({
        type: 'running' as const,
        id: r.id,
        date: r.date,
        distanceKm: r.distance,
        durationSeconds: r.duration,
        avgPaceMinPerKm: r.avgPace,
        calories: r.calories,
        // lat/lng 형식과 latitude/longitude 형식 모두 지원
        route: r.route?.map((p: any) => ({
          lat: p.lat ?? p.latitude ?? 0,
          lng: p.lng ?? p.longitude ?? 0,
        })) as RoutePoint[] | undefined,
      })),
    [runningRecords],
  );

  // ── 로컬 UI 상태 ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState(DEFAULT_HASHTAGS);
  const [sharing, setSharing] = useState(false);

  // 선택된 프레임 (다이어트 먼저, 러닝 나중)
  const selectedFrames = useMemo<ReelFrame[]>(
    () => [
      ...dietFrames.filter(f => selectedIds.has(f.id)),
      ...runningFrames.filter(f => selectedIds.has(f.id)),
    ],
    [dietFrames, runningFrames, selectedIds],
  );

  // ── 액션 ──

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const goToPreview = useCallback(() => {
    setCaption(summarize(selectedFrames));
    setStep(1);
  }, [selectedFrames]);

  const goToShare = useCallback(() => setStep(2), []);

  const goBack = useCallback(
    () => setStep(s => (Math.max(0, s - 1) as 0 | 1 | 2)),
    [],
  );

  const reset = useCallback(() => {
    setSelectedIds(new Set());
    setStep(0);
    setCaption('');
    setHashtags(DEFAULT_HASHTAGS);
    setSharing(false);
  }, []);

  const doShare = useCallback(
    async (method: 'stories' | 'feed' | 'native') => {
      setSharing(true);
      const content: ShareContent = {
        caption,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
      };
      try {
        if (method === 'stories') {
          await shareService.shareToInstagramStories(content);
        } else if (method === 'feed') {
          await shareService.shareToInstagramFeed(content);
        } else {
          await shareService.shareNative(content);
        }
      } finally {
        setSharing(false);
      }
    },
    [caption, hashtags],
  );

  return {
    dietFrames,
    runningFrames,
    selectedIds,
    selectedFrames,
    step,
    caption,
    hashtags,
    sharing,
    toggleItem,
    goToPreview,
    goToShare,
    goBack,
    reset,
    setCaption,
    setHashtags,
    doShare,
  };
};
