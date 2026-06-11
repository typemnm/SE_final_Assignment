import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {fetchProfileThunk, updateProfileThunk, fetchSubscriptionThunk} from '../store/profileSlice';

export const useProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((state: RootState) => state.profile);

  const fetchProfile = useCallback(() => dispatch(fetchProfileThunk()), [dispatch]);
  const fetchSubscription = useCallback(() => dispatch(fetchSubscriptionThunk()), [dispatch]);
  const updateProfile = useCallback(
    (data: {age?: number | null; gender?: 'male' | 'female' | null; health_goal?: string | null}) =>
      dispatch(updateProfileThunk(data)),
    [dispatch],
  );

  const isProfileComplete = Boolean(profile.age && profile.gender && profile.goal);

  return {
    profile,
    updateProfile,
    fetchProfile,
    fetchSubscription,
    isProfileComplete,
    isUpdating: profile.loadingUpdate,
  };
};
