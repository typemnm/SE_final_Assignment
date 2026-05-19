import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {fetchFeedThunk, refreshFeedThunk} from '../store/snsSlice';

export const useSns = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {posts, loading, refreshing, error} = useSelector((state: RootState) => state.sns);

  const loadFeed = (page: number = 1) => dispatch(fetchFeedThunk(page));
  const refreshFeed = () => dispatch(refreshFeedThunk());

  return {posts, loading, refreshing, error, loadFeed, refreshFeed};
};
