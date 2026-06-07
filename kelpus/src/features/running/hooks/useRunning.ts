import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {setRecords, selectRecord, setLeaderboardEntries, setLoading} from '../store/runningSlice';
import {runningApi} from '@api/running.api';
import type {LeaderboardCriterion, LeaderboardPeriod, RunningRecord} from '@appTypes/running.types';

export const useRunning = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {records, selectedRecord, leaderboard, leaderboardEntries, loading} = useSelector(
    (state: RootState) => state.running,
  );

  const fetchRecords = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const res = await runningApi.getRunningRecords();
      dispatch(setRecords(res.data));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const fetchLeaderboard = useCallback(
    async (period: LeaderboardPeriod, criterion: LeaderboardCriterion) => {
      const res = await runningApi.getLeaderboard(period, criterion);
      // 리더보드 목록 저장
      dispatch(setLeaderboardEntries(res.data));
    },
    [dispatch],
  );

  const selectRunning = useCallback(
    (record: RunningRecord) => dispatch(selectRecord(record)),
    [dispatch],
  );

  return {
    records,
    selectedRecord,
    leaderboard,
    leaderboardEntries,
    loading,
    fetchRecords,
    fetchLeaderboard,
    selectRunning,
  };
};
