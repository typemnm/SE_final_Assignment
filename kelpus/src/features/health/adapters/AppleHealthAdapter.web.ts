// Web stub — HealthKit은 iOS 네이티브 빌드에서만 동작합니다.
import {Platform} from 'react-native';
import type {HealthAdapter} from './HealthAdapter';
import type {
  HealthConnectDailyActivityRecord,
  HealthConnectHeartRateRecord,
  HealthDietRecord,
  HealthRunningRecord,
} from '@appTypes/health.types';

export class AppleHealthAdapter implements HealthAdapter {
  isAvailable(): boolean {
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async getDietRecords(_startDate: Date, _endDate: Date): Promise<HealthDietRecord[]> {
    return [];
  }

  async getRunningRecords(_startDate: Date, _endDate: Date): Promise<HealthRunningRecord[]> {
    return [];
  }

  async getDailyActivityRecords(
    _startDate: Date,
    _endDate: Date,
  ): Promise<HealthConnectDailyActivityRecord[]> {
    return [];
  }

  async getHeartRateRecords(
    _startDate: Date,
    _endDate: Date,
  ): Promise<HealthConnectHeartRateRecord[]> {
    return [];
  }
}

void Platform; // suppress unused import warning
