// 구독 API (시퀀스 다이어그램 Section 2 - 구독 게이팅)
import {apiClient} from './client';
import type {SubscriptionPlan, DailyLimitStatus} from '@appTypes/subscription.types';
import {SubscriptionType} from '@appTypes/subscription.types';

export const subscriptionApi = {
  /** 현재 구독 플랜 조회 */
  getPlan: (): Promise<SubscriptionPlan> =>
    apiClient.get<SubscriptionPlan>('/api/v1/subscription/plan').then(r => r.data),

  /** 오늘 남은 AI 분석 횟수 조회 */
  checkDailyLimit: (): Promise<DailyLimitStatus> =>
    apiClient
      .get<{remaining: number; limit: number}>('/api/v1/subscription/limit')
      .then(r => ({...r.data, canAnalyze: r.data.remaining > 0})),

  /** 구독 플랜 업그레이드 */
  upgradePlan: (planType: SubscriptionType): Promise<SubscriptionPlan> =>
    apiClient
      .post<SubscriptionPlan>('/api/v1/subscription/upgrade', {planType})
      .then(r => r.data),
};
