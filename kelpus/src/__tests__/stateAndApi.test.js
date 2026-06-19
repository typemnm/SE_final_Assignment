import {configureStore} from '@reduxjs/toolkit';

jest.mock('../api/client', () => ({
  apiClient: {get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn()},
}));
jest.mock('../api/index', () => ({
  apiClient: jest.requireMock('../api/client').apiClient,
}));
const mockApiClient = jest.requireMock('../api/client').apiClient;
jest.mock('../utils/tokenStorage', () => ({
  saveTokens: jest.fn(async () => {}),
  getAccessToken: jest.fn(async () => null),
  clearTokens: jest.fn(async () => {}),
}));
jest.mock('../utils/storage', () => ({
  setStorage: jest.fn(async () => {}),
  getStorage: jest.fn(async () => null),
  removeStorage: jest.fn(async () => {}),
}));

import {authApi} from '../api/auth.api';
import {profileApi} from '../api/profile.api';
import {runningApi} from '../api/running.api';
import {snsApi} from '../api/sns.api';
import {subscriptionApi} from '../api/subscription.api';
import {
  authReducer, setCredentials, clearAuth, initAuthThunk, loginThunk, signUpThunk,
  socialLoginThunk, logoutThunk, deleteAccountThunk,
} from '../features/auth/store/authSlice';
import {
  profileReducer, setProfile, resetProfile, fetchProfileThunk, updateProfileThunk,
  fetchSubscriptionThunk,
} from '../features/profile/store/profileSlice';
import {
  runningReducer, setRecords, removeRecord, selectRecord, setLeaderboardEntries,
  setNearbyEntries, setSyncStatus, setLoading, setError, setTrackingStatus,
  addRoutePoint, incrementElapsedSeconds, resetTracking, setCourses, setCoursesLoading,
} from '../features/running/store/runningSlice';
import {snsReducer, fetchFeedThunk, refreshFeedThunk} from '../features/sns/store/snsSlice';
import {
  subscriptionReducer, clearSubscriptionError, fetchPlan, checkLimit, upgradePlan,
} from '../features/subscription/store/subscriptionSlice';
import * as tokenStorage from '../utils/tokenStorage';
import * as storage from '../utils/storage';
import {formatDate, formatDistance, formatDuration, formatPace, formatCalories} from '../utils/format';
import {isValidEmail, isValidPassword, isNotEmpty} from '../utils/validation';

const makeStore = reducer => configureStore({reducer});
const user = {id: 'u1', email: 'user@example.com'};
const authResponse = {data: {access_token: 'access', refresh_token: 'refresh', user}};

beforeEach(() => {
  jest.clearAllMocks();
  tokenStorage.getAccessToken.mockResolvedValue(null);
  storage.getStorage.mockResolvedValue(null);
});

test('API wrappers preserve methods, paths, payloads, and subscription transformations', async () => {
  mockApiClient.post.mockResolvedValue({data: {id: 'plan'}});
  mockApiClient.get.mockResolvedValue({data: {remaining: 2, limit: 3}});
  await authApi.login({email: 'e', password: 'p'});
  await authApi.signUp({email: 'e'});
  await authApi.socialLogin({provider: 'google'});
  await authApi.logout();
  await authApi.refreshToken('refresh');
  await authApi.deleteAccount();
  await profileApi.getProfile();
  await profileApi.updateProfile({age: 20});
  await profileApi.getSubscriptionPlan();
  await profileApi.getSubscriptionLimit();
  await runningApi.getRunningRecords();
  await runningApi.getRunningDetail('r1');
  await runningApi.getLeaderboard('weekly', 'distance');
  await runningApi.syncRunningData([]);
  await snsApi.getFeed(2);
  await snsApi.refreshFeed();
  expect(await subscriptionApi.getPlan()).toEqual({remaining: 2, limit: 3});
  expect(await subscriptionApi.checkDailyLimit()).toEqual({remaining: 2, limit: 3, canAnalyze: true});
  mockApiClient.get.mockResolvedValueOnce({data: {remaining: 0, limit: 3}});
  expect((await subscriptionApi.checkDailyLimit()).canAnalyze).toBe(false);
  expect(await subscriptionApi.upgradePlan('premium')).toEqual({id: 'plan'});
  expect(mockApiClient.post.mock.calls).toEqual(expect.arrayContaining([
    ['/api/v1/auth/login', {email: 'e', password: 'p'}],
    ['/api/v1/auth/register', {email: 'e'}],
    ['/api/v1/auth/social', {provider: 'google'}],
    ['/api/v1/auth/logout'],
    ['/api/v1/auth/refresh', {refresh_token: 'refresh'}],
    ['/running/sync', []],
    ['/api/v1/feed/refresh'],
    ['/api/v1/subscription/upgrade', {planType: 'premium'}],
  ]));
  expect(mockApiClient.get.mock.calls).toEqual(expect.arrayContaining([
    ['/api/v1/users/me'],
    ['/api/v1/subscription/plan'],
    ['/api/v1/subscription/limit'],
    ['/running'],
    ['/running/r1'],
    ['/running/leaderboard?period=weekly&criterion=distance'],
    ['/api/v1/feed?page=2'],
  ]));
  expect(mockApiClient.patch).toHaveBeenCalledWith('/api/v1/users/me', {age: 20});
  expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/auth/account');
});

test('auth thunks and reducer cover restore, success, and rejection paths', async () => {
  const store = makeStore(authReducer);
  store.dispatch(setCredentials({user, accessToken: 'a'}));
  store.dispatch(clearAuth());
  await store.dispatch(initAuthThunk());
  expect(store.getState().isInitialized).toBe(true);

  tokenStorage.getAccessToken.mockResolvedValue('a');
  storage.getStorage.mockResolvedValue(JSON.stringify(user));
  await store.dispatch(initAuthThunk());
  expect(store.getState().isAuthenticated).toBe(true);
  storage.getStorage.mockResolvedValue('{bad');
  await store.dispatch(initAuthThunk());
  storage.getStorage.mockResolvedValue(null);
  await store.dispatch(initAuthThunk());

  mockApiClient.post.mockResolvedValue(authResponse);
  await store.dispatch(loginThunk({email: user.email, password: 'password'}));
  await store.dispatch(signUpThunk({email: user.email, password: 'password'}));
  await store.dispatch(socialLoginThunk({provider: 'google', id_token: 'id'}));
  mockApiClient.post.mockRejectedValueOnce(new Error('login'));
  await store.dispatch(loginThunk({email: user.email, password: 'bad'}));
  mockApiClient.post.mockRejectedValueOnce({response: {status: 409}});
  await store.dispatch(signUpThunk({email: user.email, password: 'password'}));
  mockApiClient.post.mockRejectedValueOnce(new Error('signup'));
  await store.dispatch(signUpThunk({email: user.email, password: 'password'}));
  mockApiClient.post.mockRejectedValueOnce(new Error('social'));
  await store.dispatch(socialLoginThunk({provider: 'google', id_token: 'bad'}));

  mockApiClient.post.mockRejectedValueOnce(new Error('logout'));
  await store.dispatch(logoutThunk());
  mockApiClient.delete.mockRejectedValueOnce(new Error('delete'));
  await store.dispatch(deleteAccountThunk());
  mockApiClient.delete.mockResolvedValueOnce({});
  tokenStorage.clearTokens.mockRejectedValueOnce(new Error('local'));
  storage.removeStorage.mockRejectedValueOnce(new Error('local'));
  await store.dispatch(deleteAccountThunk());
});

test('profile thunks and reducers cover all state transitions', async () => {
  const store = makeStore(profileReducer);
  store.dispatch(setProfile({height: 180}));
  store.dispatch(resetProfile());
  mockApiClient.get.mockResolvedValueOnce({data: {email: 'e', age: 20, gender: 'male', health_goal: 'weight_loss'}});
  await store.dispatch(fetchProfileThunk());
  mockApiClient.get.mockRejectedValueOnce(new Error('profile'));
  await store.dispatch(fetchProfileThunk());
  mockApiClient.patch.mockResolvedValueOnce({data: {age: 21, gender: 'female', health_goal: 'muscle_gain'}});
  await store.dispatch(updateProfileThunk({age: 21}));
  mockApiClient.patch.mockRejectedValueOnce(new Error('update'));
  await store.dispatch(updateProfileThunk({age: 21}));
  mockApiClient.get.mockResolvedValueOnce({data: {daily_ai_limit: 3, today_usage: 1, remaining: 2}});
  await store.dispatch(fetchSubscriptionThunk());
  mockApiClient.get.mockRejectedValueOnce(new Error('sub'));
  await store.dispatch(fetchSubscriptionThunk());
  expect(store.getState().remaining).toBe(2);
});

test('running reducers cover selection, tracking, leaderboards, sync, and courses', () => {
  const store = makeStore(runningReducer);
  const record = {id: 'r', date: 'd', distance: 1, duration: 60, avgPace: 6, calories: 10};
  store.dispatch(setRecords([record]));
  store.dispatch(selectRecord(record));
  store.dispatch(removeRecord('other'));
  expect(store.getState().selectedRecord.id).toBe('r');
  store.dispatch(removeRecord('r'));
  store.dispatch(setLeaderboardEntries({entries: [], period: 'all', criterion: 'count', myRank: 1, myValue: 2}));
  store.dispatch(setNearbyEntries({entries: [], myRank: 1, myValue: 2, totalUsers: 3, period: 'all', criterion: 'count'}));
  store.dispatch(setLoading(true)); store.dispatch(setError('e')); store.dispatch(setTrackingStatus('running'));
  store.dispatch(incrementElapsedSeconds());
  store.dispatch(addRoutePoint({point: {lat: 1, lng: 2, timestamp: 't'}, newDistanceKm: 1}));
  store.dispatch(resetTracking());
  store.dispatch(setSyncStatus({status: 'done', time: 'now'}));
  store.dispatch(setSyncStatus({status: 'idle'}));
  store.dispatch(setCourses([])); store.dispatch(setCoursesLoading(true));
  expect(store.getState().lastSyncTime).toBe('now');
});

test('SNS and subscription thunks cover paging, refresh, success, and failures', async () => {
  const snsStore = makeStore(snsReducer);
  const post = {id: 'p', originalUrl: 'url', author: {username: 'u'}, hashtags: ['h'], likesCount: 1};
  mockApiClient.get.mockResolvedValueOnce({data: [post]});
  await snsStore.dispatch(fetchFeedThunk(1));
  mockApiClient.get.mockResolvedValueOnce({data: [{...post, id: 'p2'}]});
  await snsStore.dispatch(fetchFeedThunk(2));
  mockApiClient.get.mockRejectedValueOnce(new Error('feed'));
  await snsStore.dispatch(fetchFeedThunk(3));
  mockApiClient.post.mockResolvedValueOnce({});
  mockApiClient.get.mockResolvedValue({data: []});
  await snsStore.dispatch(refreshFeedThunk());

  const subStore = makeStore(subscriptionReducer);
  subStore.dispatch(clearSubscriptionError());
  mockApiClient.get.mockResolvedValueOnce({data: {type: 'free'}});
  await subStore.dispatch(fetchPlan());
  mockApiClient.get.mockRejectedValueOnce(new Error('plan'));
  await subStore.dispatch(fetchPlan());
  mockApiClient.get.mockResolvedValueOnce({data: {remaining: 1, limit: 3}});
  await subStore.dispatch(checkLimit());
  mockApiClient.get.mockRejectedValueOnce(new Error('limit'));
  await subStore.dispatch(checkLimit());
  mockApiClient.post.mockResolvedValueOnce({data: {type: 'premium'}});
  await subStore.dispatch(upgradePlan('premium'));
  mockApiClient.post.mockRejectedValueOnce(new Error('upgrade'));
  await subStore.dispatch(upgradePlan('premium'));
});

test('format and validation utilities cover all branches', () => {
  expect(formatDate('2026-01-02T00:00:00Z')).toMatch(/2026\.01\.02/);
  expect(formatDistance(999)).toBe('999m');
  expect(formatDistance(1000)).toBe('1.00km');
  expect(formatDuration(59)).toBe('0:59');
  expect(formatDuration(3661)).toBe('1:01:01');
  expect(formatPace(365)).toBe(`6'05"`);
  expect(formatCalories(1000)).toContain('1');
  expect(isValidEmail('a@b.com')).toBe(true);
  expect(isValidEmail('bad')).toBe(false);
  expect(isValidPassword('12345678')).toBe(true);
  expect(isValidPassword('short')).toBe(false);
  expect(isNotEmpty(' x ')).toBe(true);
  expect(isNotEmpty('  ')).toBe(false);
});
