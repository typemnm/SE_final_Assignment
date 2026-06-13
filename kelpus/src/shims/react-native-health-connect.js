export const initialize = async () => true;
export const requestPermission = async (permissions = []) => permissions;
export const readRecords = async (recordType, options) => ({records: []});
export const getSdkStatus = async () => 3;
export const SdkAvailabilityStatus = {
  SDK_AVAILABLE: 3,
  SDK_UNAVAILABLE: 1,
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
};
export const getGrantedPermissions = async () => [];
export const revokeAllPermissions = async () => {};
export const insertRecords = async () => [];
export const deleteRecordsByUuids = async () => {};
export const aggregateRecord = async () => ({});

export const MealType = {
  UNKNOWN: 0,
  BREAKFAST: 1,
  LUNCH: 2,
  DINNER: 3,
  SNACK: 4,
};
export const RecordingMethod = {
  RECORDING_METHOD_UNKNOWN: 0,
  RECORDING_METHOD_ACTIVELY_RECORDED: 1,
  RECORDING_METHOD_AUTOMATICALLY_RECORDED: 2,
  RECORDING_METHOD_MANUAL_ENTRY: 3,
};
