import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {setProfile} from '../store/profileSlice';
import type {ProfileState} from '../store/profileSlice';

export const useProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((state: RootState) => state.profile);

  const updateProfile = (data: Partial<ProfileState>) => {
    dispatch(setProfile(data));
  };

  const isProfileComplete = Boolean(profile.age && profile.gender && profile.goal);

  return {profile, updateProfile, isProfileComplete};
};
