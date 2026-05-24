import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {setRecords, selectRecord, setLeaderboard, setLeaderboardEntries, setLoading} from '../store/runningSlice';
import {runningApi} from '@api/running.api';
import type {LeaderboardCriterion, LeaderboardPeriod, RunningRecord} from '@appTypes/running.types';

export const useRunning = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {records, selectedRecord, leaderboard, leaderboardEntries, loading} = useSelector(
    (state: RootState) => state.running,
  );

  const fetchRecords = async () => {
    dispatch(setLoading(true));
    try {
      const res = await runningApi.getRunningRecords();
      dispatch(setRecords(res.data));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchLeaderboard = async (period: LeaderboardPeriod, criterion: LeaderboardCriterion) => {
    const res = await runningApi.getLeaderboard(period, criterion);
    // 리더보드 목록 저장
    dispatch(setLeaderboardEntries(res.data));
  };

  const selectRunning = (record: RunningRecord) => dispatch(selectRecord(record));

  return {records, selectedRecord, leaderboard, leaderboardEntries, loading, fetchRecords, fetchLeaderboard, selectRunning};
};
