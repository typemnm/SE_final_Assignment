export type HealthPlatform = 'apple' | 'samsung' | 'health_connect';
export type HealthConnectPlatform = 'health_connect';
export type HealthConnectSyncStatus = 'success' | 'partial_success' | 'failed';

/**
 * Legacy sync payload kept for existing Apple/Samsung code paths until the
 * Health Connect flow is fully migrated to HealthConnectSyncPayload.
 */
export interface HealthSyncData {
  platform: HealthPlatform;
  dietRecords: HealthDietRecord[];
  runningRecords: HealthRunningRecord[];
  syncedAt: string;
}

export interface HealthDietRecord {
  externalId?: string;
  date: string;
  mealType: string;
  calories: number;
  nutrients?: Record<string, number>;
}

export interface HealthRunningRecord {
  externalId?: string;
  startTime: string;
  endTime: string;
  distance: number;
  calories: number;
  durationSeconds?: number;
  avgPace?: number;
  route?: GpsPoint[];
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
}

export interface HealthConnectRoutePoint {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp: string;
}

export interface HealthConnectRunningRecord {
  externalId?: string;
  recordedAt: string;
  distanceKm: number;
  durationSeconds: number;
  avgPace: number;
  calories: number;
  route: HealthConnectRoutePoint[];
  /**
   * Speed samples are intentionally absent from the MVP persistence contract.
   * The Android adapter may read Health Connect Speed to derive avgPace/splits.
   */
}

export interface HealthConnectNutritionRecord {
  externalId?: string;
  recordedAt: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  name?: string;
}

export interface HealthConnectDailyActivityRecord {
  externalId: string;
  date: string;
  steps: number;
  activeCalories: number;
  totalCalories: number;
}

export interface HealthConnectHeartRateSample {
  time: string;
  bpm: number;
}

export interface HealthConnectHeartRateRecord {
  externalId?: string;
  startTime: string;
  endTime: string;
  samples: HealthConnectHeartRateSample[];
}

export interface HealthConnectSyncPayload {
  platform: HealthConnectPlatform;
  syncedAt: string;
  running: HealthConnectRunningRecord[];
  nutrition: HealthConnectNutritionRecord[];
  dailyActivity: HealthConnectDailyActivityRecord[];
  heartRate: HealthConnectHeartRateRecord[];
}

export interface HealthConnectGroupCounts {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface HealthConnectSyncResponse {
  status: HealthConnectSyncStatus;
  total: HealthConnectGroupCounts;
  groups: {
    running: HealthConnectGroupCounts;
    nutrition: HealthConnectGroupCounts;
    dailyActivity: HealthConnectGroupCounts;
    heartRate: HealthConnectGroupCounts;
  };
}

export const HEALTH_CONNECT_FALLBACK_KEY_POLICY = {
  primary: 'Health Connect metadata.id or clientRecordId when present',
  fallback: 'userId + recordType + source + stable time window + stable record values',
  speed: 'Speed is adapter-side derivation input only; raw speed samples are not part of MVP persistence',
} as const;
