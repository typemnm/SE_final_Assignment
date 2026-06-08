// Web shim for react-native-health (iOS HealthKit only)
export const Permissions = {};
export const HKWorkoutActivityTypeRunning = 37;
export const initHealthKit = (_permissions, callback) => callback('not available on web');
export const isAvailable = (_callback) => {};
export const getDietaryEnergyConsumedSamples = (_options, callback) => callback(null, []);
export const getSamples = (_options, callback) => callback(null, []);
export const getWorkoutSamples = (_options, callback) => callback(null, []);
export default {
  Permissions,
  HKWorkoutActivityTypeRunning,
  initHealthKit,
  isAvailable,
  getDietaryEnergyConsumedSamples,
  getSamples,
  getWorkoutSamples,
};
