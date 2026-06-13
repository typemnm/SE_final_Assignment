import {dietApi} from '../diet.api';
import {apiClient} from '../index';

jest.mock('../index', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('dietApi', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
    apiClient.get.mockReset();
    apiClient.patch.mockReset();
    apiClient.delete.mockReset();
  });

  it('uploads diet images as multipart form data to the backend file field contract', async () => {
    const formData = new FormData();
    formData.append('file', {uri: 'file:///meal.jpg', name: 'meal.jpg', type: 'image/jpeg'});
    apiClient.post.mockResolvedValue({
      data: {data: {diet_image_url: '/static/diet_uploads/meal.jpg', message: 'ok'}},
    });

    await expect(dietApi.uploadDietImage(formData)).resolves.toEqual({
      diet_image_url: '/static/diet_uploads/meal.jpg',
      message: 'ok',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/upload', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
  });

  it('persists Health Connect Nutrition export status with backend snake_case contract', async () => {
    apiClient.patch.mockResolvedValue({
      data: {
        data: {
          record_id: 'diet-record-1',
          health_connect_client_record_id: 'kelpus:diet:diet-record-1',
          health_connect_record_id: 'health-connect-uuid-1',
          health_connect_record_version: 1781140200,
          health_connect_export_status: 'exported',
          health_connect_exported_at: '2026-06-11T01:10:00Z',
          health_connect_last_error: null,
        },
      },
    });

    await expect(
      dietApi.updateHealthConnectExportStatus('diet-record-1', {
        client_record_id: 'kelpus:diet:diet-record-1',
        record_id: 'health-connect-uuid-1',
        record_version: 1781140200,
        status: 'exported',
        exported_at: '2026-06-11T01:10:00Z',
        last_error: null,
      }),
    ).resolves.toMatchObject({
      record_id: 'diet-record-1',
      health_connect_export_status: 'exported',
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/diet/diet-record-1/health-connect-export',
      {
        client_record_id: 'kelpus:diet:diet-record-1',
        record_id: 'health-connect-uuid-1',
        record_version: 1781140200,
        status: 'exported',
        exported_at: '2026-06-11T01:10:00Z',
        last_error: null,
      },
    );
  });

  it('fetches exportable analyses and deletes owned diet records through backend endpoints', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [
        {
          record_id: 'diet-record-1',
          analysis_id: 'analysis-1',
          recorded_at: '2026-06-11T01:00:00Z',
          analyzed_at: '2026-06-11T01:10:00Z',
          total_calories: 640,
          carb_ratio: 50,
          protein_ratio: 25,
          fat_ratio: 25,
          nutrition_data: null,
          health_connect_export_status: 'not_exported',
        },
      ],
    });
    apiClient.delete.mockResolvedValueOnce({
      data: {
        record_id: 'diet-record-1',
        deleted: true,
        health_connect_client_record_id: 'kelpus:diet:diet-record-1',
        health_connect_record_id: 'health-connect-uuid-1',
        health_connect_export_status: 'deleted',
      },
    });

    await expect(dietApi.getHealthConnectExportableRecords()).resolves.toHaveLength(1);
    await expect(dietApi.deleteDietRecord('diet-record-1')).resolves.toMatchObject({
      deleted: true,
      health_connect_export_status: 'deleted',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/diet/exportable');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/diet/diet-record-1');
  });
});
