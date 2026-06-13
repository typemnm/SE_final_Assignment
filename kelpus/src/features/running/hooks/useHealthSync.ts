import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import type {AppDispatch} from '@store/index';
import {setSyncStatus, setRecords, setLoading, setError} from '../store/runningSlice';
import {runningService} from '../services/runningService';
import {syncHealthConnectData} from '../../health/hooks/useHealth';
import type {HealthSyncUxStatus} from '../../health/hooks/useHealth';

type RunningHealthSyncResult = {
  synced: number;
  skipped: number;
  failed: number;
  status: HealthSyncUxStatus;
  message?: string;
};

const toRunningResult = (status: HealthSyncUxStatus, message?: string): RunningHealthSyncResult => ({
  synced: 0,
  skipped: 0,
  failed: 0,
  status,
  message,
});

export const useHealthSync = () => {
  const dispatch = useDispatch<AppDispatch>();

  const syncFromHealth = useCallback(
    async (days = 7): Promise<RunningHealthSyncResult> => {
      dispatch(setSyncStatus({status: 'syncing'}));
      dispatch(setError(null));

      try {
        const result = await syncHealthConnectData({days});

        if (!result.response) {
          const terminalStatus = result.status === 'no_data' ? 'done' : 'error';
          dispatch(setSyncStatus({status: terminalStatus}));
          if (terminalStatus === 'error') {
            dispatch(setError(result.message ?? 'Health Connect 동기화에 실패했습니다.'));
          }
          return toRunningResult(result.status, result.message);
        }

        const runningCounts = result.response.groups.running;
        if (result.status === 'failed') {
          const message = result.message ?? 'Health Connect 기록 동기화에 실패했습니다.';
          dispatch(setSyncStatus({status: 'error'}));
          dispatch(setError(message));
          return {
            synced: runningCounts.created,
            skipped: runningCounts.skipped,
            failed: runningCounts.failed,
            status: result.status,
            message,
          };
        }

        try {
          dispatch(setLoading(true));
          const updated = await runningService.listRecords();
          dispatch(setRecords(updated));
        } catch {
          // Health Connect ingestion succeeded; list refresh can be retried by normal screen focus.
        } finally {
          dispatch(setLoading(false));
        }

        dispatch(setSyncStatus({status: 'done', time: new Date().toISOString()}));
        if (result.status === 'partial_success') {
          dispatch(setError('일부 Health Connect 기록을 동기화하지 못했습니다.'));
        }

        return {
          synced: runningCounts.created,
          skipped: runningCounts.skipped,
          failed: runningCounts.failed,
          status: result.status,
          message: result.status === 'partial_success' ? '일부 기록 동기화 실패' : undefined,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Health Connect 동기화에 실패했습니다.';
        dispatch(setSyncStatus({status: 'error'}));
        dispatch(setError(message));
        return toRunningResult('error', message);
      }
    },
    [dispatch],
  );

  return {syncFromHealth};
};
