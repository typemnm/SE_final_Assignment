export type {HealthAdapter} from './adapters/HealthAdapter';
export {AppleHealthAdapter} from './adapters/AppleHealthAdapter';
export {HealthConnectAdapter} from './adapters/HealthConnectAdapter';
export {
  HEALTH_CONNECT_WRITE_NUTRITION_PERMISSION,
  HealthConnectNutritionWriter,
  buildHealthConnectNutritionClientRecordId,
  buildHealthConnectNutritionClientRecordVersion,
  mapDietAnalysisToHealthConnectNutritionRecord,
} from './adapters/HealthConnectNutritionWriter';
export {SamsungHealthAdapter} from './adapters/SamsungHealthAdapter';
export {useHealth} from './hooks/useHealth';
