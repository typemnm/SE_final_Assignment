import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {DietScreen} from './DietScreen';
import {useDiet} from '../hooks/useDiet';
import {useNavigation} from '@react-navigation/native';

jest.mock('@theme/ThemeContext', () => {
  const {darkTheme} = jest.requireActual('../../../theme/themeColors');
  return {useThemeContext: () => ({tc: darkTheme})};
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));
jest.mock('../hooks/useDiet', () => ({
  useDiet: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(cb => cb()),
}));

const createDietState = overrides => ({
  records: [],
  currentAnalysis: null,
  analyzing: false,
  error: null,
  healthConnectExportStatus: 'idle',
  healthConnectExportError: null,
  healthConnectBackfillSummary: null,
  healthConnectBackfillBusy: false,
  healthConnectBackfillError: null,
  cameraBusy: false,
  cameraError: null,
  clearCameraError: jest.fn(),
  requestAnalysis: jest.fn(async () => ({analysis_id: 'manual'})),
  analyzeCapturedImage: jest.fn(async () => ({analysis_id: 'camera'})),
  backfillHealthConnectNutrition: jest.fn(async () => ({
    total: 1,
    exported: 1,
    skipped: 0,
    failed: 0,
    permissionRequired: 0,
    unavailable: 0,
  })),
  ...overrides,
});

describe('DietScreen camera and manual analysis UX', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    navigate.mockReset();
    useNavigation.mockReturnValue({navigate});
  });

  it('preserves manual URL analysis and navigates to the result on success', async () => {
    const state = createDietState();
    useDiet.mockReturnValue(state);

    const {getByPlaceholderText, getByText} = render(<DietScreen />);
    fireEvent.press(getByText('📊  식단 AI 분석하기'));
    fireEvent.changeText(getByPlaceholderText(/example.com/), 'https://example.com/meal.jpg');
    fireEvent.press(getByText('AI 분석 요청'));

    await waitFor(() => {
      expect(state.requestAnalysis).toHaveBeenCalledWith('https://example.com/meal.jpg');
      expect(navigate).toHaveBeenCalledWith('DietAnalysis');
    });
  });

  it('runs camera analysis and navigates to the result on success', async () => {
    const state = createDietState();
    useDiet.mockReturnValue(state);

    const {getByText} = render(<DietScreen />);
    fireEvent.press(getByText('📊  식단 AI 분석하기'));
    fireEvent.press(getByText('📷  카메라로 촬영'));

    await waitFor(() => {
      expect(state.analyzeCapturedImage).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('DietAnalysis');
    });
  });

  it('renders a single error message when camera and analysis errors overlap', () => {
    const message = 'AI 분析 요청에 실패했습니다.';
    useDiet.mockReturnValue(
      createDietState({
        cameraError: message,
        error: message,
      }),
    );

    const {getAllByText} = render(<DietScreen />);

    expect(getAllByText(message)).toHaveLength(1);
  });

  it('keeps manual analysis errors visible when no camera error is active', () => {
    const message = 'AI 분析 요청에 실패했습니다.';
    useDiet.mockReturnValue(createDietState({error: message}));

    const {getByText} = render(<DietScreen />);

    expect(getByText(message)).toBeTruthy();
  });

  it('clears stale camera errors before starting manual URL analysis', async () => {
    const state = createDietState({
      cameraError: '이전 카메라 오류입니다.',
    });
    useDiet.mockReturnValue(state);

    const {getByPlaceholderText, getByText} = render(<DietScreen />);
    fireEvent.press(getByText('📊  식단 AI 분석하기'));
    fireEvent.changeText(getByPlaceholderText(/example.com/), 'https://example.com/meal.jpg');
    fireEvent.press(getByText('AI 분석 요청'));

    await waitFor(() => {
      expect(state.clearCameraError).toHaveBeenCalledTimes(1);
      expect(state.requestAnalysis).toHaveBeenCalledWith('https://example.com/meal.jpg');
      expect(state.clearCameraError.mock.invocationCallOrder[0]).toBeLessThan(
        state.requestAnalysis.mock.invocationCallOrder[0],
      );
    });
  });

  it('shows camera errors and progress while busy', () => {
    useDiet.mockReturnValue(
      createDietState({
        cameraBusy: true,
        cameraError: '카메라 권한이 필요합니다.',
      }),
    );

    const {getByText} = render(<DietScreen />);

    expect(getByText('사진 업로드 후 AI 분석을 요청하는 중입니다.')).toBeTruthy();
    expect(getByText('카메라 권한이 필요합니다.')).toBeTruthy();
  });

  it('renders Health Connect export status without hiding analysis result navigation', () => {
    useDiet.mockReturnValue(
      createDietState({
        healthConnectExportStatus: 'permission_required',
      }),
    );

    const {getByText} = render(<DietScreen />);

    expect(getByText('Health Connect 영양 쓰기 권한이 필요합니다.')).toBeTruthy();
  });

  it('runs retryable backfill from the diet screen and renders summary UX', async () => {
    const state = createDietState({
      healthConnectBackfillSummary: {
        total: 3,
        exported: 1,
        skipped: 1,
        failed: 1,
        permissionRequired: 0,
        unavailable: 0,
      },
    });
    useDiet.mockReturnValue(state);

    const {getByText} = render(<DietScreen />);
    fireEvent.press(getByText('📊  식단 AI 분석하기'));
    fireEvent.press(getByText('기존 분석 Health Connect 내보내기'));

    await waitFor(() => {
      expect(state.backfillHealthConnectNutrition).toHaveBeenCalledTimes(1);
    });
    expect(getByText('기존 분석 내보내기: 성공 1건, 건너뜀 1건, 실패 1건')).toBeTruthy();
  });
});
