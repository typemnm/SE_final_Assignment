import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {
  setRecords,
  removeRecord,
  selectRecord,
  setLeaderboardEntries,
  setNearbyEntries,
  setLoading,
  setCourses,
  setCoursesLoading,
} from '../store/runningSlice';
import {runningService} from '../services/runningService';
import {SAMPLE_SYNC_REQUEST} from '../data/sampleRun';
import type {LeaderboardCriterion, LeaderboardPeriod} from '../types';

export const useRunning = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    records,
    selectedRecord,
    leaderboardEntries,
    myRank,
    myValue,
    nearbyEntries,
    nearbyMyRank,
    nearbyMyValue,
    nearbyTotalUsers,
    syncStatus,
    lastSyncTime,
    loading,
    courses,
    coursesLoading,
  } = useSelector((state: RootState) => state.running);

  const fetchRecords = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const data = await runningService.listRecords();
      // API 결과가 비어있으면 더미 레코드 유지
      if (data.length > 0) {
        dispatch(setRecords(data as any[]));
      }
    } catch {
      // 백엔드 연결 실패 시 초기 더미 레코드 그대로 유지
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const fetchLeaderboard = useCallback(
    async (period: LeaderboardPeriod, criterion: LeaderboardCriterion) => {
      try {
        const res = await runningService.getLeaderboard(period, criterion);
        dispatch(
          setLeaderboardEntries({
            entries: res.entries,
            period: res.period,
            criterion: res.criterion,
            myRank: res.myRank,
            myValue: res.myValue,
          }),
        );
      } catch (e) {
        // ignore
      }
    },
    [dispatch],
  );

  const fetchNearbyLeaderboard = useCallback(
    async (period: LeaderboardPeriod, criterion: LeaderboardCriterion) => {
      try {
        const res = await runningService.getNearbyLeaderboard(period, criterion);
        dispatch(setNearbyEntries(res));
      } catch (e) {
        // ignore
      }
    },
    [dispatch],
  );

  const deleteRunning = useCallback(
    async (id: string) => {
      await runningService.deleteRecord(id);
      dispatch(removeRecord(id));
    },
    [dispatch],
  );

  const addSampleRun = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      await runningService.syncRecord(SAMPLE_SYNC_REQUEST);
      const updated = await runningService.listRecords();
      dispatch(setRecords(updated as any[]));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const selectRunning = useCallback(
    (record: any) => dispatch(selectRecord(record)),
    [dispatch],
  );

  const fetchCourses = useCallback(async () => {
    dispatch(setCoursesLoading(true));
    try {
      const data = await runningService.getCourses();
      dispatch(setCourses(data));
    } catch (e) {
      // ignore
    } finally {
      dispatch(setCoursesLoading(false));
    }
  }, [dispatch]);

  return {
    records,
    selectedRecord,
    leaderboardEntries,
    myRank,
    myValue,
    nearbyEntries,
    nearbyMyRank,
    nearbyMyValue,
    nearbyTotalUsers,
    syncStatus,
    lastSyncTime,
    loading,
    courses,
    coursesLoading,
    fetchRecords,
    fetchLeaderboard,
    fetchNearbyLeaderboard,
    selectRunning,
    deleteRunning,
    addSampleRun,
    fetchCourses,
  };
};
