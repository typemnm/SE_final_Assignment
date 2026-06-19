import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render} from '@testing-library/react-native';

jest.mock('../theme/ThemeContext', () => {
  const {darkTheme} = jest.requireActual('../theme/themeColors');
  return {useThemeContext: () => ({tc: darkTheme})};
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

import {FeedThreadCard} from '../features/sns/components/FeedThreadCard';
import {ReelsCard} from '../features/sns/components/ReelsCard';
import {SavedReelCard} from '../features/sns/components/SavedReelCard';
import {SavedReelListItem} from '../features/sns/components/SavedReelListItem';
import {RunningSlideFrame} from '../features/sns/components/RunningSlideFrame';
import {MOCK_FEED} from '../features/sns/data/mockFeedData';

test('thread cards cover running, image, text, interactions, counts, and delete', () => {
  const onPress = jest.fn();
  const onDelete = jest.fn();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons[1].onPress();
  });
  const running = render(<FeedThreadCard post={MOCK_FEED[0]} onPress={onPress} onDelete={onDelete} />);
  expect(running.getByText('1.2만')).toBeTruthy();
  fireEvent.press(running.getByText('🤍'));
  expect(running.getByText('1.2만')).toBeTruthy();
  fireEvent.press(running.getByText('❤️'));
  fireEvent.press(running.getByText('📌'));
  fireEvent.press(running.getByText('🔖'));
  fireEvent.press(running.getByText(/릴스로 보기/));
  fireEvent.press(running.getByText('🗑️'));
  expect(onPress).toHaveBeenCalled();
  expect(onDelete).toHaveBeenCalled();
  alert.mockRestore();

  const image = render(<FeedThreadCard post={MOCK_FEED[1]} onPress={onPress} />);
  fireEvent.press(image.getByText(/릴스로 보기/));
  expect(image.getByText('2.5만')).toBeTruthy();
  image.unmount();
  const text = render(<FeedThreadCard post={MOCK_FEED[2]} onPress={onPress} />);
  expect(text.getByText('1.8만')).toBeTruthy();
});

test('full-screen reels cover stats and image cards with public actions', () => {
  const detail = jest.fn();
  const running = render(<ReelsCard post={MOCK_FEED[0]} height={700} onPressDetail={detail} />);
  expect(running.getByText('1.2만')).toBeTruthy();
  fireEvent.press(running.getByText('Follow'));
  expect(running.getByText('팔로잉')).toBeTruthy();
  fireEvent.press(running.getByText('🤍'));
  fireEvent.press(running.getByText('❤️'));
  fireEvent.press(running.getByText('📌'));
  fireEvent.press(running.getByText('🔖'));
  fireEvent.press(running.getByText(MOCK_FEED[0].caption));
  expect(detail).toHaveBeenCalled();
  running.unmount();

  const image = render(<ReelsCard post={MOCK_FEED[4]} height={700} onPressDetail={detail} />);
  expect(image.getByText('3.1만')).toBeTruthy();
});

test('saved reel cards and list items cover diet, long run, short run, captions, and empty frames', () => {
  const onPress = jest.fn();
  const diet = {
    id: 'diet', createdAt: '2026-06-19T01:00:00Z', caption: 'healthy day', frames: [{
      type: 'diet', totalCalories: 1234, carbRatio: 40.4, proteinRatio: 30.2, fatRatio: 29.4,
    }, {type: 'diet', totalCalories: 100}],
  };
  const run = {
    id: 'run', createdAt: '2026-06-18T01:00:00Z', caption: '', frames: [{
      type: 'running', distanceKm: 5.234, durationSeconds: 1850,
    }],
  };
  const shortRun = {...run, id: 'short', frames: [{type: 'running', distanceKm: 0.45, durationSeconds: 300}]};
  const empty = {...run, id: 'empty', frames: []};
  for (const reel of [diet, run, shortRun, empty]) {
    const card = render(<SavedReelCard reel={reel} onPress={onPress} />);
    fireEvent.press(card.root);
    card.unmount();
    const item = render(<SavedReelListItem reel={reel} onPress={onPress} />);
    fireEvent.press(item.root);
    item.unmount();
  }
  expect(onPress).toHaveBeenCalledTimes(8);
});

test('running slide covers full and compact maps, route fallback deltas, duration formats, distances, and invalid paces', () => {
  const base = {
    id: 'run', type: 'running', date: '2026-06-19T01:00:00Z', distanceKm: 5.25,
    durationSeconds: 3723, avgPaceMinPerKm: 5.5, calories: 320,
    route: [{lat: 37.5, lng: 127}, {lat: 37.6, lng: 127.1}],
  };
  const full = render(<RunningSlideFrame frame={base} />);
  expect(full.getByText('5.25')).toBeTruthy();
  expect(full.getByText('1:02:03')).toBeTruthy();
  full.unmount();

  const compact = render(<RunningSlideFrame compact frame={{
    ...base, distanceKm: 0.45, durationSeconds: 65, avgPaceMinPerKm: 0,
    route: [{lat: 37.5, lng: 127}, {lat: 37.5, lng: 127}],
  }} />);
  expect(compact.getByText('450')).toBeTruthy();
  expect(compact.getByText("--'--\"/km")).toBeTruthy();
  compact.unmount();

  for (const pace of [Number.NaN, -1]) {
    const noRoute = render(<RunningSlideFrame frame={{...base, route: [], avgPaceMinPerKm: pace}} />);
    expect(noRoute.getByText('GPS 경로 없음')).toBeTruthy();
    noRoute.unmount();
  }
});
