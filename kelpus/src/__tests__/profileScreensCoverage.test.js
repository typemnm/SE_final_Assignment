import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {Provider} from 'react-redux';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUpdateProfile = jest.fn(async () => {});
const mockLogout = jest.fn(async () => {});
const mockDeleteAccount = jest.fn(async () => {});
let mockProfileHook;
let mockAuthHook;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: mockGoBack, navigate: mockNavigate}),
  useFocusEffect: callback => callback(),
}));
jest.mock('../features/profile/hooks/useProfile', () => ({useProfile: () => mockProfileHook}));
jest.mock('../features/auth/hooks/useAuth', () => ({useAuth: () => mockAuthHook}));
jest.mock('../theme/ThemeContext', () => {
  const {darkTheme} = jest.requireActual('../theme/themeColors');
  return {useThemeContext: () => ({tc: darkTheme, isDark: true, toggleTheme: jest.fn()})};
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

import {ProfileEditScreen} from '../features/profile/screens/ProfileEditScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';
import {SettingsScreen} from '../features/profile/screens/SettingsScreen';
import {StatisticsScreen} from '../features/profile/screens/StatisticsScreen';
import {store} from '../store';

beforeEach(() => {
  jest.clearAllMocks();
  mockProfileHook = {
    profile: {age: 30, gender: 'male', goal: 'weight_loss', email: 'user@example.com', remaining: 2, dailyAiLimit: 3},
    updateProfile: mockUpdateProfile, fetchProfile: jest.fn(), fetchSubscription: jest.fn(),
    isProfileComplete: true, isUpdating: false,
  };
  mockAuthHook = {
    logout: mockLogout, deleteAccount: mockDeleteAccount,
    loading: false, deleteLoading: false, error: null,
  };
});

test('profile edit validates and saves public form choices', async () => {
  const view = render(<ProfileEditScreen />);
  fireEvent.changeText(view.getByDisplayValue('30'), '31');
  fireEvent.press(view.getByText('여성'));
  fireEvent.press(view.getByText('근육 증가'));
  fireEvent.press(view.getByText('저장'));
  expect(mockUpdateProfile).toHaveBeenCalledWith({age: 31, gender: 'female', health_goal: 'muscle_gain'});
});

test('settings covers logout, delete confirmation, cancellation, and completion', () => {
  const view = render(<SettingsScreen />);
  fireEvent.press(view.getByText('로그아웃'));
  expect(mockLogout).toHaveBeenCalled();
  fireEvent.press(view.getByText('회원 탈퇴'));
  expect(view.getByText(/정말 탈퇴/)).toBeTruthy();
  fireEvent.press(view.getByText('취소'));
  fireEvent.press(view.getByText('회원 탈퇴'));
  fireEvent.press(view.getByText('탈퇴'));
  expect(mockDeleteAccount).toHaveBeenCalled();
});

test('profile and statistics screens render complete and incomplete public states', () => {
  expect(render(<ProfileScreen />).toJSON()).toBeTruthy();
  const stats = render(<Provider store={store}><StatisticsScreen /></Provider>);
  fireEvent.press(stats.getByText('일'));
  fireEvent.press(stats.getByText('월'));
  expect(stats.getByText(/목표:/)).toBeTruthy();
  stats.unmount();
  mockProfileHook = {...mockProfileHook, isProfileComplete: false};
  const incomplete = render(<Provider store={store}><StatisticsScreen /></Provider>);
  expect(incomplete.getByText(/프로필을 완성/)).toBeTruthy();
});
