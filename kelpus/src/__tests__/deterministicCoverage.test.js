import React from 'react';
import {act, fireEvent, render, renderHook} from '@testing-library/react-native';
import {TextInput} from 'react-native';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';

/* global globalThis */

jest.mock('../api/client', () => ({
  apiClient: {get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn()},
}));
jest.mock('../api/index', () => ({
  apiClient: jest.requireMock('../api/client').apiClient,
}));
jest.mock('react-native-keychain', () => {
  const values = new Map();
  return {
    __esModule: true,
    default: {
      setGenericPassword: jest.fn(async (_username, password, options) => {
        values.set(options.service, password);
        return true;
      }),
      getGenericPassword: jest.fn(async options => values.has(options.service)
        ? {username: 'token', password: values.get(options.service), service: options.service}
        : false),
      resetGenericPassword: jest.fn(async options => values.delete(options.service)),
    },
  };
});
jest.mock('react-native-google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn(), signOut: jest.fn(),
  },
  statusCodes: {SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED'},
}));

import {dietApi} from '../api/diet.api';
import {Button} from '../components/common/Button';
import {Button as WebButton} from '../components/common/Button.web';
import {AppHeader} from '../components/common/AppHeader';
import {ErrorBoundary} from '../components/common/ErrorBoundary';
import {Input} from '../components/common/Input';
import {LoadingSpinner} from '../components/common/LoadingSpinner';
import {AnalysisCountBadge} from '../features/diet/components/AnalysisCountBadge';
import {NutritionChart} from '../features/diet/components/NutritionChart';
import {useProfile} from '../features/profile/hooks/useProfile';
import {NAVER_MAPS_CLIENT_ID} from '../features/running/config';
import {useSns} from '../features/sns/hooks/useSns';
import {useSubscription} from '../features/subscription/hooks/useSubscription';
import {SubscriptionScreen} from '../features/subscription/screens/SubscriptionScreen';
import {
  configureGoogleSignIn, signInWithGoogle, signOutGoogle,
} from '../features/auth/services/googleAuth.service';
import {
  healthConnectFailedCountsResponseFixture,
  healthConnectPartialSuccessResponseFixture,
  healthConnectSyncFixture,
} from '../features/health/fixtures/healthConnectSync.fixture';
import {makeSampleSyncRequest} from '../features/running/data/sampleRun';
import {ThemeProvider, useThemeContext} from '../theme/ThemeContext';
import {HEALTH_CONNECT_FALLBACK_KEY_POLICY} from '../types/health.types';
import {
  clearTokens, getAccessToken, getRefreshToken, saveTokens, updateAccessToken,
} from '../utils/tokenStorage';
import {
  buildPaceSegments,
  calcDistanceKm,
  calcElevationGain,
  calcPaceMinPerKm,
  difficultyColor,
  estimateCalories,
  fmtElapsed,
  fmtKm,
  fmtMinPerKm,
  haversineKm,
  paceToColor,
} from '../features/running/utils';
import {clearStorage, getStorage, removeStorage, setStorage} from '../utils/storage';

const apiClient = jest.requireMock('../api/client').apiClient;

beforeEach(() => {
  jest.clearAllMocks();
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: jest.fn(key => values.get(key) ?? null),
      setItem: jest.fn((key, value) => values.set(key, value)),
      removeItem: jest.fn(key => values.delete(key)),
      clear: jest.fn(() => values.clear()),
    },
  });
});

test('running utilities cover deterministic formatting, geometry, pace, and elevation branches', () => {
  expect(fmtKm(0.42)).toBe('420m');
  expect(fmtKm(1.234)).toBe('1.23km');
  expect(fmtMinPerKm(0)).toBe("--'--\"");
  expect(fmtMinPerKm(Number.POSITIVE_INFINITY)).toBe("--'--\"");
  expect(fmtMinPerKm(5.5)).toBe("5'30\"");
  expect(fmtElapsed(65)).toBe('01:05');
  expect(fmtElapsed(3661)).toBe('1:01:01');
  expect(haversineKm(37, 127, 37, 127)).toBe(0);
  expect(calcDistanceKm([
    {latitude: 37, longitude: 127, timestamp: '2026-01-01T00:00:00Z'},
    {latitude: 37.001, longitude: 127, timestamp: '2026-01-01T00:01:00Z'},
  ])).toBeGreaterThan(0);
  expect(calcPaceMinPerKm(0, 60)).toBe(0);
  expect(calcPaceMinPerKm(2, 600)).toBe(5);
  expect(estimateCalories(2)).toBe(130);
  expect(['쉬움', '보통', '어려움', 'unknown'].map(difficultyColor)).toEqual([
    '#4CAF50', '#FF9800', '#F44336', '#757575',
  ]);
  expect([0, 8, 9, 10, 11, 12, 14].map(value => paceToColor(value, 10))).toEqual([
    '#9E9E9E', '#00BCD4', '#4CAF50', '#8BC34A', '#FF9800', '#FF5722', '#F44336',
  ]);
  expect(buildPaceSegments([], 6)).toEqual([]);
  const segments = buildPaceSegments([
    {lat: 37, lng: 127, timestamp: 'invalid'},
    {latitude: 37.003, longitude: 127, timestamp: '2026-01-01T00:02:00Z'},
  ], 6);
  expect(segments).toHaveLength(1);
  expect(segments[0].pace).toBe(6);
  expect(buildPaceSegments([
    {timestamp: '2026-01-01T00:00:00Z'},
    {lat: 0, lng: 0, timestamp: '2026-01-01T00:01:00Z'},
  ], 0)[0].pace).toBe(0);
  expect(calcElevationGain([{altitude: 10}, {altitude: 15}, {}, {altitude: 3}])).toBe(8);
});

test('storage wrapper delegates all operations to the configured storage implementation', async () => {
  await setStorage('key', 'value');
  await expect(getStorage('key')).resolves.toBe('value');
  await removeStorage('key');
  await expect(getStorage('key')).resolves.toBeNull();
  await setStorage('one', '1');
  await clearStorage();
  await expect(getStorage('one')).resolves.toBeNull();
});

test('diet API unwraps envelope and direct payloads and preserves request contracts', async () => {
  const analysis = {food_name: 'meal'};
  apiClient.post.mockResolvedValueOnce({data: {data: analysis}});
  await expect(dietApi.requestAnalysis({diet_image_url: 'image'})).resolves.toEqual(analysis);
  const upload = {image_url: 'uploaded'};
  apiClient.post.mockResolvedValueOnce({data: upload});
  const form = new FormData();
  await expect(dietApi.uploadDietImage(form)).resolves.toEqual(upload);
  apiClient.get.mockResolvedValueOnce({data: {data: [{id: 'd1'}]}});
  await expect(dietApi.getHealthConnectExportableRecords()).resolves.toEqual([{id: 'd1'}]);
  apiClient.patch.mockResolvedValueOnce({data: {data: {client_record_id: 'client-d1', status: 'exported'}}});
  await expect(dietApi.updateHealthConnectExportStatus('d1', {client_record_id: 'client-d1', status: 'exported'})).resolves.toEqual({client_record_id: 'client-d1', status: 'exported'});
  apiClient.delete.mockResolvedValueOnce({data: {success: true}});
  await expect(dietApi.deleteDietRecord('d1')).resolves.toEqual({success: true});
  expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/analyze', {diet_image_url: 'image'});
  expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/upload', form, {headers: {'Content-Type': 'multipart/form-data'}});
  expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/diet/d1/health-connect-export', {client_record_id: 'client-d1', status: 'exported'});
  expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/diet/d1');
  apiClient.get.mockResolvedValueOnce({data: []});
  await dietApi.getDietRecords('2026-06-19');
  expect(apiClient.get).toHaveBeenCalledWith('/api/v1/diet?date=2026-06-19');
});

test.each([
  ['primary', false], ['accent', true], ['outline', false], ['ghost', true],
])('Button %s variant renders and respects loading/disabled press behavior', (variant, loading) => {
  const onPress = jest.fn();
  const view = render(<Button title="Action" variant={variant} loading={loading} disabled={false} onPress={onPress} />);
  if (!loading) {
    fireEvent.press(view.getByText('Action'));
    expect(onPress).toHaveBeenCalledTimes(1);
  } else {
    expect(view.queryByText('Action')).toBeNull();
  }
  expect(view.toJSON()).toBeTruthy();
});

test('web Button explicit disabled and compact props cover non-default branches', () => {
  const onPress = jest.fn();
  const view = render(<WebButton title="Compact" variant="primary" disabled fullWidth={false} onPress={onPress} />);
  fireEvent.press(view.getByText('Compact'));
  expect(onPress).not.toHaveBeenCalled();
  expect(view.toJSON()).toBeTruthy();
});

test.each([
  ['primary', false], ['accent', true], ['outline', false], ['ghost', true],
])('web Button %s variant renders directly', (variant, loading) => {
  const view = render(<WebButton title="Web" variant={variant} loading={loading} onPress={jest.fn()} />);
  expect(view.toJSON()).toBeTruthy();
});

test('common form and nutrition components expose deterministic user-visible behavior', () => {
  const onChangeText = jest.fn();
  const input = render(<Input label="Email" value="" error="Required" onChangeText={onChangeText} />);
  const textInput = input.UNSAFE_getByType(TextInput);
  fireEvent(textInput, 'focus');
  fireEvent.changeText(textInput, 'user@example.com');
  fireEvent(textInput, 'blur');
  expect(onChangeText).toHaveBeenCalledWith('user@example.com');
  expect(input.getByText('Required')).toBeTruthy();

  const chart = render(<NutritionChart protein={10.04} carbs={20} fat={0} unit="g" title="Macros" />);
  expect(chart.getByText('Macros')).toBeTruthy();
  expect(chart.getByText('단백질: 10g')).toBeTruthy();
  render(<NutritionChart protein={0} carbs={0} fat={0} />);
});

test('ErrorBoundary renders fallback and can reset its error state', () => {
  const Explodes = () => {
    throw new Error('boom');
  };
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const view = render(<ErrorBoundary><Explodes /></ErrorBoundary>);
  expect(view.getByText('boom')).toBeTruthy();
  fireEvent.press(view.getByText('다시 시도'));
  expect(error).toHaveBeenCalled();
  error.mockRestore();
});

test('AnalysisCountBadge renders subscription limits through the real Redux store', () => {
  const {Provider} = jest.requireActual('react-redux');
  const {store} = jest.requireActual('../store');
  const view = render(<Provider store={store}><AnalysisCountBadge /></Provider>);
  expect(view.getByText(/AI 분석/)).toBeTruthy();
});

test('simple Redux hooks and subscription screen expose dispatchable public behavior', () => {
  const {Provider} = jest.requireActual('react-redux');
  const {store} = jest.requireActual('../store');
  const wrapper = ({children}) => <Provider store={store}>{children}</Provider>;
  const profile = renderHook(() => useProfile(), {wrapper}).result.current;
  expect(profile.isProfileComplete).toBe(false);
  expect(profile.isUpdating).toBe(false);
  const sns = renderHook(() => useSns(), {wrapper}).result.current;
  expect(sns.posts).toEqual([]);
  const subscription = renderHook(() => useSubscription(), {wrapper}).result.current;
  expect(subscription.canAnalyze).toBe(true);
  subscription.clearError();
  const screen = render(<Provider store={store}><SubscriptionScreen /></Provider>);
  expect(screen.getByText('구독 관리')).toBeTruthy();
  expect(NAVER_MAPS_CLIENT_ID).toBe('rf624clnsb');
});

test('token persistence, theme toggling, and static contract fixtures are deterministic', async () => {
  await saveTokens('access', 'refresh');
  await expect(getAccessToken()).resolves.toBe('access');
  await expect(getRefreshToken()).resolves.toBe('refresh');
  await updateAccessToken('updated');
  await expect(getAccessToken()).resolves.toBe('updated');
  await clearTokens();
  await expect(getAccessToken()).resolves.toBeNull();

  const wrapper = ({children}) => <ThemeProvider>{children}</ThemeProvider>;
  const theme = renderHook(() => useThemeContext(), {wrapper});
  expect(theme.result.current.isDark).toBe(true);
  act(() => theme.result.current.toggleTheme());
  expect(HEALTH_CONNECT_FALLBACK_KEY_POLICY.primary).toContain('metadata.id');
  expect(healthConnectSyncFixture.running).toHaveLength(1);
  expect(healthConnectPartialSuccessResponseFixture.status).toBe('partial_success');
  expect(healthConnectFailedCountsResponseFixture.status).toBe('failed');
  expect(makeSampleSyncRequest().gps_coordinates.length).toBeGreaterThan(10);
});

test('header, loading variants, and Google auth service cover public deterministic branches', async () => {
  const header = render(
    <SafeAreaInsetsContext.Provider value={{top: 0, right: 0, bottom: 0, left: 0}}>
      <ThemeProvider><AppHeader title="Title" /></ThemeProvider>
    </SafeAreaInsetsContext.Provider>,
  );
  expect(header.getByText('Title')).toBeTruthy();
  fireEvent.press(header.getByText('☀️'));
  expect(header.getByText('🌙')).toBeTruthy();
  expect(render(<LoadingSpinner fullScreen />).toJSON()).toBeTruthy();
  expect(render(<LoadingSpinner size="small" />).toJSON()).toBeTruthy();

  const signin = jest.requireMock('react-native-google-signin');
  const original = process.env.GOOGLE_WEB_CLIENT_ID;
  delete process.env.GOOGLE_WEB_CLIENT_ID;
  expect(() => configureGoogleSignIn()).toThrow('not configured');
  process.env.GOOGLE_WEB_CLIENT_ID = 'web-id';
  configureGoogleSignIn();
  expect(signin.GoogleSignin.configure).toHaveBeenCalledWith({webClientId: 'web-id'});
  signin.GoogleSignin.hasPlayServices.mockResolvedValue(true);
  signin.GoogleSignin.signIn.mockResolvedValueOnce({data: {idToken: 'nested'}});
  await expect(signInWithGoogle()).resolves.toEqual({idToken: 'nested'});
  signin.GoogleSignin.signIn.mockResolvedValueOnce({idToken: 'legacy'});
  await expect(signInWithGoogle()).resolves.toEqual({idToken: 'legacy'});
  signin.GoogleSignin.signIn.mockResolvedValueOnce({});
  await expect(signInWithGoogle()).rejects.toThrow('Google ID');
  signin.GoogleSignin.signOut.mockRejectedValueOnce({code: 'SIGN_IN_REQUIRED'});
  await expect(signOutGoogle()).resolves.toBeUndefined();
  signin.GoogleSignin.signOut.mockRejectedValueOnce({code: 'other'});
  await expect(signOutGoogle()).rejects.toEqual({code: 'other'});
  process.env.GOOGLE_WEB_CLIENT_ID = original;
});
