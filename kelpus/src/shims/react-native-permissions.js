export const check = async (permission) => 'granted';
export const request = async (permission) => 'granted';
export const checkMultiple = async (permissions) => {
  const result = {};
  permissions.forEach(p => { result[p] = 'granted'; });
  return result;
};
export const requestMultiple = async (permissions) => {
  const result = {};
  permissions.forEach(p => { result[p] = 'granted'; });
  return result;
};
export const PERMISSIONS = {
  ANDROID: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION', ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION' },
  IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE' },
};
export const RESULTS = { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked', UNAVAILABLE: 'unavailable', LIMITED: 'limited' };
export const openSettings = async () => {};
export const openLimitedPhotoLibraryPicker = async () => {};

const RNPermissions = { check, request, checkMultiple, requestMultiple, PERMISSIONS, RESULTS, openSettings };
export default RNPermissions;
