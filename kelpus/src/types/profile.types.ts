// 사용자 프로필 타입 (클래스 다이어그램 기반)

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export interface UserProfile {
  userId: string;
  email: string;
  age: number;
  gender: Gender;
  healthGoal: string;
}

export interface UserStats {
  totalDietAnalyses: number;
  totalRunningDistance: number;
  totalRunningCount: number;
  /** 목표 달성률 (%) */
  weeklyGoalAchievement: number;
}
