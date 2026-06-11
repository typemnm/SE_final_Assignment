import {launchCamera, type Asset, type ErrorCode} from 'react-native-image-picker';

export class DietCameraError extends Error {
  constructor(
    message: string,
    public readonly code: 'camera_unavailable' | 'permission' | 'invalid_asset' | 'others',
  ) {
    super(message);
    this.name = 'DietCameraError';
  }
}

const CAMERA_ERROR_MESSAGES: Record<ErrorCode | 'invalid_asset', string> = {
  camera_unavailable: '이 기기에서는 카메라를 사용할 수 없습니다.',
  permission: '카메라 권한이 필요합니다. 설정에서 카메라 권한을 허용해 주세요.',
  others: '카메라를 실행하지 못했습니다. 다시 시도해 주세요.',
  invalid_asset: '촬영한 사진 정보를 읽을 수 없습니다. 다시 촬영해 주세요.',
};

const getCameraErrorMessage = (code: ErrorCode | 'invalid_asset', fallback?: string) =>
  fallback?.trim() || CAMERA_ERROR_MESSAGES[code];

export const createDietImageFormData = (asset: Asset): FormData => {
  if (!asset.uri) {
    throw new DietCameraError(CAMERA_ERROR_MESSAGES.invalid_asset, 'invalid_asset');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName || `diet-photo-${Date.now()}.jpg`,
    type: asset.type || 'image/jpeg',
  } as unknown as Blob);
  return formData;
};

export const captureDietImageFormData = async (): Promise<FormData | null> => {
  const response = await launchCamera({
    mediaType: 'photo',
    cameraType: 'back',
    quality: 0.8,
    saveToPhotos: false,
  });

  if (response.didCancel) {
    return null;
  }

  if (response.errorCode) {
    throw new DietCameraError(
      getCameraErrorMessage(response.errorCode, response.errorMessage),
      response.errorCode,
    );
  }

  return createDietImageFormData(response.assets?.[0] ?? {});
};
