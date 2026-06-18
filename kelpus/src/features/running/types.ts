export interface RunningCourse {
  id: string;
  name: string;
  distance: number;
  difficulty: '쉬움' | '보통' | '어려움';
  description: string;
  location: string;
  estimatedTime: number;
  rating: number;
}

export type RunningStackParams = {
  RunningList: undefined;
  RunningTracker: undefined;
  RunningDetail: {recordId: string};
  Leaderboard: undefined;
  RunningCourses: undefined;
  RunningStats: undefined;
};

export type TrackingStatus = 'idle' | 'tracking' | 'paused' | 'finished';

export interface TrackingPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
}

export interface TrackingSession {
  status: TrackingStatus;
  elapsedSeconds: number;
  route: TrackingPoint[];
  distanceKm: number;
  currentPaceMinPerKm: number;
}

export interface LeaderboardListEntry {
  rank: number;
  userId: string;
  userName: string;
  value: number;
  badge?: string | null;
  isCurrentUser: boolean;
}

export type LeaderboardCriterion = 'total_distance' | 'count' | 'total_time';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all';

export interface LeaderboardNearbyResponse {
  entries: LeaderboardListEntry[];
  myRank: number | null;
  myValue: number | null;
  totalUsers: number;
  period: string;
  criterion: string;
}
