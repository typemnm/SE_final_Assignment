import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {DietScreen} from './DietScreen';
import {useDiet} from '../hooks/useDiet';
import {useNavigation} from '@react-navigation/native';

jest.mock('../hooks/useDiet', () => ({
  useDiet: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const createDietState = overrides => ({
  records: [],
  currentAnalysis: null,
  analyzing: false,
  error: null,
  cameraBusy: false,
  cameraError: null,
  requestAnalysis: jest.fn(async () => ({analysis_id: 'manual'})),
  analyzeCapturedImage: jest.fn(async () => ({analysis_id: 'camera'})),
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
    fireEvent.press(getByText('카메라로 촬영'));

    await waitFor(() => {
      expect(state.analyzeCapturedImage).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('DietAnalysis');
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
});
