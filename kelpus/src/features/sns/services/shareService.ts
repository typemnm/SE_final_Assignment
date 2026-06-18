import {Share, Linking, Platform, Alert} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';

export interface ShareContent {
  caption: string;
  hashtags: string[];
  /** react-native-view-shot으로 캡처한 파일 URI (file://...) */
  imageDataUrl?: string;
}

const buildText = ({caption, hashtags}: ShareContent): string =>
  [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');

export type SaveResult = 'saved' | 'shared' | 'permission_denied' | 'failed';

export const shareService = {
  async canOpenInstagram(): Promise<boolean> {
    try {
      return await Linking.canOpenURL('instagram://app');
    } catch {
      return false;
    }
  },

  /**
   * 기기 갤러리에 직접 저장.
   *
   * 1순위: @react-native-camera-roll/camera-roll (설치된 경우) → 원터치 저장
   * 2순위: iOS Share.share + url → 공유 시트에서 "이미지 저장" 가능
   * 3순위: 실패
   */
  async saveToDevice(fileUri: string): Promise<SaveResult> {
    // ── CameraRoll 직접 저장 (패키지가 설치된 경우) ──────────
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {CameraRoll} = require('@react-native-camera-roll/camera-roll');

      // 권한 요청
      if (Platform.OS === 'ios') {
        const perm = PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY;
        const current = await request(perm);
        if (current !== RESULTS.GRANTED && current !== RESULTS.LIMITED) {
          Alert.alert(
            '갤러리 권한 필요',
            '설정 > 개인 정보 보호 > 사진에서 kelpus의 접근을 "추가만"으로 허용해주세요.',
          );
          return 'permission_denied';
        }
      } else if (Platform.OS === 'android') {
        const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
        if (apiLevel < 29) {
          const perm = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
          const current = await request(perm);
          if (current !== RESULTS.GRANTED) {
            Alert.alert('저장 권한 필요', '설정에서 저장소 접근 권한을 허용해주세요.');
            return 'permission_denied';
          }
        }
        // Android 29+(Q/10+): MediaStore를 통한 저장은 권한 불필요
      }

      await CameraRoll.saveAsset(fileUri, {type: 'photo', album: 'kelpus'});
      return 'saved';
    } catch {
      // CameraRoll 미설치 또는 오류 → iOS 공유 시트로 폴백
    }

    // ── iOS 공유 시트 폴백 ───────────────────────────────────
    if (Platform.OS === 'ios') {
      try {
        await Share.share({message: '', url: fileUri});
        return 'shared';
      } catch {}
    }

    return 'failed';
  },

  async shareToInstagramStories(content: ShareContent): Promise<void> {
    if (content.imageDataUrl) {
      try {
        await Share.share(
          Platform.OS === 'ios'
            ? {message: buildText(content), url: content.imageDataUrl}
            : {message: buildText(content)},
        );
        return;
      } catch {}
    }

    if (Platform.OS === 'ios') {
      const topColor = encodeURIComponent('#1B3A1B');
      const bottomColor = encodeURIComponent('#0D1F0D');
      const url = `instagram-stories://share?backgroundTopColor=${topColor}&backgroundBottomColor=${bottomColor}`;
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch {}
    } else {
      try {
        if (await Linking.canOpenURL('instagram://app')) {
          await Linking.openURL('instagram://app');
          return;
        }
      } catch {}
    }

    await shareService.shareNative(content);
  },

  async shareToInstagramFeed(content: ShareContent): Promise<void> {
    if (content.imageDataUrl) {
      try {
        await Share.share(
          Platform.OS === 'ios'
            ? {message: buildText(content), url: content.imageDataUrl}
            : {message: buildText(content)},
        );
        return;
      } catch {}
    }

    try {
      if (await Linking.canOpenURL('instagram://app')) {
        await Linking.openURL('instagram://app');
        return;
      }
    } catch {}

    await shareService.shareNative(content);
  },

  async shareNative(content: ShareContent): Promise<void> {
    const message = buildText(content);
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? {message, url: content.imageDataUrl, title: 'kelpus 기록 공유'}
          : {message},
      );
    } catch {}
  },
};
