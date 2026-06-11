import React, {useRef, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useReelCreator, type DietFrame, type RunningFrame} from '../hooks/useReelCreator';
import {useSavedReels} from '../hooks/useSavedReels';
import {ReelPreviewPlayer, type ReelPreviewPlayerHandle} from './ReelPreviewPlayer';
import {shareService} from '../services/shareService';
import {colors, typography, spacing} from '@theme/index';
import {formatDate} from '@utils/format';

// ──────────────────────────────────────────────
// Step 0: 콘텐츠 선택
// ──────────────────────────────────────────────

interface SelectStepProps {
  dietFrames: DietFrame[];
  runningFrames: RunningFrame[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
}

const SelectStep = ({
  dietFrames,
  runningFrames,
  selectedIds,
  onToggle,
  onNext,
}: SelectStepProps) => {
  const hasSelection = selectedIds.size > 0;

  const fmtDuration = (secs: number) => {
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.step}>
      <Text style={styles.stepDesc}>기록할 항목을 선택하세요</Text>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {dietFrames.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🍽️ 식단 분석</Text>
            {dietFrames.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.itemCard,
                  selectedIds.has(f.id) && styles.itemCardSelected,
                ]}
                onPress={() => onToggle(f.id)}
                activeOpacity={0.7}>
                <View style={styles.itemCardLeft}>
                  <Text style={styles.itemCardMain}>
                    {f.totalCalories.toLocaleString()} kcal
                  </Text>
                  <Text style={styles.itemCardSub}>{formatDate(f.analyzedAt)}</Text>
                  <Text style={styles.itemCardMeta}>
                    탄 {Math.round(f.carbRatio)}% · 단 {Math.round(f.proteinRatio)}% · 지{' '}
                    {Math.round(f.fatRatio)}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    selectedIds.has(f.id) && styles.checkboxSelected,
                  ]}>
                  {selectedIds.has(f.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {runningFrames.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🏃 러닝 기록</Text>
            {runningFrames.map(f => {
              const km = f.distanceKm;
              const distText =
                km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.itemCard,
                    selectedIds.has(f.id) && styles.itemCardSelected,
                  ]}
                  onPress={() => onToggle(f.id)}
                  activeOpacity={0.7}>
                  <View style={styles.itemCardLeft}>
                    <Text style={styles.itemCardMain}>{distText}</Text>
                    <Text style={styles.itemCardSub}>{formatDate(f.date)}</Text>
                    <Text style={styles.itemCardMeta}>
                      {fmtDuration(f.durationSeconds)} · {f.calories} kcal
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedIds.has(f.id) && styles.checkboxSelected,
                    ]}>
                    {selectedIds.has(f.id) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {dietFrames.length === 0 && runningFrames.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              식단 분석이나 러닝 기록을{'\n'}먼저 추가해보세요!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryBtn, !hasSelection && styles.primaryBtnDisabled]}
        onPress={onNext}
        disabled={!hasSelection}>
        <Text style={styles.primaryBtnText}>
          {hasSelection ? `${selectedIds.size}개 선택됨 · 미리보기 →` : '항목을 선택해주세요'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ──────────────────────────────────────────────
// Step 1: 미리보기
// ──────────────────────────────────────────────

interface PreviewStepProps {
  selectedFrames: any[];
  caption: string;
  hashtags: string;
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
  onNext: () => void;
  playerRef: React.RefObject<ReelPreviewPlayerHandle>;
}

const PreviewStep = ({
  selectedFrames,
  caption,
  hashtags,
  onCaptionChange,
  onHashtagsChange,
  onNext,
  playerRef,
}: PreviewStepProps) => (
  <KeyboardAvoidingView
    style={styles.step}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Text style={styles.stepDesc}>슬라이드를 탭해서 이동할 수 있어요</Text>
    <ScrollView showsVerticalScrollIndicator={false}>
      <ReelPreviewPlayer ref={playerRef} frames={selectedFrames} compact />

      <Text style={styles.inputLabel}>캡션</Text>
      <TextInput
        style={styles.textInput}
        value={caption}
        onChangeText={onCaptionChange}
        multiline
        placeholder="내용을 입력하세요..."
        placeholderTextColor={colors.text.disabled}
        textAlignVertical="top"
      />

      <Text style={styles.inputLabel}>해시태그</Text>
      <TextInput
        style={styles.textInput}
        value={hashtags}
        onChangeText={onHashtagsChange}
        placeholder="#kelpus #건강기록"
        placeholderTextColor={colors.text.disabled}
        autoCapitalize="none"
      />

      <View style={styles.previewFooter} />
    </ScrollView>

    <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
      <Text style={styles.primaryBtnText}>공유하기 →</Text>
    </TouchableOpacity>
  </KeyboardAvoidingView>
);

// ──────────────────────────────────────────────
// Step 2: 공유하기
// ──────────────────────────────────────────────

interface ShareStepProps {
  saved: boolean;
  saving: boolean;
  sharing: boolean;
  onSave: () => void;
  onDoShare: (method: 'stories' | 'feed' | 'native') => void;
}

const ShareStep = ({saved, saving, sharing, onSave, onDoShare}: ShareStepProps) => (
  <ScrollView
    style={[styles.step, styles.shareStep]}
    contentContainerStyle={styles.shareScrollContent}
    showsVerticalScrollIndicator={false}>
    <Text style={styles.stepDesc}>저장하거나 SNS에 공유하세요</Text>

    {/* 앱에 저장 섹션 */}
    <Text style={styles.sectionLabel}>💾 앱에 저장</Text>
    <TouchableOpacity
      style={[styles.saveCard, saved && styles.saveCardDone]}
      onPress={onSave}
      disabled={saved || saving}
      activeOpacity={0.7}>
      <Text style={styles.saveCardIcon}>{saved ? '✓' : saving ? '···' : '💾'}</Text>
      <View style={styles.saveCardBody}>
        <Text style={[styles.saveCardTitle, saved && styles.saveCardTitleDone]}>
          {saved ? '저장 완료!' : '앱에 저장하기'}
        </Text>
        <Text style={styles.saveCardSub}>
          {saved ? '피드에서 언제든 다시 볼 수 있어요' : '나중에 다시 확인할 수 있어요'}
        </Text>
      </View>
    </TouchableOpacity>

    {/* SNS 공유 섹션 */}
    <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>📱 SNS 공유</Text>
    {sharing ? (
      <View style={styles.sharingIndicator}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.sharingText}>공유 중...</Text>
      </View>
    ) : (
      <View style={styles.shareOptions}>
        <TouchableOpacity
          style={styles.shareCard}
          onPress={() => onDoShare('stories')}
          activeOpacity={0.7}>
          <Text style={styles.shareCardIcon}>📸</Text>
          <Text style={styles.shareCardTitle}>Instagram Stories</Text>
          <Text style={styles.shareCardSub}>스토리로 공유</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareCard}
          onPress={() => onDoShare('feed')}
          activeOpacity={0.7}>
          <Text style={styles.shareCardIcon}>📷</Text>
          <Text style={styles.shareCardTitle}>Instagram 피드</Text>
          <Text style={styles.shareCardSub}>피드에 게시</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareCard, styles.shareCardNative]}
          onPress={() => onDoShare('native')}
          activeOpacity={0.7}>
          <Text style={styles.shareCardIcon}>🔗</Text>
          <Text style={styles.shareCardTitle}>기타 앱 공유</Text>
          <Text style={styles.shareCardSub}>카카오톡, 문자, 트위터 등</Text>
        </TouchableOpacity>
      </View>
    )}
  </ScrollView>
);

// ──────────────────────────────────────────────
// 메인 모달
// ──────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

const STEP_LABELS = ['선택', '미리보기', '공유'];

export const ReelCreatorModal = ({onClose}: Props) => {
  const {
    dietFrames,
    runningFrames,
    selectedIds,
    selectedFrames,
    step,
    caption,
    hashtags,
    sharing,
    toggleItem,
    goToPreview,
    goToShare,
    goBack,
    reset,
    setCaption,
    setHashtags,
    doShare,
  } = useReelCreator();

  const {saveReel} = useSavedReels();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSharing, setLocalSharing] = useState(false);
  const playerRef = useRef<ReelPreviewPlayerHandle>(null);
  const capturedUriRef = useRef<string | undefined>();

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await saveReel(
        selectedFrames,
        caption,
        hashtags.split(/\s+/).filter(Boolean),
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // 미리보기 → 공유 스텝으로 넘어갈 때 현재 슬라이드 캡처
  const handleGoToShare = async () => {
    try {
      capturedUriRef.current = await playerRef.current?.captureCurrentFrame();
    } catch {}
    goToShare();
  };

  const handleDoShare = async (method: 'stories' | 'feed' | 'native') => {
    setLocalSharing(true);
    const content = {
      caption,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
      imageDataUrl: capturedUriRef.current,
    };
    try {
      if (method === 'stories') await shareService.shareToInstagramStories(content);
      else if (method === 'feed') await shareService.shareToInstagramFeed(content);
      else await shareService.shareNative(content);
    } finally {
      setLocalSharing(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={step === 0 ? handleClose : goBack} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>{step === 0 ? '✕' : '‹'}</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>나의 기록 릴스</Text>
            {/* 단계 표시 점 */}
            <View style={styles.stepDots}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    step === i && styles.stepDotActive,
                    step > i && styles.stepDotDone,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.headerBtn}>
            <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
          </View>
        </View>

        {/* 단계별 콘텐츠 */}
        {step === 0 && (
          <SelectStep
            dietFrames={dietFrames}
            runningFrames={runningFrames}
            selectedIds={selectedIds}
            onToggle={toggleItem}
            onNext={goToPreview}
          />
        )}
        {step === 1 && (
          <PreviewStep
            selectedFrames={selectedFrames}
            caption={caption}
            hashtags={hashtags}
            onCaptionChange={setCaption}
            onHashtagsChange={setHashtags}
            onNext={handleGoToShare}
            playerRef={playerRef}
          />
        )}
        {step === 2 && (
          <ShareStep
            saved={saved}
            saving={saving}
            sharing={localSharing}
            onSave={handleSave}
            onDoShare={handleDoShare}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ──────────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  modal: {flex: 1, backgroundColor: colors.background},

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: {width: 44, alignItems: 'center', justifyContent: 'center'},
  headerBtnText: {
    fontSize: 22,
    color: colors.text.primary,
    fontWeight: '400',
    lineHeight: 28,
  },
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  stepDotActive: {backgroundColor: colors.primary, width: 18},
  stepDotDone: {backgroundColor: colors.primaryLight},

  // 공통 스텝
  step: {flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md},
  stepDesc: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  scroll: {flex: 1},
  scrollContent: {paddingBottom: spacing.lg},

  // 섹션
  sectionLabel: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // 선택 카드
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  itemCardLeft: {flex: 1},
  itemCardMain: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  itemCardSub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemCardMeta: {
    ...typography.caption,
    color: colors.text.disabled,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {fontSize: 13, color: '#fff', fontWeight: '700'},

  // 빈 상태
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {fontSize: 40, marginBottom: spacing.md},
  emptyText: {
    ...typography.body1,
    color: colors.text.disabled,
    textAlign: 'center',
    lineHeight: 24,
  },

  // 기본 버튼
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryBtnDisabled: {backgroundColor: colors.border},
  primaryBtnText: {
    ...typography.button,
    color: '#fff',
    fontWeight: '700',
  },

  // 미리보기 스텝
  inputLabel: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...typography.body2,
    color: colors.text.primary,
    minHeight: 48,
  },
  previewFooter: {height: spacing.xl},

  // 공유 스텝
  shareStep: {paddingBottom: 0},
  shareScrollContent: {paddingBottom: spacing.xl},
  sectionLabelSpaced: {marginTop: spacing.lg},
  sharingIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  sharingText: {...typography.body1, color: colors.text.secondary},
  shareOptions: {gap: spacing.sm},
  shareCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  shareCardNative: {borderColor: colors.secondary},
  shareCardIcon: {fontSize: 32, marginBottom: spacing.xs},
  shareCardTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  shareCardSub: {...typography.caption, color: colors.text.secondary},

  // 앱 저장 카드
  saveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  saveCardDone: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76,175,80,0.06)',
  },
  saveCardIcon: {fontSize: 24, width: 32, textAlign: 'center'},
  saveCardBody: {flex: 1},
  saveCardTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.primary,
  },
  saveCardTitleDone: {color: '#4CAF50'},
  saveCardSub: {...typography.caption, color: colors.text.secondary, marginTop: 2},
});
