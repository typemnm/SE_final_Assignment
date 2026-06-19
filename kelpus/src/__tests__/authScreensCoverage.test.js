import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockLoginUnwrap = jest.fn();
const mockLogin = jest.fn(() => ({unwrap: mockLoginUnwrap}));
const mockSocialLogin = jest.fn();
const mockSignUp = jest.fn();
const mockConfigureGoogle = jest.fn();
const mockGoogle = jest.fn();
const mockApple = jest.fn();
const mockKakao = jest.fn();
let mockAuth;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
}));
jest.mock('../features/auth/hooks/useAuth', () => ({useAuth: () => mockAuth}));
jest.mock('../features/auth/services/googleAuth.service', () => ({
  configureGoogleSignIn: () => mockConfigureGoogle(),
  signInWithGoogle: () => mockGoogle(),
}));
jest.mock('../features/auth/services/appleAuth.service', () => ({
  signInWithApple: () => mockApple(),
}));
jest.mock('../features/auth/services/kakaoAuth.service', () => ({
  signInWithKakao: () => mockKakao(),
}));

import {LoginScreen} from '../features/auth/screens/LoginScreen';
import {LoginScreen as WebLoginScreen} from '../features/auth/screens/LoginScreen.web';
import {SignUpScreen} from '../features/auth/screens/SignUpScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockLoginUnwrap.mockResolvedValue(undefined);
  mockSignUp.mockResolvedValue(undefined);
  mockGoogle.mockResolvedValue({idToken: 'google-token'});
  mockApple.mockResolvedValue({identityToken: 'apple-token'});
  mockKakao.mockResolvedValue({accessToken: 'kakao-token'});
  mockAuth = {
    login: mockLogin,
    socialLogin: mockSocialLogin,
    signUp: mockSignUp,
    loading: false,
    error: null,
  };
});

test('login validates fields, toggles controls, submits, and navigates', async () => {
  const view = render(<LoginScreen />);
  fireEvent.press(view.getByText('로그인'));
  expect(view.getByText('올바른 이메일을 입력하세요.')).toBeTruthy();
  expect(view.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeTruthy();

  fireEvent.changeText(view.getByPlaceholderText('이메일'), 'user@example.com');
  fireEvent.changeText(view.getByPlaceholderText('비밀번호 (8자 이상)'), 'password1');
  fireEvent(view.getByPlaceholderText('이메일'), 'focus');
  fireEvent(view.getByPlaceholderText('이메일'), 'blur');
  fireEvent.press(view.getByText('로그인 유지'));
  fireEvent.press(view.getByLabelText('visibility'));
  fireEvent.press(view.getByText('로그인'));

  await waitFor(() =>
    expect(mockLogin).toHaveBeenCalledWith({email: 'user@example.com', password: 'password1'}),
  );
  fireEvent.press(view.getByText('회원가입'));
  expect(mockNavigate).toHaveBeenCalledWith('SignUp');
});

test('login exposes string and fallback failures', async () => {
  mockLoginUnwrap.mockRejectedValueOnce('credential error');
  const view = render(<LoginScreen />);
  fireEvent.changeText(view.getByPlaceholderText('이메일'), 'user@example.com');
  fireEvent.changeText(view.getByPlaceholderText('비밀번호 (8자 이상)'), 'password1');
  fireEvent.press(view.getByText('로그인'));
  expect(await view.findByText('credential error')).toBeTruthy();
  view.unmount();

  mockLoginUnwrap.mockRejectedValueOnce({});
  const fallback = render(<LoginScreen />);
  fireEvent.changeText(fallback.getByPlaceholderText('이메일'), 'user@example.com');
  fireEvent.changeText(fallback.getByPlaceholderText('비밀번호 (8자 이상)'), 'password1');
  fireEvent.press(fallback.getByText('로그인'));
  expect(await fallback.findByText('로그인에 실패했습니다. 다시 시도해주세요.')).toBeTruthy();
});

test('login completes every social provider and reports provider errors', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<LoginScreen />);
  fireEvent.press(view.getByText('Google로 로그인'));
  await waitFor(() => expect(mockSocialLogin).toHaveBeenCalledWith({provider: 'google', id_token: 'google-token'}));
  expect(mockConfigureGoogle).toHaveBeenCalled();

  fireEvent.press(view.getByText('Apple로 로그인'));
  await waitFor(() => expect(mockSocialLogin).toHaveBeenCalledWith({provider: 'apple', id_token: 'apple-token'}));
  fireEvent.press(view.getByText('카카오로 로그인'));
  await waitFor(() => expect(mockSocialLogin).toHaveBeenCalledWith({provider: 'kakao', id_token: 'kakao-token'}));

  mockGoogle.mockRejectedValueOnce(new Error('provider down'));
  fireEvent.press(view.getByText('Google로 로그인'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('로그인 오류', 'provider down'));
  mockApple.mockRejectedValueOnce('unknown');
  fireEvent.press(view.getByText('Apple로 로그인'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('로그인 오류', '소셜 로그인에 실패했습니다.'));
  alert.mockRestore();
});

test('signup validates, submits, handles failures, and returns to login', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<SignUpScreen />);
  fireEvent.press(view.getByText('가입하기'));
  expect(view.getByText('올바른 이메일을 입력하세요.')).toBeTruthy();
  expect(view.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeTruthy();

  fireEvent.changeText(view.getByPlaceholderText('email@example.com'), 'user@example.com');
  fireEvent.changeText(view.getByPlaceholderText('8자 이상 입력'), 'password1');
  fireEvent.changeText(view.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'different');
  fireEvent.press(view.getByText('가입하기'));
  expect(view.getByText('비밀번호가 일치하지 않습니다.')).toBeTruthy();
  fireEvent.changeText(view.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password1');
  fireEvent.press(view.getByText('가입하기'));
  await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith({email: 'user@example.com', password: 'password1'}));
  fireEvent.press(view.getByText('로그인'));
  expect(mockGoBack).toHaveBeenCalled();

  mockSignUp.mockRejectedValueOnce(new Error('failed'));
  fireEvent.press(view.getByText('가입하기'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('오류', '회원가입에 실패했습니다. 다시 시도해주세요.'));
  alert.mockRestore();
});

test('signup renders API error and uses it when submission fails', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockAuth = {...mockAuth, error: 'duplicate email'};
  mockSignUp.mockRejectedValueOnce(new Error('failed'));
  const view = render(<SignUpScreen />);
  expect(view.getByText('duplicate email')).toBeTruthy();
  fireEvent.changeText(view.getByPlaceholderText('email@example.com'), 'user@example.com');
  fireEvent.changeText(view.getByPlaceholderText('8자 이상 입력'), 'password1');
  fireEvent.changeText(view.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password1');
  fireEvent.press(view.getByText('가입하기'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('오류', 'duplicate email'));
  alert.mockRestore();
});

test('web login validates, toggles, submits, navigates, and handles providers', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<WebLoginScreen />);
  fireEvent.press(view.getByText('로그인'));
  expect(view.getByText('올바른 이메일을 입력하세요.')).toBeTruthy();
  fireEvent.changeText(view.getByPlaceholderText('이메일'), 'user@example.com');
  fireEvent.changeText(view.getByPlaceholderText('비밀번호 (8자 이상)'), 'password1');
  fireEvent(view.getByPlaceholderText('이메일'), 'focus');
  fireEvent(view.getByPlaceholderText('이메일'), 'blur');
  fireEvent.press(view.getByText('◉'));
  fireEvent.press(view.getByText('로그인 유지'));
  fireEvent.press(view.getByText('로그인'));
  await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  fireEvent.press(view.getByText('회원가입'));
  expect(mockNavigate).toHaveBeenCalledWith('SignUp');

  fireEvent.press(view.getByText('Google로 로그인'));
  fireEvent.press(view.getByText('Apple로 로그인'));
  fireEvent.press(view.getByText('카카오로 로그인'));
  await waitFor(() => expect(mockSocialLogin).toHaveBeenCalledTimes(3));
  mockGoogle.mockRejectedValueOnce(new Error('web provider down'));
  fireEvent.press(view.getByText('Google로 로그인'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('로그인 오류', 'web provider down'));
  alert.mockRestore();
});

test('web login reports submission failure and unknown social failure', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockLogin.mockImplementationOnce(() => Promise.reject(new Error('bad login')));
  mockApple.mockRejectedValueOnce('unknown');
  const view = render(<WebLoginScreen />);
  fireEvent.changeText(view.getByPlaceholderText('이메일'), 'user@example.com');
  fireEvent.changeText(view.getByPlaceholderText('비밀번호 (8자 이상)'), 'password1');
  fireEvent.press(view.getByText('로그인'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('오류', '로그인에 실패했습니다. 다시 시도해주세요.'));
  fireEvent.press(view.getByText('Apple로 로그인'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('로그인 오류', '소셜 로그인에 실패했습니다.'));
  alert.mockRestore();
});
