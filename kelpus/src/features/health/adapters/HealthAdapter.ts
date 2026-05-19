import type {HealthDietRecord, HealthRunningRecord} from '@appTypes/health.types';

export interface HealthAdapter {
  requestPermissions(): Promise<boolean>;
  getDietRecords(startDate: Date, endDate: Date): Promise<HealthDietRecord[]>;
  getRunningRecords(startDate: Date, endDate: Date): Promise<HealthRunningRecord[]>;
  isAvailable(): boolean;
}
