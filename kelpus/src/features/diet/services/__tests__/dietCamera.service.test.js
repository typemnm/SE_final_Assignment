import {launchCamera} from 'react-native-image-picker';
import {
  captureDietImageFormData,
  createDietImageFormData,
  DietCameraError,
} from '../dietCamera.service';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));

class MockFormData {
  parts = [];

  append(name, value) {
    this.parts.push([name, value]);
  }
}

describe('dietCamera.service', () => {
  const originalFormData = global.FormData;

  beforeEach(() => {
    launchCamera.mockReset();
    global.FormData = MockFormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  it('builds multipart form data with the backend file field', () => {
    const formData = createDietImageFormData({
      uri: 'file:///meal.jpg',
      fileName: 'meal.jpg',
      type: 'image/jpeg',
    });

    expect(formData.parts).toEqual([
      [
        'file',
        {
          uri: 'file:///meal.jpg',
          name: 'meal.jpg',
          type: 'image/jpeg',
        },
      ],
    ]);
  });

  it('returns null when the user cancels native camera capture', async () => {
    launchCamera.mockResolvedValue({didCancel: true});

    await expect(captureDietImageFormData()).resolves.toBeNull();
  });

  it('maps native camera permission failures to user-facing errors', async () => {
    launchCamera.mockResolvedValue({errorCode: 'permission'});

    await expect(captureDietImageFormData()).rejects.toMatchObject({
      code: 'permission',
      message: '카메라 권한이 필요합니다. 설정에서 카메라 권한을 허용해 주세요.',
    });
  });

  it('rejects malformed camera assets before upload', () => {
    expect(() => createDietImageFormData({})).toThrow(DietCameraError);
  });
});

it('maps unavailable native camera failures to user-facing errors', async () => {
  launchCamera.mockResolvedValue({errorCode: 'camera_unavailable'});

  await expect(captureDietImageFormData()).rejects.toMatchObject({
    code: 'camera_unavailable',
    message: '이 기기에서는 카메라를 사용할 수 없습니다.',
  });
});
