/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import {Alert, Platform} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

const mockSaveToDevice = jest.fn();
const mockStories = jest.fn();
const mockFeed = jest.fn();
const mockNative = jest.fn();
let mockCapture = jest.fn();
let mockIsDark = true;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}) => children,
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));
jest.mock('../theme/ThemeContext', () => {
  const {darkTheme} = jest.requireActual('../theme/themeColors');
  return {useThemeContext: () => ({tc: darkTheme, isDark: mockIsDark})};
});
jest.mock('../features/sns/components/ReelPreviewPlayer', () => {
  const ReactModule = require('react');
  const {Text} = require('react-native');
  return {ReelPreviewPlayer: ReactModule.forwardRef(({frames}, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({captureCurrentFrame: () => mockCapture()}));
    return <Text>{`preview:${frames.length}`}</Text>;
  })};
});
jest.mock('../features/sns/services/shareService', () => ({shareService: {
  saveToDevice: (...args) => mockSaveToDevice(...args),
  shareToInstagramStories: (...args) => mockStories(...args),
  shareToInstagramFeed: (...args) => mockFeed(...args),
  shareNative: (...args) => mockNative(...args),
}}));

import {PostComposerSheet} from '../features/sns/components/PostComposerSheet';
import {SavedReelViewer} from '../features/sns/components/SavedReelViewer';

const reel = {
  id: 'r1', createdAt: '2026-06-19T01:00:00Z', caption: 'great day', hashtags: ['#run'],
  frames: [
    {type: 'running', distanceKm: 5.2, durationSeconds: 372, avgPaceMinPerKm: 5.5, calories: 320},
    {type: 'diet', totalCalories: 1800},
  ],
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCapture = jest.fn().mockResolvedValue('file://frame.jpg');
  mockSaveToDevice.mockResolvedValue('saved');
  mockStories.mockResolvedValue(undefined);
  mockFeed.mockResolvedValue(undefined);
  mockNative.mockResolvedValue(undefined);
  mockIsDark = true;
});

afterEach(() => {
  jest.useRealTimers();
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
});

test('composer resets fields, validates caption, filters hashtags, previews stats, and closes', () => {
  const onPost = jest.fn();
  const onClose = jest.fn();
  const view = render(<PostComposerSheet
    visible initialCaption=" start " initialHashtags={['#good', 'bad']}
    runningStats={{distanceKm: 5, duration: '30:00', pace: "6'00\"", calories: 300}}
    totalCalories={1200} onClose={onClose} onPost={onPost}
  />);
  expect(view.getByText(/5km/)).toBeTruthy();
  expect(view.getByText(/1,200kcal/)).toBeTruthy();
  fireEvent.changeText(view.getByPlaceholderText('오늘의 기록을 공유해보세요...'), '  posted text  ');
  fireEvent.changeText(view.getByPlaceholderText('#kelpus #건강기록 #헬스'), '#one nope # #two');
  fireEvent.press(view.getByText('게시'));
  expect(onPost).toHaveBeenCalledWith('posted text', ['#one', '#two']);
  fireEvent.press(view.getByText('취소'));
  expect(onClose).toHaveBeenCalled();

  fireEvent.changeText(view.getByPlaceholderText('오늘의 기록을 공유해보세요...'), '   ');
  fireEvent.press(view.getByText('게시'));
  expect(onPost).toHaveBeenCalledTimes(1);
  view.rerender(<PostComposerSheet visible={false} onClose={onClose} onPost={onPost} />);
});

test('composer covers light theme and default content', () => {
  mockIsDark = false;
  const view = render(<PostComposerSheet visible initialCaption="light" onClose={jest.fn()} onPost={jest.fn()} />);
  expect(view.getByDisplayValue('#kelpus #건강기록')).toBeTruthy();
});

test('saved viewer posts feed metadata and performs every share method', async () => {
  const onShareToFeed = jest.fn();
  const onClose = jest.fn();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<SavedReelViewer reel={reel} onClose={onClose} onShareToFeed={onShareToFeed} />);
  expect(view.getByText('great day')).toBeTruthy();
  fireEvent.press(view.getByText('피드에 글 올리기'));
  expect(onShareToFeed).toHaveBeenCalledWith({
    reelId: 'r1', caption: 'great day', hashtags: ['#run'], totalCalories: 1800,
    runningStats: {distanceKm: 5.2, duration: '06:12', pace: "5'30\"", calories: 320},
  });
  expect(view.getByText('게시 완료!')).toBeTruthy();

  fireEvent.press(view.getByText('기기에 저장'));
  await waitFor(() => expect(mockSaveToDevice).toHaveBeenCalledWith('file://frame.jpg'));
  expect(alert).toHaveBeenCalledWith('저장 완료 ✅', expect.any(String));

  fireEvent.press(view.getAllByText('공유하기')[0]);
  fireEvent.press(view.getByText('Instagram Stories'));
  await waitFor(() => expect(mockStories).toHaveBeenCalled());
  fireEvent.press(view.getAllByText('공유하기')[0]);
  fireEvent.press(view.getByText('Instagram 피드'));
  await waitFor(() => expect(mockFeed).toHaveBeenCalled());
  fireEvent.press(view.getAllByText('공유하기')[0]);
  fireEvent.press(view.getByText('기타 앱 공유'));
  await waitFor(() => expect(mockNative).toHaveBeenCalled());
  fireEvent.press(view.getByText('‹'));
  expect(onClose).toHaveBeenCalled();
  alert.mockRestore();
});

test('saved viewer handles capture failure, shared result, empty metadata, sheet cancellation, and iOS hint', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockCapture.mockResolvedValueOnce(null);
  const empty = {...reel, caption: '', hashtags: [], frames: []};
  const view = render(<SavedReelViewer reel={empty} onClose={jest.fn()} />);
  fireEvent.press(view.getByText('기기에 저장'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('캡처 실패', expect.any(String)));
  fireEvent.press(view.getAllByText('공유하기')[0]);
  fireEvent.press(view.getByText('취소'));

  mockSaveToDevice.mockResolvedValueOnce('shared');
  fireEvent.press(view.getByText('기기에 저장'));
  await waitFor(() => expect(mockSaveToDevice).toHaveBeenCalled());
  alert.mockRestore();
});
