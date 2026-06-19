import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {videoProcessor} from '../services/videoProcessor';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useVideoRecorder} from '../hooks/useVideoRecorder';
import {VideoClipCard} from './VideoClipCard';
import {colors, typography, spacing} from '@theme/index';

interface Props {
  onClose: () => void;
}

const SPEED_OPTIONS: number[] = [1.5, 2.0, 3.0];

export const VideoRecorderModal = ({onClose}: Props) => {
  const {
    clips,
    recording,
    processing,
    combinedUri,
    speed,
    setSpeed,
    step,
    recordClip,
    updateClipText,
    removeClip,
    combineClips,
    reset,
  } = useVideoRecorder();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOpen = async () => {
    if (!combinedUri) {
      return;
    }
    try {
      await videoProcessor.openVideo(combinedUri);
    } catch (e: any) {
      Alert.alert('열기 실패', e?.message ?? '영상을 열 수 없습니다.');
    }
  };

  const handleShare = async () => {
    if (!combinedUri) {
      return;
    }
    try {
      await videoProcessor.shareVideo(combinedUri);
    } catch (e: any) {
      Alert.alert('공유 실패', e?.message ?? '공유 중 오류가 발생했습니다.');
    }
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <SafeAreaView style={s.modal} edges={['top', 'bottom']}>

        {/* ── 헤더 ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>{step === 0 ? '✕' : '‹'}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>영상 편집</Text>
            <View style={s.stepDots}>
              {[0, 1].map(i => (
                <View
                  key={i}
                  style={[s.stepDot, step === i && s.stepDotActive, step > i && s.stepDotDone]}
                />
              ))}
            </View>
          </View>
          <View style={s.headerBtn} />
        </View>

        {step === 0 ? (
          /* ── Step 0: 촬영 & 텍스트 편집 ── */
          <View style={s.content}>
            <Text style={s.desc}>
              5초 영상을 여러 번 촬영하고, 각 클립 중앙에 표시할 텍스트를 입력하세요.
              {'\n'}완료 후 선택한 배속으로 하나의 영상으로 합쳐집니다.
            </Text>

            <ScrollView
              style={s.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled">
              {clips.map((clip, i) => (
                <VideoClipCard
                  key={clip.id}
                  clip={clip}
                  index={i}
                  onUpdateText={updateClipText}
                  onRemove={removeClip}
                />
              ))}

              {clips.length === 0 && (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>📹</Text>
                  <Text style={s.emptyTitle}>아직 촬영된 클립이 없어요</Text>
                  <Text style={s.emptyDesc}>
                    아래 버튼을 눌러 5초 영상을 촬영하세요.{'\n'}
                    하루에 여러 번 촬영할 수 있습니다.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 배속 선택 */}
            {clips.length >= 1 && (
              <View style={s.speedRow}>
                <Text style={s.speedLabel}>배속 설정:</Text>
                <View style={s.speedBtns}>
                  {SPEED_OPTIONS.map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[s.speedBtn, speed === v && s.speedBtnActive]}
                      onPress={() => setSpeed(v)}
                      activeOpacity={0.7}>
                      <Text style={[s.speedBtnText, speed === v && s.speedBtnTextActive]}>
                        {v}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 촬영 버튼 */}
            <TouchableOpacity
              style={[s.recordBtn, recording && s.recordBtnRecording]}
              onPress={recordClip}
              disabled={recording}
              activeOpacity={0.8}>
              {recording ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.recordBtnText}>  촬영 중... (5초)</Text>
                </>
              ) : (
                <>
                  <Text style={s.recordBtnIcon}>⏺</Text>
                  <Text style={s.recordBtnText}>5초 영상 촬영</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 합치기 버튼 */}
            {clips.length >= 2 && (
              <TouchableOpacity
                style={[s.combineBtn, processing && s.combineBtnDisabled]}
                onPress={combineClips}
                disabled={processing}
                activeOpacity={0.85}>
                {processing ? (
                  <View style={s.processingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={s.combineBtnText}>  영상 합치는 중...</Text>
                  </View>
                ) : (
                  <Text style={s.combineBtnText}>
                    🎬 {clips.length}개 클립 {speed}배속으로 합치기
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {clips.length === 1 && (
              <View style={s.hintBox}>
                <Text style={s.hintText}>💡 영상을 1개 더 촬영하면 합치기 버튼이 활성화됩니다</Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Step 1: 완료 화면 ── */
          <ScrollView
            style={s.content}
            contentContainerStyle={s.doneScrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={s.doneCard}>
              <Text style={s.doneIcon}>🎉</Text>
              <Text style={s.doneTitle}>영상 합치기 완료!</Text>
              <Text style={s.doneSubtitle}>
                {clips.length}개 클립 · {speed}x 배속
              </Text>
            </View>

            {/* 클립 요약 */}
            <Text style={s.summaryHeader}>클립 텍스트 목록</Text>
            {clips.map((clip, i) => (
              <View key={clip.id} style={s.summaryRow}>
                <View style={s.summaryIndex}>
                  <Text style={s.summaryIndexText}>{i + 1}</Text>
                </View>
                <Text style={s.summaryText} numberOfLines={1}>
                  {clip.text || '(텍스트 없음)'}
                </Text>
              </View>
            ))}

            {combinedUri && (
              <View style={s.outputBox}>
                <Text style={s.outputLabel}>저장된 파일</Text>
                <Text style={s.outputPath} numberOfLines={2}>
                  {combinedUri}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={s.openBtn}
              onPress={handleOpen}
              activeOpacity={0.85}>
              <Text style={s.openBtnText}>▶ 영상 바로 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.shareBtn}
              onPress={handleShare}
              activeOpacity={0.85}>
              <Text style={s.shareBtnText}>📤 영상 공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.doneBtn}
              onPress={handleClose}
              activeOpacity={0.85}>
              <Text style={s.doneBtnText}>✓ 완료</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  modal: {flex: 1, backgroundColor: colors.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: {width: 44, alignItems: 'center', justifyContent: 'center'},
  headerBtnText: {fontSize: 22, color: colors.text.primary, fontWeight: '400', lineHeight: 28},
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {...typography.body1, fontWeight: '700', color: colors.text.primary},
  stepDots: {flexDirection: 'row', gap: 6, marginTop: 4},
  stepDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border},
  stepDotActive: {backgroundColor: colors.primary, width: 18, borderRadius: 3},
  stepDotDone: {backgroundColor: colors.primaryLight},

  content: {flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md},
  desc: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  scroll: {flex: 1},
  scrollContent: {paddingBottom: spacing.sm},

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {fontSize: 52, marginBottom: spacing.md},
  emptyTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.body2,
    color: colors.text.disabled,
    textAlign: 'center',
    lineHeight: 22,
  },

  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  speedLabel: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  speedBtns: {flexDirection: 'row', gap: 6},
  speedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  speedBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  speedBtnTextActive: {color: '#fff'},

  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: spacing.sm,
    gap: 6,
  },
  recordBtnRecording: {backgroundColor: '#B91C1C'},
  recordBtnIcon: {fontSize: 18},
  recordBtnText: {
    ...typography.button,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  combineBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  combineBtnDisabled: {backgroundColor: colors.primaryDark, opacity: 0.6},
  processingRow: {flexDirection: 'row', alignItems: 'center'},
  combineBtnText: {
    ...typography.button,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  hintBox: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  hintText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  /* Step 1 - 완료 화면 */
  doneScrollContent: {paddingBottom: spacing.xl},
  doneCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  doneIcon: {fontSize: 48, marginBottom: spacing.sm},
  doneTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  doneSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
  },

  summaryHeader: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: 6,
    gap: spacing.sm,
  },
  summaryIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIndexText: {fontSize: 12, color: '#fff', fontWeight: '700'},
  summaryText: {
    flex: 1,
    ...typography.body2,
    color: colors.text.primary,
  },

  outputBox: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outputLabel: {
    ...typography.caption,
    color: colors.text.disabled,
    marginBottom: 4,
  },
  outputPath: {
    ...typography.caption,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },

  openBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  openBtnText: {
    ...typography.button,
    color: '#fff',
    fontWeight: '700',
  },
  shareBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shareBtnText: {
    ...typography.button,
    color: '#fff',
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  doneBtnText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: '800',
  },
});
