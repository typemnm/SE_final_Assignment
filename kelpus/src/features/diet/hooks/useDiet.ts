import {useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {requestAnalysisThunk} from '../store/dietSlice';
import {dietApi} from '@api/diet.api';
import {captureDietImageFormData, DietCameraError} from '../services/dietCamera.service';
import {
  HealthConnectNutritionWriter,
  buildHealthConnectNutritionClientRecordVersion,
} from '@features/health/adapters/HealthConnectNutritionWriter';
import type {
  HealthConnectNutritionDeleteResult,
  HealthConnectNutritionExportResult,
  HealthConnectNutritionExportStatus,
  HealthConnectNutritionExportSource,
} from '@features/health/adapters/HealthConnectNutritionWriter';
import type {
  DietAnalysisResult,
  DietDeleteResponse,
  DietHealthConnectExportableRecord,
  DietHealthConnectExportStatus,
} from '@appTypes/diet.types';

export type DietHealthConnectExportUxStatus =
  | 'idle'
  | Extract<
      HealthConnectNutritionExportStatus,
      'exported' | 'permission_required' | 'unavailable' | 'failed'
    >;

export type HealthConnectNutritionBackfillSummary = {
  total: number;
  exported: number;
  skipped: number;
  failed: number;
  permissionRequired: number;
  unavailable: number;
};

export type DietHealthConnectDeleteTarget = {
  record_id: string;
  health_connect_client_record_id?: string | null;
  health_connect_record_id?: string | null;
  health_connect_record_version?: number | null;
};

export type DietHealthConnectDeleteResult = {
  healthConnectDelete: HealthConnectNutritionDeleteResult | null;
  backendDelete: DietDeleteResponse | null;
  backendDeleted: boolean;
};

export const getDietCaptureFlowErrorMessage = (err: unknown) => {
  if (err instanceof DietCameraError) {
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  if ((err as {response?: {status?: number}}).response?.status === 402) {
    return '일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.';
  }

  return '사진 업로드 또는 AI 분석 요청에 실패했습니다.';
};

const toBackendExportStatus = (
  status: HealthConnectNutritionExportResult['status'],
): DietHealthConnectExportStatus => {
  if (status === 'deleted') return 'deleted';
  return status;
};

const statusPersistenceError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'unknown status persistence error';
  return `Health Connect export status persistence failed: ${message}`;
};

const existingHealthConnectRecordId = (
  analysis: DietAnalysisResult | DietHealthConnectExportableRecord,
): string | null =>
  'health_connect_record_id' in analysis ? analysis.health_connect_record_id ?? null : null;

const existingHealthConnectRecordVersion = (
  analysis: DietAnalysisResult | DietHealthConnectExportableRecord,
): number | null =>
  'health_connect_record_version' in analysis
    ? analysis.health_connect_record_version ?? null
    : null;

export const persistHealthConnectNutritionExportStatus = async (
  analysis: DietAnalysisResult | DietHealthConnectExportableRecord,
  result: HealthConnectNutritionExportResult,
): Promise<void> => {
  if (!result.clientRecordId) return;

  await dietApi.updateHealthConnectExportStatus(analysis.record_id, {
    client_record_id: result.clientRecordId,
    record_id: result.recordId ?? existingHealthConnectRecordId(analysis),
    record_version: result.clientRecordVersion ?? existingHealthConnectRecordVersion(analysis),
    status: toBackendExportStatus(result.status),
    exported_at: result.status === 'exported' ? new Date().toISOString() : null,
    last_error: result.error ?? null,
  });
};

export const exportDietAnalysisToHealthConnect = async (
  analysis: DietAnalysisResult | DietHealthConnectExportableRecord,
  writer = new HealthConnectNutritionWriter(),
): Promise<HealthConnectNutritionExportResult> => {
  const result = await writer.exportAnalysis(analysis as HealthConnectNutritionExportSource);
  try {
    await persistHealthConnectNutritionExportStatus(analysis, result);
    return result;
  } catch (error) {
    return {
      status: 'failed',
      clientRecordId: result.clientRecordId,
      clientRecordVersion: result.clientRecordVersion,
      recordId: result.recordId,
      error: statusPersistenceError(error),
    };
  }
};

const emptyBackfillSummary = (): HealthConnectNutritionBackfillSummary => ({
  total: 0,
  exported: 0,
  skipped: 0,
  failed: 0,
  permissionRequired: 0,
  unavailable: 0,
});

export const backfillDietAnalysesToHealthConnect = async (
  writer = new HealthConnectNutritionWriter(),
): Promise<HealthConnectNutritionBackfillSummary> => {
  const records = await dietApi.getHealthConnectExportableRecords();
  const summary = emptyBackfillSummary();
  summary.total = records.length;

  for (const record of records) {
    let expectedVersion: number | null = null;
    try {
      expectedVersion = buildHealthConnectNutritionClientRecordVersion(record.analyzed_at);
    } catch {
      expectedVersion = null;
    }

    const isAlreadyCurrent =
      record.health_connect_export_status === 'exported' &&
      expectedVersion !== null &&
      record.health_connect_record_version !== null &&
      record.health_connect_record_version >= expectedVersion;

    if (isAlreadyCurrent) {
      summary.skipped += 1;
      continue;
    }

    const result = await exportDietAnalysisToHealthConnect(record, writer);
    if (result.status === 'exported') summary.exported += 1;
    else if (result.status === 'permission_required') summary.permissionRequired += 1;
    else if (result.status === 'unavailable') summary.unavailable += 1;
    else summary.failed += 1;
  }

  return summary;
};

export const deleteDietRecordWithHealthConnect = async (
  target: DietHealthConnectDeleteTarget,
  writer = new HealthConnectNutritionWriter(),
): Promise<DietHealthConnectDeleteResult> => {
  const hasHealthConnectIdentity =
    Boolean(target.health_connect_record_id) || Boolean(target.health_connect_client_record_id);

  if (!hasHealthConnectIdentity) {
    const backendDelete = await dietApi.deleteDietRecord(target.record_id);
    return {healthConnectDelete: null, backendDelete, backendDeleted: true};
  }

  const healthConnectDelete = await writer.deleteNutritionRecord({
    healthConnectRecordId: target.health_connect_record_id,
    clientRecordId: target.health_connect_client_record_id,
  });

  if (healthConnectDelete.status !== 'deleted' && target.health_connect_client_record_id) {
    try {
      await dietApi.updateHealthConnectExportStatus(target.record_id, {
        client_record_id: target.health_connect_client_record_id,
        record_id: target.health_connect_record_id ?? null,
        record_version: target.health_connect_record_version ?? null,
        status: healthConnectDelete.status,
        exported_at: null,
        last_error: healthConnectDelete.error ?? null,
      });
    } catch {
      // Deletion is user-requested and must not be stranded by best-effort export status sync.
    }
  }

  const backendDelete = await dietApi.deleteDietRecord(target.record_id);
  return {healthConnectDelete, backendDelete, backendDeleted: true};
};

export const useDiet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {records, currentAnalysis, analysisHistory, analyzing, error} = useSelector(
    (state: RootState) => state.diet,
  );
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [healthConnectExportStatus, setHealthConnectExportStatus] =
    useState<DietHealthConnectExportUxStatus>('idle');
  const [healthConnectExportError, setHealthConnectExportError] = useState<string | null>(null);
  const [healthConnectBackfillSummary, setHealthConnectBackfillSummary] =
    useState<HealthConnectNutritionBackfillSummary | null>(null);
  const [healthConnectBackfillBusy, setHealthConnectBackfillBusy] = useState(false);
  const [healthConnectBackfillError, setHealthConnectBackfillError] = useState<string | null>(null);
  const cameraFlowInFlightRef = useRef(false);

  const scheduleHealthConnectExport = (analysis: DietAnalysisResult) => {
    setHealthConnectExportStatus('idle');
    setHealthConnectExportError(null);
    void exportDietAnalysisToHealthConnect(analysis).then(result => {
      if (result.status === 'deleted') return;
      setHealthConnectExportStatus(result.status);
      setHealthConnectExportError(result.error ?? null);
    });
  };

  const clearCameraError = () => {
    setCameraError(null);
  };

  const requestAnalysis = async (dietImageUrl: string, recordId?: string) => {
    const analysis = await dispatch(requestAnalysisThunk({dietImageUrl, recordId})).unwrap();
    scheduleHealthConnectExport(analysis);
    return analysis;
  };

  const analyzeCapturedImage = async () => {
    if (cameraFlowInFlightRef.current) {
      return null;
    }

    cameraFlowInFlightRef.current = true;
    setCameraError(null);
    setCameraBusy(true);

    try {
      const formData = await captureDietImageFormData();

      if (!formData) {
        return null;
      }

      const uploadResult = await dietApi.uploadDietImage(formData);
      return await requestAnalysis(uploadResult.diet_image_url);
    } catch (err: unknown) {
      setCameraError(getDietCaptureFlowErrorMessage(err));
      return null;
    } finally {
      cameraFlowInFlightRef.current = false;
      setCameraBusy(false);
    }
  };

  const backfillHealthConnectNutrition = async () => {
    if (healthConnectBackfillBusy) {
      return null;
    }

    setHealthConnectBackfillBusy(true);
    setHealthConnectBackfillError(null);
    try {
      const summary = await backfillDietAnalysesToHealthConnect();
      setHealthConnectBackfillSummary(summary);
      return summary;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '기존 식단 분석의 Health Connect 내보내기에 실패했습니다.';
      setHealthConnectBackfillError(message);
      return null;
    } finally {
      setHealthConnectBackfillBusy(false);
    }
  };

  return {
    records,
    currentAnalysis,
    analysisHistory,
    analyzing,
    error,
    healthConnectExportStatus,
    healthConnectExportError,
    healthConnectBackfillSummary,
    healthConnectBackfillBusy,
    healthConnectBackfillError,
    cameraBusy,
    cameraError,
    clearCameraError,
    requestAnalysis,
    analyzeCapturedImage,
    backfillHealthConnectNutrition,
  };
};
