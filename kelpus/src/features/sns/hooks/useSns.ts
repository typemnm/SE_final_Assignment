import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {fetchFeedThunk, refreshFeedThunk} from '../store/snsSlice';

export const useSns = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {posts, loading, refreshing, error} = useSelector((state: RootState) => state.sns);

  const loadFeed = useCallback((page: number = 1) => dispatch(fetchFeedThunk(page)), [dispatch]);
  const refreshFeed = useCallback(() => dispatch(refreshFeedThunk()), [dispatch]);

  return {posts, loading, refreshing, error, loadFeed, refreshFeed};
};
