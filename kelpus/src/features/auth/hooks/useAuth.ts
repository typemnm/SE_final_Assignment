import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {
  loginThunk,
  logoutThunk,
  signUpThunk,
  socialLoginThunk,
  deleteAccountThunk,
  initAuthThunk,
} from '../store/authSlice';
import type {LoginRequest, SignUpRequest, SocialLoginRequest} from '@appTypes/auth.types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {user, isAuthenticated, isInitialized, loading, deleteLoading, error} = useSelector(
    (state: RootState) => state.auth,
  );

  const initAuth = () => dispatch(initAuthThunk());
  const login = (data: LoginRequest) => dispatch(loginThunk(data));
  const signUp = (data: SignUpRequest) => dispatch(signUpThunk(data));
  const socialLogin = (data: SocialLoginRequest) => dispatch(socialLoginThunk(data));
  const logout = () => dispatch(logoutThunk());
  const deleteAccount = () => dispatch(deleteAccountThunk());

  return {user, isAuthenticated, isInitialized, loading, deleteLoading, error, initAuth, login, signUp, socialLogin, logout, deleteAccount};
};
