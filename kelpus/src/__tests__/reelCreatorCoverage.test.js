/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import {Alert, Platform} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

const mockToggle = jest.fn();
const mockPreview = jest.fn();
const mockShareStep = jest.fn();
const mockBack = jest.fn();
const mockReset = jest.fn();
const mockSetCaption = jest.fn();
const mockSetHashtags = jest.fn();
const mockSaveReel = jest.fn();
const mockSaveDevice = jest.fn();
const mockStories = jest.fn();
const mockFeed = jest.fn();
const mockNative = jest.fn();
const mockClose = jest.fn();
const mockShareToFeed = jest.fn();
let mockState;
let mockCapture;

jest.mock('react-native-safe-area-context', () => ({SafeAreaView: ({children}) => children}));
jest.mock('../features/sns/hooks/useReelCreator', () => ({useReelCreator: () => mockState}));
jest.mock('../features/sns/hooks/useSavedReels', () => ({
  useSavedReels: () => ({saveReel: (...args) => mockSaveReel(...args)}),
}));
jest.mock('../features/sns/components/ReelPreviewPlayer', () => {
  const ReactModule = require('react');
  const {Text} = require('react-native');
  return {ReelPreviewPlayer: ReactModule.forwardRef(({frames}, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({captureCurrentFrame: () => mockCapture()}));
    return <Text>{`creator-preview:${frames.length}`}</Text>;
  })};
});
jest.mock('../features/sns/services/shareService', () => ({shareService: {
  saveToDevice: (...args) => mockSaveDevice(...args),
  shareToInstagramStories: (...args) => mockStories(...args),
  shareToInstagramFeed: (...args) => mockFeed(...args),
  shareNative: (...args) => mockNative(...args),
}}));

import {ReelCreatorModal} from '../features/sns/components/ReelCreatorModal';

const diet = {id: 'd1', type: 'diet', totalCalories: 1234, analyzedAt: '2026-06-19', carbRatio: 40.4, proteinRatio: 30.2, fatRatio: 29.4};
const longRun = {id: 'run1', type: 'running', distanceKm: 5.25, date: '2026-06-18', durationSeconds: 372, avgPaceMinPerKm: 5.5, calories: 320};
const shortRun = {...longRun, id: 'run2', distanceKm: 0.45, durationSeconds: 65};

const state = overrides => ({
  dietFrames: [diet], runningFrames: [longRun, shortRun], selectedIds: new Set(['d1', 'run1']),
  selectedFrames: [diet, longRun], step: 0, caption: 'my reel', hashtags: '#one  #two', sharing: false,
  toggleItem: mockToggle, goToPreview: mockPreview, goToShare: mockShareStep, goBack: mockBack,
  reset: mockReset, setCaption: mockSetCaption, setHashtags: mockSetHashtags, doShare: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCapture = jest.fn().mockResolvedValue('file://capture.jpg');
  mockSaveReel.mockResolvedValue({id: 'saved-r1'});
  mockSaveDevice.mockResolvedValue('saved');
  mockStories.mockResolvedValue(undefined);
  mockFeed.mockResolvedValue(undefined);
  mockNative.mockResolvedValue(undefined);
  mockState = state();
});

afterEach(() => Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'}));

test('selection renders diet and both distance formats, toggles choices, advances, and closes', () => {
  const view = render(<ReelCreatorModal onClose={mockClose} onShareToFeed={mockShareToFeed} />);
  expect(view.getByText('1,234 kcal')).toBeTruthy();
  expect(view.getByText('5.25 km')).toBeTruthy();
  expect(view.getByText('450 m')).toBeTruthy();
  fireEvent.press(view.getByText('1,234 kcal'));
  fireEvent.press(view.getByText(/2개 선택됨/));
  expect(mockToggle).toHaveBeenCalledWith('d1');
  expect(mockPreview).toHaveBeenCalled();
  fireEvent.press(view.getByText('✕'));
  expect(mockReset).toHaveBeenCalled();
  expect(mockClose).toHaveBeenCalled();
});

test('selection covers no-choice and empty-record branches', () => {
  mockState = state({dietFrames: [], runningFrames: [], selectedIds: new Set(), selectedFrames: []});
  const view = render(<ReelCreatorModal onClose={mockClose} />);
  expect(view.getByText(/먼저 추가/)).toBeTruthy();
  expect(view.getByText('항목을 선택해주세요')).toBeTruthy();
});

test('preview edits fields, navigates backward, captures, and enters sharing step', async () => {
  mockState = state({step: 1});
  const view = render(<ReelCreatorModal onClose={mockClose} onShareToFeed={mockShareToFeed} />);
  fireEvent.changeText(view.getByPlaceholderText('내용을 입력하세요...'), 'changed');
  fireEvent.changeText(view.getByPlaceholderText('#kelpus #건강기록'), '#changed');
  expect(mockSetCaption).toHaveBeenCalledWith('changed');
  expect(mockSetHashtags).toHaveBeenCalledWith('#changed');
  fireEvent.press(view.getByText('‹'));
  expect(mockBack).toHaveBeenCalled();
  fireEvent.press(view.getByText('공유하기 →'));
  await waitFor(() => expect(mockCapture).toHaveBeenCalled());
  expect(mockShareStep).toHaveBeenCalled();

  mockState = state({step: 2});
  view.rerender(<ReelCreatorModal onClose={mockClose} onShareToFeed={mockShareToFeed} />);
  fireEvent.press(view.getByText('앱에 저장하기'));
  await waitFor(() => expect(mockSaveReel).toHaveBeenCalledWith([diet, longRun], 'my reel', ['#one', '#two']));
  expect(view.getByText('저장 완료!')).toBeTruthy();
  fireEvent.press(view.getByText('피드에 글 올리기'));
  expect(mockShareToFeed).toHaveBeenCalledWith({
    reelId: 'saved-r1', caption: 'my reel', hashtags: ['#one', '#two'], totalCalories: 1234,
    runningStats: {distanceKm: 5.25, duration: '06:12', pace: "5'30\"", calories: 320},
  });
  expect(view.getByText('게시 완료!')).toBeTruthy();
  fireEvent.press(view.getByText('스마트폰에 저장'));
  await waitFor(() => expect(mockSaveDevice).toHaveBeenCalledWith('file://capture.jpg'));
  expect(view.getByText('갤러리 저장 완료!')).toBeTruthy();
});

test('share step covers all external methods, completion, missing capture, and iOS shared result', async () => {
  mockState = state({step: 1, selectedFrames: [diet]});
  const view = render(<ReelCreatorModal onClose={mockClose} onShareToFeed={mockShareToFeed} />);
  fireEvent.press(view.getByText('공유하기 →'));
  await waitFor(() => expect(mockCapture).toHaveBeenCalled());
  mockState = state({step: 2, selectedFrames: [diet]});
  view.rerender(<ReelCreatorModal onClose={mockClose} onShareToFeed={mockShareToFeed} />);

  fireEvent.press(view.getByText('Instagram Stories'));
  await waitFor(() => expect(mockStories).toHaveBeenCalled());
  fireEvent.press(view.getByText('Instagram 피드'));
  await waitFor(() => expect(mockFeed).toHaveBeenCalled());
  fireEvent.press(view.getByText('기타 앱 공유'));
  await waitFor(() => expect(mockNative).toHaveBeenCalled());
  fireEvent.press(view.getByText(/홈으로 돌아가기/));
  expect(mockClose).toHaveBeenCalled();

  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockState = state({step: 2});
  const missing = render(<ReelCreatorModal onClose={mockClose} />);
  fireEvent.press(missing.getByText('스마트폰에 저장'));
  expect(alert).toHaveBeenCalledWith('저장 실패', expect.any(String));
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
  missing.rerender(<ReelCreatorModal onClose={mockClose} />);
  expect(missing.getByText(/사진 앱 kelpus/)).toBeTruthy();
  alert.mockRestore();
});
