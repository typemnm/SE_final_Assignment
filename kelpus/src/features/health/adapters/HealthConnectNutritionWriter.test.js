jest.mock('react-native', () => ({
  Platform: {OS: 'android'},
}));

jest.mock('react-native-health-connect', () => ({
  deleteRecordsByUuids: jest.fn(),
  getGrantedPermissions: jest.fn(),
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  insertRecords: jest.fn(),
  MealType: {BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4, UNKNOWN: 0},
  RecordingMethod: {RECORDING_METHOD_MANUAL_ENTRY: 3},
  requestPermission: jest.fn(),
  SdkAvailabilityStatus: {
    SDK_AVAILABLE: 3,
    SDK_UNAVAILABLE: 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
  },
}));

import {
  deleteRecordsByUuids,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  requestPermission,
} from 'react-native-health-connect';
import {HEALTH_CONNECT_READ_PERMISSIONS} from './HealthConnectAdapter';
import {
  HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION,
  HealthConnectNutritionMappingError,
  HealthConnectNutritionWriter,
  buildHealthConnectNutritionClientRecordId,
  buildHealthConnectNutritionClientRecordVersion,
  mapDietAnalysisToHealthConnectNutritionRecord,
} from './HealthConnectNutritionWriter';

const analysis = overrides => ({
  analysis_id: 'analysis-1',
  record_id: 'diet-record-1',
  total_calories: 640,
  carb_ratio: 50,
  protein_ratio: 25,
  fat_ratio: 25,
  ai_comment: '균형 잡힌 식단입니다.',
  analyzed_at: '2026-06-11T01:10:00.123Z',
  visualization: {},
  ...overrides,
});

describe('HealthConnectNutritionWriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSdkStatus.mockResolvedValue(3);
    initialize.mockResolvedValue(true);
    getGrantedPermissions.mockResolvedValue([]);
    requestPermission.mockResolvedValue([HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION]);
    insertRecords.mockResolvedValue(['health-connect-uuid-1']);
    deleteRecordsByUuids.mockResolvedValue(undefined);
  });

  it('declares WRITE_NUTRITION separately from read adapter permissions', () => {
    expect(HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION).toEqual({
      accessType: 'write',
      recordType: 'Nutrition',
    });
    expect(
      HEALTH_CONNECT_READ_PERMISSIONS.every(permission => permission.accessType === 'read'),
    ).toBe(true);
    expect(HEALTH_CONNECT_READ_PERMISSIONS).not.toContainEqual(
      HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION,
    );
  });

  it('builds stable clientRecordId and timestamp-derived clientRecordVersion', () => {
    expect(buildHealthConnectNutritionClientRecordId('diet-record-1')).toBe(
      'kelpus:diet:diet-record-1',
    );
    expect(buildHealthConnectNutritionClientRecordVersion('2026-06-11T01:10:00.123Z')).toBe(
      Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
    );
  });

  it('maps diet analysis details to a Health Connect Nutrition record in kilocalories and grams', () => {
    const record = mapDietAnalysisToHealthConnectNutritionRecord(
      analysis({
        recorded_at: '2026-06-11T01:00:00.000Z',
        nutrition_details: {protein: 44.2, carbohydrate: 71.3, fat: 18.4, fiber: 6},
      }),
    );

    expect(record).toMatchObject({
      recordType: 'Nutrition',
      metadata: {
        clientRecordId: 'kelpus:diet:diet-record-1',
        clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
        recordingMethod: 3,
      },
      startTime: '2026-06-11T01:00:00.000Z',
      endTime: '2026-06-11T01:01:00.000Z',
      mealType: 0,
      energy: {value: 640, unit: 'kilocalories'},
      protein: {value: 44.2, unit: 'grams'},
      totalCarbohydrate: {value: 71.3, unit: 'grams'},
      totalFat: {value: 18.4, unit: 'grams'},
      dietaryFiber: {value: 6, unit: 'grams'},
    });
    expect(record.sugar).toBeUndefined();
  });

  it('derives macros from 4/4/9 calorie ratios when detail grams are absent', () => {
    const record = mapDietAnalysisToHealthConnectNutritionRecord(
      analysis({total_calories: 900, carb_ratio: 40, protein_ratio: 20, fat_ratio: 40}),
    );

    expect(record.totalCarbohydrate).toEqual({value: 90, unit: 'grams'});
    expect(record.protein).toEqual({value: 45, unit: 'grams'});
    expect(record.totalFat).toEqual({value: 40, unit: 'grams'});
  });

  it('omits missing or zero nutrient fields instead of writing empty nutrients', () => {
    const record = mapDietAnalysisToHealthConnectNutritionRecord(
      analysis({total_calories: 0, carb_ratio: 0, protein_ratio: 0, fat_ratio: 0}),
    );

    expect(record.energy).toBeUndefined();
    expect(record.protein).toBeUndefined();
    expect(record.totalCarbohydrate).toBeUndefined();
    expect(record.totalFat).toBeUndefined();
  });

  it('fails mapping for invalid timestamps before writing invalid Health Connect records', () => {
    expect(() =>
      mapDietAnalysisToHealthConnectNutritionRecord(analysis({analyzed_at: 'not-a-date'})),
    ).toThrow(HealthConnectNutritionMappingError);
  });

  it('requests fresh WRITE_NUTRITION permission before insertRecords and returns the native UUID', async () => {
    const result = await new HealthConnectNutritionWriter().exportAnalysis(analysis({}));

    expect(getSdkStatus).toHaveBeenCalled();
    expect(initialize).toHaveBeenCalled();
    expect(getGrantedPermissions).toHaveBeenCalled();
    expect(requestPermission).toHaveBeenCalledWith([HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION]);
    expect(insertRecords).toHaveBeenCalledWith([
      expect.objectContaining({
        recordType: 'Nutrition',
        metadata: expect.objectContaining({
          clientRecordId: 'kelpus:diet:diet-record-1',
          recordingMethod: 3,
        }),
      }),
    ]);
    expect(result).toEqual({
      status: 'exported',
      clientRecordId: 'kelpus:diet:diet-record-1',
      clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
      recordId: 'health-connect-uuid-1',
    });
  });

  it('returns permission_required when WRITE_NUTRITION is revoked or denied', async () => {
    requestPermission.mockResolvedValueOnce([]);

    await expect(new HealthConnectNutritionWriter().exportAnalysis(analysis({}))).resolves.toEqual({
      status: 'permission_required',
      clientRecordId: 'kelpus:diet:diet-record-1',
      clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
    });
    expect(insertRecords).not.toHaveBeenCalled();
  });

  it('returns unavailable without requesting permission when Health Connect SDK is unavailable', async () => {
    getSdkStatus.mockResolvedValueOnce(1);

    await expect(new HealthConnectNutritionWriter().exportAnalysis(analysis({}))).resolves.toEqual({
      status: 'unavailable',
      clientRecordId: 'kelpus:diet:diet-record-1',
      clientRecordVersion: Math.floor(Date.parse('2026-06-11T01:10:00.123Z') / 1000),
    });
    expect(initialize).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('returns failed instead of throwing when insertRecords rejects', async () => {
    insertRecords.mockRejectedValueOnce(new Error('native write failed'));

    await expect(
      new HealthConnectNutritionWriter().exportAnalysis(analysis({})),
    ).resolves.toMatchObject({
      status: 'failed',
      clientRecordId: 'kelpus:diet:diet-record-1',
      error: 'native write failed',
    });
  });

  it('deletes Nutrition records by Health Connect UUID and/or clientRecordId after fresh permission check', async () => {
    const result = await new HealthConnectNutritionWriter().deleteNutritionRecord({
      healthConnectRecordId: 'health-connect-uuid-1',
      clientRecordId: 'kelpus:diet:diet-record-1',
    });

    expect(getGrantedPermissions).toHaveBeenCalled();
    expect(requestPermission).toHaveBeenCalledWith([HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION]);
    expect(deleteRecordsByUuids).toHaveBeenCalledWith(
      'Nutrition',
      ['health-connect-uuid-1'],
      ['kelpus:diet:diet-record-1'],
    );
    expect(result).toEqual({
      status: 'deleted',
      recordId: 'health-connect-uuid-1',
      clientRecordId: 'kelpus:diet:diet-record-1',
    });
  });

  it('can delete by clientRecordId only for devices without a cached native UUID', async () => {
    await new HealthConnectNutritionWriter().deleteNutritionRecord({
      clientRecordId: 'kelpus:diet:diet-record-1',
    });

    expect(deleteRecordsByUuids).toHaveBeenCalledWith(
      'Nutrition',
      [],
      ['kelpus:diet:diet-record-1'],
    );
  });
});
