import React, {useRef, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {SavedReel} from '../hooks/useSavedReels';
import {ReelPreviewPlayer, type ReelPreviewPlayerHandle} from './ReelPreviewPlayer';
import {shareService} from '../services/shareService';
import {colors, spacing, typography} from '@theme/index';

interface Props {
  reel: SavedReel;
  onClose: () => void;
}

export const SavedReelViewer = ({reel, onClose}: Props) => {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [sharing, setSharing] = useState(false);
  const playerRef = useRef<ReelPreviewPlayerHandle>(null);

  const handleShare = async (method: 'stories' | 'feed' | 'native') => {
    setShowShareSheet(false);
    setSharing(true);
    try {
      // 현재 슬라이드 캡처 (실패해도 텍스트 공유로 폴백)
      let imageDataUrl: string | undefined;
      try {
        imageDataUrl = await playerRef.current?.captureCurrentFrame();
      } catch {}

      const content = {
        caption: reel.caption,
        hashtags: reel.hashtags,
        imageDataUrl,
      };
      if (method === 'stories') await shareService.shareToInstagramStories(content);
      else if (method === 'feed') await shareService.shareToInstagramFeed(content);
      else await shareService.shareNative(content);
    } finally {
      setSharing(false);
    }
  };

  const d = new Date(reel.createdAt);
  const dateStr = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{dateStr}</Text>
          <TouchableOpacity
            onPress={() => setShowShareSheet(true)}
            style={styles.headerBtn}
            disabled={sharing}>
            {sharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.shareIcon}>↗</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 본문 */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ReelPreviewPlayer ref={playerRef} frames={reel.frames} />

          {!!reel.caption && (
            <Text style={styles.caption}>{reel.caption}</Text>
          )}
          {reel.hashtags.length > 0 && (
            <Text style={styles.hashtags}>{reel.hashtags.join(' ')}</Text>
          )}
        </ScrollView>

        {/* 공유 옵션 바텀시트 */}
        {showShareSheet && (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowShareSheet(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>공유하기</Text>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handleShare('stories')}
                  activeOpacity={0.7}>
                  <Text style={styles.sheetOptionIcon}>📸</Text>
                  <View style={styles.sheetOptionBody}>
                    <Text style={styles.sheetOptionTitle}>Instagram Stories</Text>
                    <Text style={styles.sheetOptionSub}>스토리로 공유</Text>
                  </View>
                  <Text style={styles.sheetChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handleShare('feed')}
                  activeOpacity={0.7}>
                  <Text style={styles.sheetOptionIcon}>📷</Text>
                  <View style={styles.sheetOptionBody}>
                    <Text style={styles.sheetOptionTitle}>Instagram 피드</Text>
                    <Text style={styles.sheetOptionSub}>피드에 게시</Text>
                  </View>
                  <Text style={styles.sheetChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handleShare('native')}
                  activeOpacity={0.7}>
                  <Text style={styles.sheetOptionIcon}>🔗</Text>
                  <View style={styles.sheetOptionBody}>
                    <Text style={styles.sheetOptionTitle}>기타 앱 공유</Text>
                    <Text style={styles.sheetOptionSub}>카카오톡, 문자, 트위터 등</Text>
                  </View>
                  <Text style={styles.sheetChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowShareSheet(false)}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelTxt}>취소</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBtn: {width: 44, alignItems: 'center', justifyContent: 'center'},
  backArrow: {fontSize: 30, color: '#fff', fontWeight: '200', lineHeight: 36},
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  shareIcon: {fontSize: 22, color: colors.primary},
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  caption: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    lineHeight: 20,
    alignSelf: 'flex-start',
  },
  hashtags: {
    fontSize: 13,
    color: colors.primary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },

  // 바텀시트
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: spacing.sm,
  },
  sheetOptionIcon: {fontSize: 22},
  sheetOptionBody: {flex: 1},
  sheetOptionTitle: {fontSize: 15, fontWeight: '600', color: '#fff'},
  sheetOptionSub: {fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2},
  sheetChevron: {fontSize: 20, color: 'rgba(255,255,255,0.3)', fontWeight: '300'},
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelTxt: {fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: '500'},
});
