import {getDietCaptureFlowErrorMessage} from './useDiet';
import {DietCameraError} from '../services/dietCamera.service';

describe('useDiet camera flow error mapping', () => {
  it('keeps analysis 402 messages user-facing', () => {
    expect(getDietCaptureFlowErrorMessage({response: {status: 402}})).toBe(
      '일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.',
    );
  });

  it('keeps rejected analysis messages and upload failures visible', () => {
    expect(getDietCaptureFlowErrorMessage('AI 분석 요청에 실패했습니다.')).toBe(
      'AI 분석 요청에 실패했습니다.',
    );
    expect(getDietCaptureFlowErrorMessage(new Error('upload failed'))).toBe(
      '사진 업로드 또는 AI 분석 요청에 실패했습니다.',
    );
  });

  it('uses camera-specific error messages', () => {
    const error = new DietCameraError('카메라 권한이 필요합니다.', 'permission');

    expect(getDietCaptureFlowErrorMessage(error)).toBe('카메라 권한이 필요합니다.');
  });
});
