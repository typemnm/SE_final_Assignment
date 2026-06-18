import React, {useRef, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {SavedReel} from '../hooks/useSavedReels';
import {ReelPreviewPlayer, type ReelPreviewPlayerHandle} from './ReelPreviewPlayer';
import {shareService} from '../services/shareService';
import {useThemeContext} from '@theme/ThemeContext';
import type {FeedShareData} from './ReelCreatorModal';

interface Props {
  reel: SavedReel;
  onClose: () => void;
  onShareToFeed?: (data: FeedShareData) => void;
}

type ShareMethod = 'device' | 'stories' | 'feed' | 'native';

export const SavedReelViewer = ({reel, onClose, onShareToFeed}: Props) => {
  const {tc} = useThemeContext();
  const [showSheet, setShowSheet] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [feedPosted, setFeedPosted] = useState(false);
  const playerRef = useRef<ReelPreviewPlayerHandle>(null);

  const handleShareToFeed = () => {
    if (feedPosted || !onShareToFeed) return;
    const runningFrame = reel.frames.find(f => f.type === 'running') as
      | {type: 'running'; distanceKm: number; durationSeconds: number; avgPaceMinPerKm: number; calories: number}
      | undefined;
    const dietFrame = reel.frames.find(f => f.type === 'diet') as
      | {type: 'diet'; totalCalories: number}
      | undefined;
    const fmtDuration = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const fmtPace = (paceMin: number) => {
      const m = Math.floor(paceMin);
      const s = Math.round((paceMin - m) * 60);
      return `${m}'${String(s).padStart(2, '0')}"`;
    };
    onShareToFeed({
      reelId: reel.id,
      caption: reel.caption,
      hashtags: reel.hashtags,
      runningStats: runningFrame
        ? {
            distanceKm: runningFrame.distanceKm,
            duration: fmtDuration(runningFrame.durationSeconds),
            pace: fmtPace(runningFrame.avgPaceMinPerKm),
            calories: runningFrame.calories,
          }
        : undefined,
      totalCalories: dietFrame?.totalCalories,
    });
    setFeedPosted(true);
  };

  const captureFrame = async (): Promise<string | null> => {
    try {
      return await playerRef.current?.captureCurrentFrame() ?? null;
    } catch {
      return null;
    }
  };

  const handleShare = async (method: ShareMethod) => {
    setShowSheet(false);
    setBusy(true);
    try {
      if (method === 'device') {
        const uri = await captureFrame();
        if (!uri) {
          Alert.alert('캡처 실패', '현재 슬라이드를 이미지로 변환하지 못했습니다.');
          return;
        }
        const result = await shareService.saveToDevice(uri);
        if (result === 'saved') {
          Alert.alert('저장 완료 ✅', '갤러리의 kelpus 앨범에 저장되었습니다!');
        } else if (result === 'shared') {
          // iOS 공유 시트 열림 — 사용자가 "이미지 저장" 선택 가능
        }
        // permission_denied / failed: 이미 내부에서 Alert 표시됨
      } else if (method === 'stories' || method === 'feed') {
        const uri = await captureFrame();
        const content = {
          caption: reel.caption,
          hashtags: reel.hashtags,
          imageDataUrl: uri ?? undefined,
        };
        if (method === 'stories') {
          await shareService.shareToInstagramStories(content);
        } else {
          await shareService.shareToInstagramFeed(content);
        }
      } else {
        const uri = await captureFrame();
        await shareService.shareNative({
          caption: reel.caption,
          hashtags: reel.hashtags,
          imageDataUrl: uri ?? undefined,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const d = new Date(reel.createdAt);
  const dateStr = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>

        {/* ── 헤더 ────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.hBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{dateStr}</Text>
          <TouchableOpacity
            onPress={() => setShowSheet(true)}
            style={styles.hBtn}
            disabled={busy}>
            {busy
              ? <ActivityIndicator size="small" color={tc.emerald} />
              : <Text style={[styles.shareIcon, {color: tc.emerald}]}>↗</Text>}
          </TouchableOpacity>
        </View>

        {/* ── 본문 ────────────────────────────────────── */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReelPreviewPlayer ref={playerRef} frames={reel.frames} />

          {!!reel.caption && (
            <Text style={styles.caption}>{reel.caption}</Text>
          )}
          {reel.hashtags.length > 0 && (
            <Text style={[styles.hashtags, {color: tc.emerald}]}>
              {reel.hashtags.join(' ')}
            </Text>
          )}

          {/* ── 기기 저장 / 공유 버튼 (본문 하단) ────── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => handleShare('device')}
              disabled={busy}
              activeOpacity={0.8}>
              <Text style={styles.actionBtnIcon}>📥</Text>
              <Text style={styles.actionBtnText}>기기에 저장</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => setShowSheet(true)}
              disabled={busy}
              activeOpacity={0.8}>
              <Text style={styles.actionBtnIcon}>↗</Text>
              <Text style={[styles.actionBtnText, {color: 'rgba(255,255,255,0.75)'}]}>공유하기</Text>
            </TouchableOpacity>
          </View>

          {/* ── 피드에 글 올리기 ─────────────────────── */}
          {onShareToFeed && (
            <TouchableOpacity
              style={[
                styles.feedShareBtn,
                feedPosted && styles.feedShareBtnDone,
              ]}
              onPress={handleShareToFeed}
              disabled={feedPosted || busy}
              activeOpacity={0.8}>
              <Text style={styles.feedShareBtnIcon}>{feedPosted ? '✓' : '✏️'}</Text>
              <Text style={styles.feedShareBtnText}>
                {feedPosted ? '게시 완료!' : '피드에 글 올리기'}
              </Text>
            </TouchableOpacity>
          )}

          {/* 저장 안내 */}
          <Text style={styles.saveHint}>
            {Platform.OS === 'ios'
              ? '📱 직접 저장: "@react-native-camera-roll" 설치 시 갤러리에 즉시 저장됩니다.\n미설치 시 공유 시트에서 "이미지 저장"을 선택하세요.'
              : '📱 기기에 저장 버튼을 누르면 갤러리에 저장됩니다.'}
          </Text>
        </ScrollView>

        {/* ── 공유 바텀시트 ───────────────────────────── */}
        {showSheet && (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowSheet(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>공유하기</Text>

                <SheetOption
                  icon="📸"
                  title="Instagram Stories"
                  sub="스토리로 공유"
                  onPress={() => handleShare('stories')}
                />
                <SheetOption
                  icon="📷"
                  title="Instagram 피드"
                  sub="피드에 게시"
                  onPress={() => handleShare('feed')}
                />
                <SheetOption
                  icon="🔗"
                  title="기타 앱 공유"
                  sub="카카오톡, 문자, 트위터 등"
                  onPress={() => handleShare('native')}
                />

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowSheet(false)}
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

const SheetOption = ({icon, title, sub, onPress}: {
  icon: string; title: string; sub: string; onPress: () => void;
}) => (
  <TouchableOpacity style={styles.sheetOpt} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.sheetOptIcon}>{icon}</Text>
    <View style={styles.sheetOptBody}>
      <Text style={styles.sheetOptTitle}>{title}</Text>
      <Text style={styles.sheetOptSub}>{sub}</Text>
    </View>
    <Text style={styles.sheetChevron}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  modal: {flex: 1, backgroundColor: '#0A0A0A'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  hBtn: {width: 44, alignItems: 'center', justifyContent: 'center'},
  backArrow: {fontSize: 30, color: '#fff', fontWeight: '200', lineHeight: 36},
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#fff'},
  shareIcon: {fontSize: 22},

  content: {paddingTop: 16, paddingBottom: 48, alignItems: 'center'},
  caption: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 16, marginTop: 16, lineHeight: 20, alignSelf: 'flex-start',
  },
  hashtags: {
    fontSize: 13, paddingHorizontal: 16, marginTop: 8, alignSelf: 'flex-start',
  },

  // 버튼 행
  actionRow: {
    flexDirection: 'row', gap: 10,
    marginTop: 20, paddingHorizontal: 16, width: '100%',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 14, gap: 7,
  },
  actionBtnPrimary: {
    backgroundColor: 'rgba(52,211,153,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.45)',
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  actionBtnIcon: {fontSize: 18},
  actionBtnText: {fontSize: 14, fontWeight: '700', color: '#34D399'},

  feedShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 10, paddingVertical: 13, borderRadius: 14,
    width: '100%', gap: 8,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.45)',
  },
  feedShareBtnDone: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderColor: 'rgba(76,175,80,0.45)',
  },
  feedShareBtnIcon: {fontSize: 18},
  feedShareBtnText: {fontSize: 14, fontWeight: '700', color: '#C084FC'},

  saveHint: {
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20, marginTop: 12,
    lineHeight: 16, textAlign: 'center',
  },

  // 바텀시트
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingHorizontal: 16,
  },
  handle: {
    width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 12, paddingHorizontal: 4},
  sheetOpt: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.06)', gap: 12,
  },
  sheetOptIcon: {fontSize: 22},
  sheetOptBody: {flex: 1},
  sheetOptTitle: {fontSize: 15, fontWeight: '600', color: '#fff'},
  sheetOptSub: {fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2},
  sheetChevron: {fontSize: 20, color: 'rgba(255,255,255,0.3)', fontWeight: '300'},
  cancelBtn: {
    marginTop: 8, paddingVertical: 12, alignItems: 'center',
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelTxt: {fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: '500'},
});
