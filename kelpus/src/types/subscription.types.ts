// 구독 플랜 타입 (클래스 다이어그램 기반)

export enum SubscriptionType {
  FREE = 'free',
  PREMIUM = 'premium',
}

export interface SubscriptionPlan {
  planId: string;
  type: SubscriptionType;
  dailyAiLimit: number;
  totalUsage: number;
  renewalDate: string;
}

export interface DailyLimitStatus {
  remaining: number;
  limit: number;
  canAnalyze: boolean;
}
