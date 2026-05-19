export type HealthPlatform = 'apple' | 'samsung';

export interface HealthSyncData {
  platform: HealthPlatform;
  dietRecords: HealthDietRecord[];
  runningRecords: HealthRunningRecord[];
  syncedAt: string;
}

export interface HealthDietRecord {
  externalId: string;
  date: string;
  mealType: string;
  calories: number;
  nutrients?: Record<string, number>;
}

export interface HealthRunningRecord {
  externalId: string;
  startTime: string;
  endTime: string;
  distance: number;
  calories: number;
  route?: GpsPoint[];
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
}
