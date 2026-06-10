import {Share, Linking, Platform} from 'react-native';

export interface ShareContent {
  caption: string;
  hashtags: string[];
  /** react-native-view-shot으로 캡처한 파일 URI (file://...) */
  imageDataUrl?: string;
}

const buildText = ({caption, hashtags}: ShareContent): string =>
  [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');

export const shareService = {
  async canOpenInstagram(): Promise<boolean> {
    try {
      return await Linking.canOpenURL('instagram://app');
    } catch {
      return false;
    }
  },

  /**
   * Instagram Stories 공유.
   *
   * 이미지 있을 때:
   *   iOS  → Share.share({message, url: fileUri}) → 시스템 공유 시트에 이미지 포함
   *           → 공유 시트에서 Instagram Stories 선택 가능
   *   Android → 동일. Android는 url 파라미터를 무시할 수 있어서 텍스트로 폴백
   *
   * 이미지 없을 때:
   *   iOS  → instagram-stories://share URL scheme (배경 색상만)
   *   Android → instagram://app 열기 또는 네이티브 공유 시트
   */
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

  /**
   * Instagram 피드 공유.
   * 이미지 있을 때 → Share.share로 공유 시트 열기 (피드 업로드 선택 가능)
   * 이미지 없을 때 → instagram://app 열기 또는 네이티브 공유 시트
   */
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

  /** 시스템 네이티브 공유 시트 */
  async shareNative(content: ShareContent): Promise<void> {
    const message = buildText(content);
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? {
              message,
              url: content.imageDataUrl,
              title: 'kelpus 기록 공유',
            }
          : {message},
      );
    } catch {}
  },
};
