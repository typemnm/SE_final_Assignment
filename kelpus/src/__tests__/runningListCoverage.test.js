import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {Alert, Animated} from 'react-native';
import {Provider} from 'react-redux';

const mockNavigate = jest.fn();
const mockFetchRecords = jest.fn();
const mockSelectRunning = jest.fn();
const mockDeleteRunning = jest.fn(async () => {});
const mockAddSampleRun = jest.fn(async () => {});
const mockSyncFromHealth = jest.fn(async () => ({status: 'done', synced: 1}));
let mockRunningState;
let mockTrackerState;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
  useRoute: () => ({params: {recordId: 'run-1'}}),
  useFocusEffect: callback => callback(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));
jest.mock('../features/running/hooks/useRunning', () => ({
  useRunning: () => mockRunningState,
}));
jest.mock('../features/running/hooks/useHealthSync', () => ({
  useHealthSync: () => ({syncFromHealth: mockSyncFromHealth}),
}));
jest.mock('../features/running/hooks/useRunningTracker', () => ({
  useRunningTracker: () => mockTrackerState,
}));
jest.mock('../theme/ThemeContext', () => {
  const {darkTheme} = jest.requireActual('../theme/themeColors');
  return {useThemeContext: () => ({tc: darkTheme, isDark: true, toggleTheme: jest.fn()})};
});

import {RunningListScreen} from '../features/running/screens/RunningListScreen';
import {LeaderboardScreen} from '../features/running/screens/LeaderboardScreen';
import {RunningCoursesScreen} from '../features/running/screens/RunningCoursesScreen';
import {RunningDetailScreen} from '../features/running/screens/RunningDetailScreen';
import {RunningStatsScreen} from '../features/running/screens/RunningStatsScreen';
import {RunningTrackerScreen} from '../features/running/screens/RunningTrackerScreen';
import {store} from '../store';
import {setRecords} from '../features/running/store/runningSlice';

const immediateAnimation = {start: callback => callback?.(), stop: jest.fn()};

beforeAll(() => {
  jest.spyOn(Animated, 'spring').mockReturnValue(immediateAnimation);
  jest.spyOn(Animated, 'timing').mockReturnValue(immediateAnimation);
  jest.spyOn(Animated, 'parallel').mockReturnValue(immediateAnimation);
  jest.spyOn(Animated, 'stagger').mockReturnValue(immediateAnimation);
});

const record = {
  id: 'run-1',
  date: new Date().toISOString(),
  distance: 5.2,
  duration: 1800,
  avgPace: 5.7,
  calories: 320,
  route: [{latitude: 37, longitude: 127}, {latitude: 37.1, longitude: 127.1}],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRunningState = {
    records: [], loading: false, syncStatus: 'idle', lastSyncTime: null,
    fetchRecords: mockFetchRecords, selectRunning: mockSelectRunning,
    deleteRunning: mockDeleteRunning, addSampleRun: mockAddSampleRun,
    leaderboardEntries: [], myRank: null, myValue: null,
    nearbyEntries: [], nearbyMyRank: null, nearbyTotalUsers: 0,
    fetchLeaderboard: jest.fn(), fetchNearbyLeaderboard: jest.fn(),
    courses: [], coursesLoading: false, fetchCourses: jest.fn(), selectedRecord: null,
  };
  mockTrackerState = {
    tracking: {status: 'idle', elapsedSeconds: 0, distanceKm: 0, currentPaceMinPerKm: 0, route: []},
    currentPosition: null, startTracking: jest.fn(), pauseTracking: jest.fn(),
    resumeTracking: jest.fn(), finishTracking: jest.fn(), saveRun: jest.fn(async () => {}),
    discardRun: jest.fn(),
  };
});

test('RunningListScreen covers loading and empty public states', () => {
  mockRunningState.loading = true;
  expect(render(<RunningListScreen />).toJSON()).toBeTruthy();
  mockRunningState.loading = false;
  const empty = render(<RunningListScreen />);
  expect(empty.getByText('아직 러닝 기록이 없습니다.')).toBeTruthy();
  expect(mockFetchRecords).toHaveBeenCalled();
});

test('RunningListScreen renders records, calendar, sync state, and action navigation', () => {
  mockRunningState.records = [record];
  mockRunningState.syncStatus = 'done';
  mockRunningState.lastSyncTime = new Date().toISOString();
  const view = render(<RunningListScreen />);
  expect(view.getByText('러닝 기록')).toBeTruthy();
  expect(view.getByText('5.20km')).toBeTruthy();
  fireEvent.press(view.getByText('5.20km'));
  expect(mockNavigate).toHaveBeenCalledWith('RunningDetail', {recordId: 'run-1'});
  fireEvent.press(view.getByText('+'));
  expect(view.getByText('러닝 시작')).toBeTruthy();
  fireEvent.press(view.getByText('러닝 시작'));
  expect(mockNavigate).toHaveBeenCalledWith('RunningTracker');

  fireEvent.press(view.getByText('+'));
  fireEvent.press(view.getByText('Health Connect 동기화'));
  expect(mockSyncFromHealth).toHaveBeenCalledWith(30);
  fireEvent.press(view.getByText('+'));
  fireEvent.press(view.getByText('🧪 샘플 기록 추가'));
  expect(mockAddSampleRun).toHaveBeenCalled();

  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find(button => button.style === 'destructive')?.onPress?.();
  });
  fireEvent.press(view.getByText('✕'));
  expect(mockDeleteRunning).toHaveBeenCalledWith('run-1');
  alert.mockRestore();

  fireEvent.press(view.getByText('‹'));
  fireEvent.press(view.getByText('›'));
  const today = String(new Date().getDate());
  fireEvent.press(view.getAllByText(today)[0]);
});

test('LeaderboardScreen covers empty, podium, criteria, and nearby public states', () => {
  const empty = render(<LeaderboardScreen />);
  expect(empty.getByText('리더보드 데이터가 없습니다.')).toBeTruthy();
  empty.unmount();

  mockRunningState.leaderboardEntries = [
    {userId: 'u1', userName: 'Me', rank: 1, value: 5.2, isCurrentUser: true, badge: 'top'},
    {userId: 'u2', userName: 'Two', rank: 2, value: 4.1, isCurrentUser: false},
    {userId: 'u4', userName: 'Four', rank: 4, value: 2, isCurrentUser: false},
  ];
  mockRunningState.nearbyEntries = [{userId: 'u4', userName: 'Four', rank: 4, value: 2, isCurrentUser: false}];
  mockRunningState.myRank = 1;
  mockRunningState.myValue = 5.2;
  mockRunningState.nearbyMyRank = 4;
  mockRunningState.nearbyTotalUsers = 10;
  const view = render(<LeaderboardScreen />);
  expect(view.getByText('Me')).toBeTruthy();
  fireEvent.press(view.getByText('월간'));
  fireEvent.press(view.getByText('시간'));
  fireEvent.press(view.getByText('주변 순위'));
  expect(view.getByText(/내 순위\(4위\)/)).toBeTruthy();
});

test('remaining running screens cover course, detail, stats, and tracker state branches', async () => {
  const emptyCourses = render(<RunningCoursesScreen />);
  expect(emptyCourses.getByText('추천 코스를 불러오는 중...')).toBeTruthy();
  emptyCourses.unmount();
  mockRunningState.courses = [{
    id: 'c1', name: 'River', location: 'Seoul', distance: 5, estimatedTime: 30,
    description: 'flat', rating: 4.5, difficulty: '쉬움',
  }];
  const courses = render(<RunningCoursesScreen />);
  expect(courses.getByText('River')).toBeTruthy();
  courses.unmount();

  const noDetail = render(<RunningDetailScreen />);
  expect(noDetail.getByText('기록을 선택해주세요.')).toBeTruthy();
  noDetail.unmount();
  mockRunningState.selectedRecord = record;
  expect(render(<RunningDetailScreen />).toJSON()).toBeTruthy();

  store.dispatch(setRecords([]));
  const emptyStats = render(<Provider store={store}><RunningStatsScreen /></Provider>);
  expect(emptyStats.getByText('아직 러닝 기록이 없습니다.')).toBeTruthy();
  emptyStats.unmount();
  store.dispatch(setRecords([record]));
  const stats = render(<Provider store={store}><RunningStatsScreen /></Provider>);
  expect(stats.getByText('전체 합계')).toBeTruthy();

  const tracker = render(<RunningTrackerScreen />);
  fireEvent.press(tracker.getByText('🏃 시작'));
  expect(mockTrackerState.startTracking).toHaveBeenCalled();
  tracker.unmount();
  mockTrackerState.tracking = {...mockTrackerState.tracking, status: 'tracking', distanceKm: 1, elapsedSeconds: 60, currentPaceMinPerKm: 5};
  const active = render(<RunningTrackerScreen />);
  fireEvent.press(active.getByText('⏸ 일시정지'));
  fireEvent.press(active.getByText('⏹ 완료'));
  expect(mockTrackerState.pauseTracking).toHaveBeenCalled();
  expect(mockTrackerState.finishTracking).toHaveBeenCalled();
});
