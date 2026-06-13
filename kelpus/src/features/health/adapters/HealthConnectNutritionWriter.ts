import {Platform} from 'react-native';
import {
  deleteRecordsByUuids,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  MealType,
  RecordingMethod,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type {HealthConnectRecord, Permission} from 'react-native-health-connect';
import type {
  DietAnalysisResult,
  DietHealthConnectExportableRecord,
  NutritionDetails,
} from '@appTypes/diet.types';

export const HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION = {
  accessType: 'write',
  recordType: 'Nutrition',
} as const;

export type HealthConnectNutritionExportStatus =
  | 'exported'
  | 'permission_required'
  | 'unavailable'
  | 'failed'
  | 'deleted';

export type HealthConnectNutritionExportSource = Pick<
  DietAnalysisResult,
  | 'analysis_id'
  | 'record_id'
  | 'total_calories'
  | 'carb_ratio'
  | 'protein_ratio'
  | 'fat_ratio'
  | 'analyzed_at'
  | 'nutrition_details'
> & {
  ai_comment?: string | null;
  visualization?: DietAnalysisResult['visualization'];
  recorded_at?: string;
  nutrition_data?: DietHealthConnectExportableRecord['nutrition_data'];
};

export type HealthConnectNutritionExportResult = {
  status: HealthConnectNutritionExportStatus;
  clientRecordId?: string;
  clientRecordVersion?: number;
  recordId?: string;
  error?: string;
};

export type HealthConnectNutritionDeleteRequest = {
  healthConnectRecordId?: string | null;
  clientRecordId?: string | null;
};

export type HealthConnectNutritionDeleteResult = {
  status: Extract<
    HealthConnectNutritionExportStatus,
    'deleted' | 'permission_required' | 'unavailable' | 'failed'
  >;
  recordId?: string;
  clientRecordId?: string;
  error?: string;
};

export class HealthConnectNutritionMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HealthConnectNutritionMappingError';
  }
}

const permissionKey = (permission: {accessType: string; recordType: string}): string =>
  `${permission.accessType}:${permission.recordType}`;

const writePermission = (): Permission => HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION as Permission;

const isWriteNutritionGranted = (permissions: Permission[]): boolean =>
  permissions.some(
    permission =>
      permissionKey(permission) === permissionKey(HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION),
  );

export const buildHealthConnectNutritionClientRecordId = (recordId: string): string =>
  `kelpus:diet:${recordId}`;

export const buildHealthConnectNutritionClientRecordVersion = (analyzedAt: string): number => {
  const version = new Date(analyzedAt).getTime();
  if (!Number.isFinite(version)) {
    throw new HealthConnectNutritionMappingError(
      'Invalid analyzed_at timestamp for Health Connect export.',
    );
  }
  return Math.max(0, Math.floor(version / 1000));
};

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const positiveNumber = (value: unknown): number | undefined => {
  const parsed = finiteNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
};

const grams = (value: unknown): {value: number; unit: 'grams'} | undefined => {
  const parsed = positiveNumber(value);
  return parsed === undefined ? undefined : {value: Math.round(parsed * 10) / 10, unit: 'grams'};
};

const kilocalories = (value: unknown): {value: number; unit: 'kilocalories'} | undefined => {
  const parsed = positiveNumber(value);
  return parsed === undefined
    ? undefined
    : {value: Math.round(parsed * 10) / 10, unit: 'kilocalories'};
};

const detailValue = (
  details: NutritionDetails | undefined,
  nutritionData: HealthConnectNutritionExportSource['nutrition_data'],
  ...keys: Array<
    keyof NutritionDetails | keyof NonNullable<HealthConnectNutritionExportSource['nutrition_data']>
  >
): number | undefined => {
  for (const key of keys) {
    const fromDetails = details?.[key as keyof NutritionDetails];
    const parsedDetails = positiveNumber(fromDetails);
    if (parsedDetails !== undefined) return parsedDetails;

    const fromData =
      nutritionData?.[
        key as keyof NonNullable<HealthConnectNutritionExportSource['nutrition_data']>
      ];
    const parsedData = positiveNumber(fromData);
    if (parsedData !== undefined) return parsedData;
  }
  return undefined;
};

const deriveMacroGrams = (
  totalCalories: number,
  ratio: number,
  kcalPerGram: number,
): number | undefined => {
  if (
    !Number.isFinite(totalCalories) ||
    !Number.isFinite(ratio) ||
    totalCalories <= 0 ||
    ratio <= 0
  ) {
    return undefined;
  }
  return (totalCalories * (ratio / 100)) / kcalPerGram;
};

const exportStartTime = (analysis: HealthConnectNutritionExportSource): string => {
  const timestamp = analysis.recorded_at ?? analysis.analyzed_at;
  const startMs = new Date(timestamp).getTime();
  if (!Number.isFinite(startMs)) {
    throw new HealthConnectNutritionMappingError(
      'Invalid recorded_at/analyzed_at timestamp for Health Connect export.',
    );
  }
  return new Date(startMs).toISOString();
};

export const mapDietAnalysisToHealthConnectNutritionRecord = (
  analysis: HealthConnectNutritionExportSource,
): HealthConnectRecord => {
  const clientRecordId = buildHealthConnectNutritionClientRecordId(analysis.record_id);
  const clientRecordVersion = buildHealthConnectNutritionClientRecordVersion(analysis.analyzed_at);
  const startTime = exportStartTime(analysis);
  const endTime = new Date(new Date(startTime).getTime() + 60_000).toISOString();
  const details = analysis.nutrition_details;
  const nutritionData = analysis.nutrition_data;
  const totalCalories =
    positiveNumber(analysis.total_calories) ?? positiveNumber(nutritionData?.calories) ?? 0;
  const protein =
    detailValue(details, nutritionData, 'protein') ??
    deriveMacroGrams(totalCalories, analysis.protein_ratio, 4);
  const carbohydrate =
    detailValue(details, nutritionData, 'carbohydrate', 'carbohydrates', 'carbs') ??
    deriveMacroGrams(totalCalories, analysis.carb_ratio, 4);
  const fat =
    detailValue(details, nutritionData, 'fat') ??
    deriveMacroGrams(totalCalories, analysis.fat_ratio, 9);
  const fiber = detailValue(details, nutritionData, 'fiber');
  const sugar = detailValue(details, nutritionData, 'sugar');
  const energy = kilocalories(totalCalories);
  const proteinMass = grams(protein);
  const carbohydrateMass = grams(carbohydrate);
  const fatMass = grams(fat);
  const fiberMass = grams(fiber);
  const sugarMass = grams(sugar);

  return {
    recordType: 'Nutrition',
    metadata: {
      clientRecordId,
      clientRecordVersion,
      recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY,
    },
    startTime,
    endTime,
    mealType: MealType.UNKNOWN,
    name: nutritionData?.name ?? 'Kelpus AI diet analysis',
    ...(energy ? {energy} : {}),
    ...(proteinMass ? {protein: proteinMass} : {}),
    ...(carbohydrateMass ? {totalCarbohydrate: carbohydrateMass} : {}),
    ...(fatMass ? {totalFat: fatMass} : {}),
    ...(fiberMass ? {dietaryFiber: fiberMass} : {}),
    ...(sugarMass ? {sugar: sugarMass} : {}),
  } as HealthConnectRecord;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Health Connect Nutrition export failed.';

export class HealthConnectNutritionWriter {
  async getAvailabilityStatus(): Promise<number> {
    if (Platform.OS !== 'android') return SdkAvailabilityStatus.SDK_UNAVAILABLE;
    try {
      return await getSdkStatus();
    } catch {
      return SdkAvailabilityStatus.SDK_UNAVAILABLE;
    }
  }

  async requestWritePermission(): Promise<boolean> {
    const availability = await this.getAvailabilityStatus();
    if (availability !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    const initialized = await initialize();
    if (!initialized) return false;

    const alreadyGranted = await getGrantedPermissions();
    if (isWriteNutritionGranted(alreadyGranted)) return true;

    const granted = await requestPermission([writePermission()]);
    return isWriteNutritionGranted(granted);
  }

  async exportAnalysis(
    analysis: HealthConnectNutritionExportSource,
  ): Promise<HealthConnectNutritionExportResult> {
    const clientRecordId = buildHealthConnectNutritionClientRecordId(analysis.record_id);
    let clientRecordVersion: number | undefined;

    try {
      clientRecordVersion = buildHealthConnectNutritionClientRecordVersion(analysis.analyzed_at);
      const availability = await this.getAvailabilityStatus();
      if (availability !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        return {status: 'unavailable', clientRecordId, clientRecordVersion};
      }

      const hasPermission = await this.requestWritePermission();
      if (!hasPermission) {
        return {status: 'permission_required', clientRecordId, clientRecordVersion};
      }

      const record = mapDietAnalysisToHealthConnectNutritionRecord(analysis);
      const recordIds = await insertRecords([record]);
      return {
        status: 'exported',
        clientRecordId,
        clientRecordVersion,
        recordId: recordIds[0],
      };
    } catch (error) {
      return {
        status: 'failed',
        clientRecordId,
        clientRecordVersion,
        error: errorMessage(error),
      };
    }
  }

  async deleteNutritionRecord(
    request: HealthConnectNutritionDeleteRequest,
  ): Promise<HealthConnectNutritionDeleteResult> {
    try {
      const availability = await this.getAvailabilityStatus();
      if (availability !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        return {
          status: 'unavailable',
          recordId: request.healthConnectRecordId ?? undefined,
          clientRecordId: request.clientRecordId ?? undefined,
        };
      }

      const hasPermission = await this.requestWritePermission();
      if (!hasPermission) {
        return {
          status: 'permission_required',
          recordId: request.healthConnectRecordId ?? undefined,
          clientRecordId: request.clientRecordId ?? undefined,
        };
      }

      const recordIds = request.healthConnectRecordId ? [request.healthConnectRecordId] : [];
      const clientRecordIds = request.clientRecordId ? [request.clientRecordId] : [];
      if (recordIds.length === 0 && clientRecordIds.length === 0) {
        return {status: 'failed', error: 'No Health Connect record id or clientRecordId provided.'};
      }

      await deleteRecordsByUuids('Nutrition', recordIds, clientRecordIds);
      return {
        status: 'deleted',
        recordId: request.healthConnectRecordId ?? undefined,
        clientRecordId: request.clientRecordId ?? undefined,
      };
    } catch (error) {
      return {
        status: 'failed',
        recordId: request.healthConnectRecordId ?? undefined,
        clientRecordId: request.clientRecordId ?? undefined,
        error: errorMessage(error),
      };
    }
  }
}
