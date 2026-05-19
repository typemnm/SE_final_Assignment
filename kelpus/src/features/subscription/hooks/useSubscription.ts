import {useSelector, useDispatch} from 'react-redux';
import type {RootState, AppDispatch} from '@store/index';
import {setPlan, decrementAnalyses} from '../store/subscriptionSlice';
import type {PlanType} from '../store/subscriptionSlice';

export const useSubscription = () => {
  const dispatch = useDispatch<AppDispatch>();
  const subscription = useSelector((state: RootState) => state.subscription);

  const canAnalyze = subscription.remainingAnalyses > 0;
  const upgradeToPremium = () => dispatch(setPlan('premium'));
  const useAnalysis = () => { if (canAnalyze) dispatch(decrementAnalyses()); };

  return {...subscription, canAnalyze, upgradeToPremium, useAnalysis};
};
