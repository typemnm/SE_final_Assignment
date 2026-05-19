import {Platform} from 'react-native';
import type {HealthAdapter} from './HealthAdapter';
import type {HealthDietRecord, HealthRunningRecord} from '@appTypes/health.types';

// iOS 전용 어댑터 — Android에서는 SamsungHealthAdapter(Health Connect)를 사용하세요.
// 실제 구현 시 'react-native-health' 패키지 설치 필요 (Mac + Xcode 환경):
//   npm install react-native-health && cd ios && pod install
export class AppleHealthAdapter implements HealthAdapter {
  isAvailable(): boolean {
    return Platform.OS === 'ios';
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    // TODO: react-native-health 패키지로 HealthKit 권한 요청 구현
    return Promise.resolve(false);
  }

  async getDietRecords(_startDate: Date, _endDate: Date): Promise<HealthDietRecord[]> {
    if (Platform.OS !== 'ios') return [];
    // TODO: react-native-health 패키지로 HealthKit 식단 데이터 조회 구현
    return Promise.resolve([]);
  }

  async getRunningRecords(_startDate: Date, _endDate: Date): Promise<HealthRunningRecord[]> {
    if (Platform.OS !== 'ios') return [];
    // TODO: react-native-health 패키지로 HealthKit 러닝 데이터 조회 구현
    return Promise.resolve([]);
  }
}
