/**
 * 웹 전용 공유 서비스
 *
 * 전략:
 * - 모바일 브라우저 (iOS Safari / Android Chrome):
 *     navigator.share() → 시스템 공유 시트에서 Instagram 선택 가능
 *     이미지가 있으면 파일로 공유 시도 (Web Share API Level 2)
 * - 데스크탑 브라우저:
 *     이미지 다운로드 + Instagram 웹 탭 열기
 *
 * Instagram은 외부에서 이미지를 파라미터로 직접 게시하는 URL을 제공하지 않음.
 * Instagram Graph API는 비즈니스 계정 전용이므로 여기서 다루지 않음.
 */

export interface ShareContent {
  caption: string;
  hashtags: string[];
  /**
   * 캡처된 슬라이드 이미지 (data URL 또는 blob URL).
   * react-native-view-shot 또는 html2canvas 연동 후 채워짐.
   */
  imageDataUrl?: string;
}

const g = globalThis as any;

const buildText = ({caption, hashtags}: ShareContent): string =>
  [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');

const isMobile = (): boolean => {
  if (!g.navigator) return false;
  return /Android|iPhone|iPad|iPod/i.test(g.navigator.userAgent ?? '');
};

const dataUrlToFile = async (dataUrl: string, name: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new (g.File as any)([blob], name, {type: blob.type || 'image/jpeg'});
};

const downloadImage = (dataUrl: string): void => {
  const a: any = g.document?.createElement('a');
  if (!a) return;
  a.href = dataUrl;
  a.download = 'kelpus-reel.jpg';
  g.document.body.appendChild(a);
  a.click();
  g.document.body.removeChild(a);
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await g.navigator?.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const shareService = {
  async canOpenInstagram(): Promise<boolean> {
    // 웹에서는 instagram.com 링크를 항상 열 수 있음
    return true;
  },

  /**
   * Instagram Stories 공유.
   * 모바일 웹: navigator.share() → 공유 시트에서 Instagram 선택
   * 데스크탑: 이미지 다운로드 + instagram.com 열기
   */
  async shareToInstagramStories(content: ShareContent): Promise<void> {
    await shareService._shareOrDownload(content, 'stories');
  },

  /**
   * Instagram 피드 공유.
   * 동일 플로우 — Instagram 자체가 피드/스토리 구분을 외부에서 지정하는 URL을 제공하지 않음.
   */
  async shareToInstagramFeed(content: ShareContent): Promise<void> {
    await shareService._shareOrDownload(content, 'feed');
  },

  /** 시스템 공유 시트 (텍스트 우선, 이미지 있으면 파일 포함) */
  async shareNative(content: ShareContent): Promise<void> {
    const text = buildText(content);

    if (g.navigator?.share) {
      try {
        if (content.imageDataUrl) {
          const file = await dataUrlToFile(content.imageDataUrl, 'kelpus-reel.jpg');
          if (g.navigator.canShare?.({files: [file]})) {
            await g.navigator.share({files: [file], text});
            return;
          }
        }
        await g.navigator.share({text, title: 'kelpus 기록'});
        return;
      } catch (e: any) {
        // AbortError = 사용자가 취소한 것 → 조용히 무시
        if (e?.name === 'AbortError') return;
      }
    }

    // navigator.share 없는 환경 (데스크탑) → 클립보드 복사
    const copied = await copyToClipboard(text);
    if (copied) {
      g.alert?.('텍스트가 클립보드에 복사되었습니다.');
    }
  },

  // ── 내부 헬퍼 ──────────────────────────────────

  async _shareOrDownload(
    content: ShareContent,
    _target: 'stories' | 'feed',
  ): Promise<void> {
    const text = buildText(content);

    // 모바일: Web Share API로 공유 시트 열기 (Instagram 선택 가능)
    if (isMobile() && g.navigator?.share) {
      try {
        if (content.imageDataUrl) {
          const file = await dataUrlToFile(content.imageDataUrl, 'kelpus-reel.jpg');
          if (g.navigator.canShare?.({files: [file]})) {
            await g.navigator.share({files: [file], text});
            return;
          }
        }
        await g.navigator.share({text, title: 'kelpus 기록'});
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }

    // 데스크탑 또는 share 실패 → 이미지 다운로드 + instagram.com 열기
    if (content.imageDataUrl) {
      downloadImage(content.imageDataUrl);
      // 약간 지연 후 Instagram 열기 (다운로드 팝업이 먼저 뜨도록)
      await new Promise<void>(r => setTimeout(r, 400));
    } else {
      // 이미지 없으면 텍스트 클립보드 복사
      await copyToClipboard(text);
    }
    g.window?.open('https://www.instagram.com/', '_blank');
  },
};
