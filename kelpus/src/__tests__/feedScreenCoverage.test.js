/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

const mockLoadReels = jest.fn();
const mockLoadPosts = jest.fn();
const mockCreatePost = jest.fn(async () => {});
const mockDeletePost = jest.fn();
let mockReels = [];
let mockPosts = [];

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: callback => callback(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 4, left: 0}),
}));
jest.mock('../theme/ThemeContext', () => {
  const {darkTheme} = jest.requireActual('../theme/themeColors');
  return {useThemeContext: () => ({tc: darkTheme})};
});
jest.mock('../features/sns/hooks/useSns', () => {
  const {MOCK_FEED} = jest.requireActual('../features/sns/data/mockFeedData');
  return {
    useSns: () => ({posts: MOCK_FEED, loading: false, refreshing: false, loadFeed: jest.fn(), refreshFeed: jest.fn()}),
  };
});
jest.mock('../features/sns/hooks/useSavedReels', () => ({
  useSavedReels: () => ({reels: mockReels, loadReels: mockLoadReels}),
}));
jest.mock('../features/sns/hooks/useUserPosts', () => ({
  useUserPosts: () => ({
    posts: mockPosts,
    loadPosts: mockLoadPosts,
    createPost: mockCreatePost,
    deletePost: mockDeletePost,
  }),
}));
jest.mock('../features/sns/components/FeedThreadCard', () => {
  const {Text, TouchableOpacity, View} = require('react-native');
  return {FeedThreadCard: ({post, onPress, onDelete}) => (
    <View>
      <TouchableOpacity onPress={onPress}><Text>{`post:${post.id}`}</Text></TouchableOpacity>
      {onDelete && <TouchableOpacity onPress={onDelete}><Text>{`delete:${post.id}`}</Text></TouchableOpacity>}
    </View>
  )};
});
jest.mock('../features/sns/components/ReelsViewerModal', () => {
  const {Text, TouchableOpacity} = require('react-native');
  return {ReelsViewerModal: ({visible, initialIndex, onClose}) => visible
    ? <TouchableOpacity onPress={onClose}><Text>{`viewer:${initialIndex}`}</Text></TouchableOpacity>
    : null};
});
jest.mock('../features/sns/components/ReelCreatorModal', () => {
  const {Text, TouchableOpacity, View} = require('react-native');
  return {ReelCreatorModal: ({onClose, onShareToFeed}) => (
    <View>
      <TouchableOpacity onPress={() => onShareToFeed({
        reelId: 'r1', caption: 'shared', hashtags: ['#one'],
        runningStats: {distanceKm: 5}, totalCalories: 300,
      })}><Text>creator-share</Text></TouchableOpacity>
      <TouchableOpacity onPress={onClose}><Text>creator-close</Text></TouchableOpacity>
    </View>
  )};
});
jest.mock('../features/sns/components/SavedReelListItem', () => {
  const {Text, TouchableOpacity} = require('react-native');
  return {SavedReelListItem: ({reel, onPress}) => (
    <TouchableOpacity onPress={onPress}><Text>{`reel:${reel.id}`}</Text></TouchableOpacity>
  )};
});
jest.mock('../features/sns/components/SavedReelViewer', () => {
  const {Text, TouchableOpacity, View} = require('react-native');
  return {SavedReelViewer: ({reel, onClose, onShareToFeed}) => (
    <View>
      <Text>{`saved-viewer:${reel.id}`}</Text>
      <TouchableOpacity onPress={() => onShareToFeed({reelId: reel.id, caption: 'again'})}><Text>saved-share</Text></TouchableOpacity>
      <TouchableOpacity onPress={onClose}><Text>saved-close</Text></TouchableOpacity>
    </View>
  )};
});
jest.mock('../features/sns/components/PostComposerSheet', () => {
  const {Text, TouchableOpacity, View} = require('react-native');
  return {PostComposerSheet: ({visible, initialCaption, onClose, onPost}) => visible
    ? <View>
        <Text>{`composer:${initialCaption}`}</Text>
        <TouchableOpacity onPress={() => onPost('posted caption', ['#posted'])}><Text>composer-post</Text></TouchableOpacity>
        <TouchableOpacity onPress={onClose}><Text>composer-close</Text></TouchableOpacity>
      </View>
    : null};
});

import {FeedScreen} from '../features/sns/screens/FeedScreen';

const reel = (id, createdAt) => ({
  id, createdAt, caption: id, frames: [{type: 'running', distanceKm: 1, durationSeconds: 60}],
});

beforeEach(() => {
  jest.clearAllMocks();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  mockReels = [
    reel('r1', today.toISOString()),
    reel('r2', yesterday.toISOString()),
    reel('r3', '2024-01-03T01:00:00Z'),
  ];
  mockPosts = [
    {id: 'upost_linked', caption: 'mine', hashtags: [], reelId: 'r1', createdAt: today.toISOString()},
    {id: 'upost_missing', caption: 'missing', hashtags: [], reelId: 'absent', createdAt: today.toISOString()},
    {id: 'upost_plain', caption: 'plain', hashtags: [], createdAt: today.toISOString()},
  ];
});

test('feed loads, groups reels, opens viewers, deletes posts, and toggles section', () => {
  const view = render(<FeedScreen />);
  expect(mockLoadPosts).toHaveBeenCalled();
  expect(mockLoadReels).toHaveBeenCalled();
  expect(view.getByText(/오늘/)).toBeTruthy();
  expect(view.getByText(/어제/)).toBeTruthy();
  expect(view.getByText(/1월 3일/)).toBeTruthy();
  fireEvent.press(view.getByText('내 릴스 기록'));
  expect(view.queryByText('reel:r1')).toBeNull();
  fireEvent.press(view.getByText('내 릴스 기록'));
  fireEvent.press(view.getByText('delete:upost_linked'));
  expect(mockDeletePost).toHaveBeenCalledWith('upost_linked');

  fireEvent.press(view.getByText('post:upost_linked'));
  expect(view.getByText('saved-viewer:r1')).toBeTruthy();
  fireEvent.press(view.getByText('saved-close'));
  fireEvent.press(view.getByText('post:upost_missing'));
  fireEvent.press(view.getByText('post:upost_plain'));
  fireEvent.press(view.getByText('post:1'));
  expect(view.getByText('viewer:0')).toBeTruthy();
  fireEvent.press(view.getByText('viewer:0'));
});

test('feed creates a reel, shares it, publishes composer data, and reloads reels', async () => {
  const view = render(<FeedScreen />);
  fireEvent.press(view.getByText('+'));
  fireEvent.press(view.getByText('creator-share'));
  expect(view.getByText('composer:shared')).toBeTruthy();
  fireEvent.press(view.getByText('composer-post'));
  await waitFor(() => expect(mockCreatePost).toHaveBeenCalledWith({
    caption: 'posted caption', hashtags: ['#posted'], reelId: 'r1',
    runningStats: {distanceKm: 5}, totalCalories: 300,
  }));
  fireEvent.press(view.getByText('creator-close'));
  expect(mockLoadReels).toHaveBeenCalledTimes(2);

  fireEvent.press(view.getByText('reel:r1'));
  fireEvent.press(view.getByText('saved-share'));
  expect(view.getByText('composer:again')).toBeTruthy();
  fireEvent.press(view.getByText('composer-close'));
});

test('feed handles no saved reels while retaining recommendation posts', () => {
  mockReels = [];
  mockPosts = [];
  const view = render(<FeedScreen />);
  expect(view.queryByText('내 릴스 기록')).toBeNull();
  expect(view.getByText('post:1')).toBeTruthy();
});
