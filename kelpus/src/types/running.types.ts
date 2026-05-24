import type {GpsPoint} from './health.types';

export interface RunningRecord {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgPace: number;
  calories: number;
  route?: GpsPoint[];
  splitPaces?: SplitPace[];
}

export interface SplitPace {
  km: number;
  pace: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  profileImage?: string;
  value: number;
  isCurrentUser: boolean;
}

export type LeaderboardCriterion = 'total_distance' | 'total_time' | 'count';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all';

// 리더보드 개인 기록 (클래스 다이어그램 기반)
export interface Leaderboard {
  recordId: string;
  totalRank: number;
  percentile: number;
  earnedBadge: string;
}
