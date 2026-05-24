import {useDispatch, useSelector} from 'react-redux';
import type {RootState, AppDispatch} from '@store/index';
import {fetchPlan, checkLimit, upgradePlan, clearSubscriptionError} from '../store/subscriptionSlice';
import {SubscriptionType} from '@appTypes/subscription.types';

export const useSubscription = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {plan, dailyLimitStatus, loading, error} = useSelector(
    (state: RootState) => state.subscription,
  );

  // 잔여 분석 횟수로 분석 가능 여부 판단
  const canAnalyze = dailyLimitStatus?.canAnalyze ?? true;

  const loadPlan = () => dispatch(fetchPlan());
  const refreshLimit = () => dispatch(checkLimit());
  const upgradeToPremium = () => dispatch(upgradePlan(SubscriptionType.PREMIUM));
  const clearError = () => dispatch(clearSubscriptionError());

  return {plan, dailyLimitStatus, loading, error, canAnalyze, loadPlan, refreshLimit, upgradeToPremium, clearError};
};
