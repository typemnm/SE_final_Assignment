import {
  backfillDietAnalysesToHealthConnect,
  deleteDietRecordWithHealthConnect,
  exportDietAnalysisToHealthConnect,
  getDietCaptureFlowErrorMessage,
} from './useDiet';
import {DietCameraError} from '../services/dietCamera.service';
import {dietApi} from '@api/diet.api';

jest.mock('@api/diet.api', () => ({
  dietApi: {
    deleteDietRecord: jest.fn(),
    getHealthConnectExportableRecords: jest.fn(),
    updateHealthConnectExportStatus: jest.fn(),
  },
}));

const analysis = {
  analysis_id: 'analysis-1',
  record_id: 'diet-record-1',
  total_calories: 640,
  carb_ratio: 50,
  protein_ratio: 25,
  fat_ratio: 25,
  ai_comment: 'ok',
  analyzed_at: '2026-06-11T01:10:00.123Z',
};

describe('useDiet camera flow error mapping', () => {
  beforeEach(() => {
    dietApi.deleteDietRecord.mockReset();
    dietApi.getHealthConnectExportableRecords.mockReset();
    dietApi.updateHealthConnectExportStatus.mockReset();
  });

  it('keeps analysis 402 messages user-facing', () => {
    expect(getDietCaptureFlowErrorMessage({response: {status: 402}})).toBe(
      '일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.',
    );
  });

  it('keeps rejected analysis messages and upload failures visible', () => {
    expect(getDietCaptureFlowErrorMessage('AI 분석 요청에 실패했습니다.')).toBe(
      'AI 분석 요청에 실패했습니다.',
    );
    expect(getDietCaptureFlowErrorMessage(new Error('upload failed'))).toBe(
      '사진 업로드 또는 AI 분석 요청에 실패했습니다.',
    );
  });

  it('uses camera-specific error messages', () => {
    const error = new DietCameraError('카메라 권한이 필요합니다.', 'permission');

    expect(getDietCaptureFlowErrorMessage(error)).toBe('카메라 권한이 필요합니다.');
  });

  it('exports analyzed nutrition after backend save and persists exported status', async () => {
    dietApi.updateHealthConnectExportStatus.mockResolvedValue({
      health_connect_export_status: 'exported',
    });
    const writer = {
      exportAnalysis: jest.fn().mockResolvedValue({
        status: 'exported',
        clientRecordId: 'kelpus:diet:diet-record-1',
        clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
        recordId: 'health-connect-uuid-1',
      }),
    };

    await expect(exportDietAnalysisToHealthConnect(analysis, writer)).resolves.toMatchObject({
      status: 'exported',
      recordId: 'health-connect-uuid-1',
    });

    expect(writer.exportAnalysis).toHaveBeenCalledWith(analysis);
    expect(dietApi.updateHealthConnectExportStatus).toHaveBeenCalledWith('diet-record-1', {
      client_record_id: 'kelpus:diet:diet-record-1',
      record_id: 'health-connect-uuid-1',
      record_version: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
      status: 'exported',
      exported_at: expect.any(String),
      last_error: null,
    });
  });

  it('persists permission-required export status without converting analysis success into failure', async () => {
    dietApi.updateHealthConnectExportStatus.mockResolvedValue({
      health_connect_export_status: 'permission_required',
    });
    const writer = {
      exportAnalysis: jest.fn().mockResolvedValue({
        status: 'permission_required',
        clientRecordId: 'kelpus:diet:diet-record-1',
        clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
      }),
    };

    await expect(exportDietAnalysisToHealthConnect(analysis, writer)).resolves.toEqual({
      status: 'permission_required',
      clientRecordId: 'kelpus:diet:diet-record-1',
      clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
    });

    expect(dietApi.updateHealthConnectExportStatus).toHaveBeenCalledWith(
      'diet-record-1',
      expect.objectContaining({
        status: 'permission_required',
        exported_at: null,
        last_error: null,
      }),
    );
  });

  it('preserves existing Health Connect identity when persisting a failed retry', async () => {
    dietApi.updateHealthConnectExportStatus.mockResolvedValue({
      health_connect_export_status: 'permission_required',
    });
    const exportableRecord = {
      ...analysis,
      recorded_at: '2026-06-11T01:00:00.000Z',
      nutrition_data: null,
      health_connect_client_record_id: 'kelpus:diet:diet-record-1',
      health_connect_record_id: 'existing-uuid',
      health_connect_record_version: 1781140000,
      health_connect_export_status: 'exported',
      health_connect_exported_at: '2026-06-11T01:09:00.000Z',
      health_connect_last_error: null,
    };
    const writer = {
      exportAnalysis: jest.fn().mockResolvedValue({
        status: 'permission_required',
        clientRecordId: 'kelpus:diet:diet-record-1',
      }),
    };

    await exportDietAnalysisToHealthConnect(exportableRecord, writer);

    expect(dietApi.updateHealthConnectExportStatus).toHaveBeenCalledWith('diet-record-1', {
      client_record_id: 'kelpus:diet:diet-record-1',
      record_id: 'existing-uuid',
      record_version: 1781140000,
      status: 'permission_required',
      exported_at: null,
      last_error: null,
    });
  });

  it('returns a failed export status if status persistence fails without throwing', async () => {
    dietApi.updateHealthConnectExportStatus.mockRejectedValue(new Error('api down'));
    const writer = {
      exportAnalysis: jest.fn().mockResolvedValue({
        status: 'exported',
        clientRecordId: 'kelpus:diet:diet-record-1',
        clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
        recordId: 'health-connect-uuid-1',
      }),
    };

    await expect(exportDietAnalysisToHealthConnect(analysis, writer)).resolves.toMatchObject({
      status: 'failed',
      clientRecordId: 'kelpus:diet:diet-record-1',
      recordId: 'health-connect-uuid-1',
      error: 'Health Connect export status persistence failed: api down',
    });
  });

  it('backfills exportable records idempotently and skips already-exported analyses', async () => {
    dietApi.getHealthConnectExportableRecords.mockResolvedValue([
      {
        ...analysis,
        recorded_at: '2026-06-11T01:00:00.000Z',
        nutrition_data: null,
        health_connect_export_status: 'not_exported',
      },
      {
        ...analysis,
        record_id: 'diet-record-2',
        analysis_id: 'analysis-2',
        recorded_at: '2026-06-11T02:00:00.000Z',
        nutrition_data: null,
        health_connect_export_status: 'exported',
        health_connect_record_version: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
      },
      {
        ...analysis,
        record_id: 'diet-record-3',
        analysis_id: 'analysis-3',
        recorded_at: '2026-06-11T03:00:00.000Z',
        nutrition_data: null,
        health_connect_export_status: 'failed',
      },
      {
        ...analysis,
        record_id: 'diet-record-4',
        analysis_id: 'analysis-4',
        recorded_at: '2026-06-11T04:00:00.000Z',
        nutrition_data: null,
        health_connect_export_status: 'exported',
        health_connect_record_version: 1,
      },
    ]);
    dietApi.updateHealthConnectExportStatus.mockResolvedValue({});
    const writer = {
      exportAnalysis: jest
        .fn()
        .mockResolvedValueOnce({
          status: 'exported',
          clientRecordId: 'kelpus:diet:diet-record-1',
          clientRecordVersion: 1,
          recordId: 'uuid-1',
        })
        .mockResolvedValueOnce({
          status: 'failed',
          clientRecordId: 'kelpus:diet:diet-record-3',
          clientRecordVersion: 3,
          error: 'native failed',
        })
        .mockResolvedValueOnce({
          status: 'exported',
          clientRecordId: 'kelpus:diet:diet-record-4',
          clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
          recordId: 'uuid-4',
        }),
    };

    await expect(backfillDietAnalysesToHealthConnect(writer)).resolves.toEqual({
      total: 4,
      exported: 2,
      skipped: 1,
      failed: 1,
      permissionRequired: 0,
      unavailable: 0,
    });

    expect(writer.exportAnalysis).toHaveBeenCalledTimes(3);
    expect(writer.exportAnalysis.mock.calls.map(call => call[0].record_id)).toEqual([
      'diet-record-1',
      'diet-record-3',
      'diet-record-4',
    ]);
  });

  it('deletes Health Connect Nutrition before backend delete when export metadata exists', async () => {
    dietApi.deleteDietRecord.mockResolvedValue({
      record_id: 'diet-record-1',
      deleted: true,
      health_connect_client_record_id: 'kelpus:diet:diet-record-1',
      health_connect_record_id: 'uuid-1',
      health_connect_export_status: 'deleted',
    });
    const writer = {
      deleteNutritionRecord: jest.fn().mockResolvedValue({
        status: 'deleted',
        recordId: 'uuid-1',
        clientRecordId: 'kelpus:diet:diet-record-1',
      }),
    };

    await expect(
      deleteDietRecordWithHealthConnect(
        {
          record_id: 'diet-record-1',
          health_connect_client_record_id: 'kelpus:diet:diet-record-1',
          health_connect_record_id: 'uuid-1',
          health_connect_record_version: 1,
        },
        writer,
      ),
    ).resolves.toMatchObject({backendDeleted: true});

    expect(writer.deleteNutritionRecord).toHaveBeenCalledWith({
      healthConnectRecordId: 'uuid-1',
      clientRecordId: 'kelpus:diet:diet-record-1',
    });
    expect(dietApi.deleteDietRecord).toHaveBeenCalledWith('diet-record-1');
    expect(writer.deleteNutritionRecord.mock.invocationCallOrder[0]).toBeLessThan(
      dietApi.deleteDietRecord.mock.invocationCallOrder[0],
    );
  });

  it('still deletes backend record when Health Connect failure status persistence fails', async () => {
    dietApi.updateHealthConnectExportStatus.mockRejectedValue(new Error('status API down'));
    dietApi.deleteDietRecord.mockResolvedValue({
      record_id: 'diet-record-1',
      deleted: true,
      health_connect_client_record_id: 'kelpus:diet:diet-record-1',
      health_connect_record_id: null,
      health_connect_export_status: 'permission_required',
    });
    const writer = {
      deleteNutritionRecord: jest.fn().mockResolvedValue({
        status: 'permission_required',
        clientRecordId: 'kelpus:diet:diet-record-1',
        error: 'permission revoked',
      }),
    };

    await expect(
      deleteDietRecordWithHealthConnect(
        {
          record_id: 'diet-record-1',
          health_connect_client_record_id: 'kelpus:diet:diet-record-1',
          health_connect_record_id: null,
          health_connect_record_version: 7,
        },
        writer,
      ),
    ).resolves.toMatchObject({backendDeleted: true});

    expect(dietApi.updateHealthConnectExportStatus).toHaveBeenCalled();
    expect(dietApi.deleteDietRecord).toHaveBeenCalledWith('diet-record-1');
  });

  it('records Health Connect delete failure before backend delete proceeds', async () => {
    dietApi.updateHealthConnectExportStatus.mockResolvedValue({});
    dietApi.deleteDietRecord.mockResolvedValue({
      record_id: 'diet-record-1',
      deleted: true,
      health_connect_client_record_id: 'kelpus:diet:diet-record-1',
      health_connect_record_id: null,
      health_connect_export_status: 'permission_required',
    });
    const writer = {
      deleteNutritionRecord: jest.fn().mockResolvedValue({
        status: 'permission_required',
        clientRecordId: 'kelpus:diet:diet-record-1',
        error: 'permission revoked',
      }),
    };

    await expect(
      deleteDietRecordWithHealthConnect(
        {
          record_id: 'diet-record-1',
          health_connect_client_record_id: 'kelpus:diet:diet-record-1',
          health_connect_record_id: null,
          health_connect_record_version: 7,
        },
        writer,
      ),
    ).resolves.toMatchObject({backendDeleted: true});

    expect(dietApi.updateHealthConnectExportStatus).toHaveBeenCalledWith('diet-record-1', {
      client_record_id: 'kelpus:diet:diet-record-1',
      record_id: null,
      record_version: 7,
      status: 'permission_required',
      exported_at: null,
      last_error: 'permission revoked',
    });
    expect(dietApi.deleteDietRecord).toHaveBeenCalledWith('diet-record-1');
    expect(dietApi.updateHealthConnectExportStatus.mock.invocationCallOrder[0]).toBeLessThan(
      dietApi.deleteDietRecord.mock.invocationCallOrder[0],
    );
  });
});
