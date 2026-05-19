import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {loginThunk, logoutThunk} from '../store/authSlice';
import type {LoginRequest} from '@appTypes/auth.types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {user, isAuthenticated, loading, error} = useSelector((state: RootState) => state.auth);

  const login = async (data: LoginRequest) => {
    await dispatch(loginThunk(data));
  };

  const logout = async () => {
    await dispatch(logoutThunk());
  };

  return {user, isAuthenticated, loading, error, login, logout};
};
