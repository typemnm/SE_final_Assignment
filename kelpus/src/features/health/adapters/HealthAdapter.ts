import type {
  HealthConnectDailyActivityRecord,
  HealthConnectHeartRateRecord,
  HealthDietRecord,
  HealthRunningRecord,
} from '@appTypes/health.types';

export interface HealthAdapter {
  requestPermissions(): Promise<boolean>;
  getDietRecords(startDate: Date, endDate: Date): Promise<HealthDietRecord[]>;
  getRunningRecords(startDate: Date, endDate: Date): Promise<HealthRunningRecord[]>;
  getDailyActivityRecords(
    startDate: Date,
    endDate: Date,
  ): Promise<HealthConnectDailyActivityRecord[]>;
  getHeartRateRecords(startDate: Date, endDate: Date): Promise<HealthConnectHeartRateRecord[]>;
  isAvailable(): boolean;
}
