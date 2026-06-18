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
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useReelCreator, type DietFrame, type RunningFrame} from '../hooks/useReelCreator';
import {useSavedReels} from '../hooks/useSavedReels';
import {ReelPreviewPlayer, type ReelPreviewPlayerHandle} from './ReelPreviewPlayer';
import {shareService} from '../services/shareService';
import {colors, typography, spacing} from '@theme/index';
import {formatDate} from '@utils/format';

// ── Step 0: 콘텐츠 선택 ────────────────────────────────────────────────────

interface SelectStepProps {
  dietFrames: DietFrame[];
  runningFrames: RunningFrame[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
}

const SelectStep = ({dietFrames, runningFrames, selectedIds, onToggle, onNext}: SelectStepProps) => {
  const hasSelection = selectedIds.size > 0;

  const fmtDuration = (secs: number) => {
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={s.step}>
      <Text style={s.stepDesc}>기록할 항목을 선택하세요</Text>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {dietFrames.length > 0 && (
          <>
            <Text style={s.sectionLabel}>🍽️ 식단 분석</Text>
            {dietFrames.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[s.itemCard, selectedIds.has(f.id) && s.itemCardSelected]}
                onPress={() => onToggle(f.id)}
                activeOpacity={0.7}>
                <View style={s.itemCardLeft}>
                  <Text style={s.itemCardMain}>{f.totalCalories.toLocaleString()} kcal</Text>
                  <Text style={s.itemCardSub}>{formatDate(f.analyzedAt)}</Text>
                  <Text style={s.itemCardMeta}>
                    탄 {Math.round(f.carbRatio)}% · 단 {Math.round(f.proteinRatio)}% · 지 {Math.round(f.fatRatio)}%
                  </Text>
                </View>
                <View style={[s.checkbox, selectedIds.has(f.id) && s.checkboxSelected]}>
                  {selectedIds.has(f.id) && <Text style={s.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {runningFrames.length > 0 && (
          <>
            <Text style={s.sectionLabel}>🏃 러닝 기록</Text>
            {runningFrames.map(f => {
              const km = f.distanceKm;
              const distText = km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[s.itemCard, selectedIds.has(f.id) && s.itemCardSelected]}
                  onPress={() => onToggle(f.id)}
                  activeOpacity={0.7}>
                  <View style={s.itemCardLeft}>
                    <Text style={s.itemCardMain}>{distText}</Text>
                    <Text style={s.itemCardSub}>{formatDate(f.date)}</Text>
                    <Text style={s.itemCardMeta}>{fmtDuration(f.durationSeconds)} · {f.calories} kcal</Text>
                  </View>
                  <View style={[s.checkbox, selectedIds.has(f.id) && s.checkboxSelected]}>
                    {selectedIds.has(f.id) && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {dietFrames.length === 0 && runningFrames.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyText}>식단 분석이나 러닝 기록을{'\n'}먼저 추가해보세요!</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[s.primaryBtn, !hasSelection && s.primaryBtnDisabled]}
        onPress={onNext}
        disabled={!hasSelection}>
        <Text style={s.primaryBtnText}>
          {hasSelection ? `${selectedIds.size}개 선택됨 · 미리보기 →` : '항목을 선택해주세요'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Step 1: 미리보기 ────────────────────────────────────────────────────────

interface PreviewStepProps {
  selectedFrames: any[];
  caption: string;
  hashtags: string;
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
  onNext: () => void;
  playerRef: React.RefObject<ReelPreviewPlayerHandle>;
}

const PreviewStep = ({selectedFrames, caption, hashtags, onCaptionChange, onHashtagsChange, onNext, playerRef}: PreviewStepProps) => (
  <KeyboardAvoidingView style={s.step} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Text style={s.stepDesc}>슬라이드를 탭해서 이동할 수 있어요</Text>
    <ScrollView showsVerticalScrollIndicator={false}>
      <ReelPreviewPlayer ref={playerRef} frames={selectedFrames} />

      <Text style={s.inputLabel}>캡션</Text>
      <TextInput
        style={s.textInput}
        value={caption}
        onChangeText={onCaptionChange}
        multiline
        placeholder="내용을 입력하세요..."
        placeholderTextColor={colors.text.disabled}
        textAlignVertical="top"
      />

      <Text style={s.inputLabel}>해시태그</Text>
      <TextInput
        style={s.textInput}
        value={hashtags}
        onChangeText={onHashtagsChange}
        placeholder="#kelpus #건강기록"
        placeholderTextColor={colors.text.disabled}
        autoCapitalize="none"
      />
      <View style={s.previewFooter} />
    </ScrollView>

    <TouchableOpacity style={s.primaryBtn} onPress={onNext}>
      <Text style={s.primaryBtnText}>공유하기 →</Text>
    </TouchableOpacity>
  </KeyboardAvoidingView>
);

// ── Step 2: 저장 / 공유 ─────────────────────────────────────────────────────

interface ShareStepProps {
  saved: boolean;
  saving: boolean;
  sharing: boolean;
  deviceSaving: boolean;
  deviceSaved: boolean;
  feedPosted: boolean;
  onSave: () => void;
  onSaveToDevice: () => void;
  onDoShare: (method: 'stories' | 'feed' | 'native') => void;
  onShareToFeed: () => void;
  onDone: () => void;
}

const ShareStep = ({
  saved, saving, sharing,
  deviceSaving, deviceSaved, feedPosted,
  onSave, onSaveToDevice, onDoShare, onShareToFeed, onDone,
}: ShareStepProps) => (
  <ScrollView
    style={[s.step, s.shareStep]}
    contentContainerStyle={s.shareScrollContent}
    showsVerticalScrollIndicator={false}>
    <Text style={s.stepDesc}>저장하거나 SNS에 공유하세요</Text>

    {/* ── 앱에 저장 ── */}
    <Text style={s.sectionLabel}>💾 앱에 저장</Text>
    <TouchableOpacity
      style={[s.saveCard, saved && s.saveCardDone]}
      onPress={onSave}
      disabled={saved || saving}
      activeOpacity={0.7}>
      <Text style={s.saveCardIcon}>{saved ? '✓' : saving ? '···' : '💾'}</Text>
      <View style={s.saveCardBody}>
        <Text style={[s.saveCardTitle, saved && s.saveCardTitleDone]}>
          {saved ? '저장 완료!' : '앱에 저장하기'}
        </Text>
        <Text style={s.saveCardSub}>
          {saved ? '피드에서 언제든 다시 볼 수 있어요' : '나중에 피드에서 다시 확인할 수 있어요'}
        </Text>
      </View>
    </TouchableOpacity>

    {/* ── 앱 피드에 공유 ── */}
    <Text style={[s.sectionLabel, s.sectionLabelSpaced]}>📢 앱 피드에 공유</Text>
    <TouchableOpacity
      style={[s.saveCard, s.feedShareCard, feedPosted && s.saveCardDone]}
      onPress={onShareToFeed}
      disabled={feedPosted}
      activeOpacity={0.7}>
      <Text style={s.saveCardIcon}>{feedPosted ? '✓' : '✏️'}</Text>
      <View style={s.saveCardBody}>
        <Text style={[s.saveCardTitle, s.feedShareTitle, feedPosted && s.saveCardTitleDone]}>
          {feedPosted ? '게시 완료!' : '피드에 글 올리기'}
        </Text>
        <Text style={s.saveCardSub}>
          {feedPosted ? '내 게시물이 피드에 올라왔어요' : '글을 써서 앱 피드에 공유해보세요'}
        </Text>
      </View>
    </TouchableOpacity>

    {/* ── 기기에 저장 ── */}
    <Text style={[s.sectionLabel, s.sectionLabelSpaced]}>📥 기기에 저장</Text>
    <TouchableOpacity
      style={[s.saveCard, s.deviceSaveCard, deviceSaved && s.saveCardDone]}
      onPress={onSaveToDevice}
      disabled={deviceSaved || deviceSaving}
      activeOpacity={0.7}>
      <Text style={s.saveCardIcon}>
        {deviceSaved ? '✓' : deviceSaving ? '···' : '📲'}
      </Text>
      <View style={s.saveCardBody}>
        <Text style={[s.saveCardTitle, s.deviceSaveTitle, deviceSaved && s.saveCardTitleDone]}>
          {deviceSaved ? '갤러리 저장 완료!' : deviceSaving ? '저장 중...' : '스마트폰에 저장'}
        </Text>
        <Text style={s.saveCardSub}>
          {Platform.OS === 'ios'
            ? deviceSaved ? 'kelpus 앨범에서 확인하세요' : '사진 앱 kelpus 앨범에 이미지로 저장'
            : deviceSaved ? '갤러리에서 확인하세요' : '갤러리에 이미지로 저장'}
        </Text>
      </View>
    </TouchableOpacity>

    {/* ── SNS 공유 ── */}
    <Text style={[s.sectionLabel, s.sectionLabelSpaced]}>📱 SNS 공유</Text>
    {sharing ? (
      <View style={s.sharingIndicator}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.sharingText}>공유 중...</Text>
      </View>
    ) : (
      <View style={s.shareOptions}>
        <TouchableOpacity style={s.shareCard} onPress={() => onDoShare('stories')} activeOpacity={0.7}>
          <Text style={s.shareCardIcon}>📸</Text>
          <Text style={s.shareCardTitle}>Instagram Stories</Text>
          <Text style={s.shareCardSub}>스토리로 공유</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.shareCard} onPress={() => onDoShare('feed')} activeOpacity={0.7}>
          <Text style={s.shareCardIcon}>📷</Text>
          <Text style={s.shareCardTitle}>Instagram 피드</Text>
          <Text style={s.shareCardSub}>피드에 게시</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.shareCard, s.shareCardNative]} onPress={() => onDoShare('native')} activeOpacity={0.7}>
          <Text style={s.shareCardIcon}>🔗</Text>
          <Text style={s.shareCardTitle}>기타 앱 공유</Text>
          <Text style={s.shareCardSub}>카카오톡, 문자, 트위터 등</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* ── 완료 버튼 ── */}
    <TouchableOpacity style={s.doneBtn} onPress={onDone} activeOpacity={0.85}>
      <Text style={s.doneBtnText}>✓ 완료 — 홈으로 돌아가기</Text>
    </TouchableOpacity>
  </ScrollView>
);

// ── 메인 모달 ───────────────────────────────────────────────────────────────

export interface FeedShareData {
  reelId?: string;
  caption: string;
  hashtags: string[];
  runningStats?: {distanceKm: number; duration: string; pace: string; calories: number; steps?: number};
  totalCalories?: number;
}

interface Props {
  onClose: () => void;
  onShareToFeed?: (data: FeedShareData) => void;
}

const STEP_LABELS = ['선택', '미리보기', '저장/공유'];

export const ReelCreatorModal = ({onClose, onShareToFeed}: Props) => {
  const {
    dietFrames, runningFrames,
    selectedIds, selectedFrames,
    step, caption, hashtags, sharing,
    toggleItem, goToPreview, goToShare, goBack, reset,
    setCaption, setHashtags, doShare,
  } = useReelCreator();

  const {saveReel} = useSavedReels();

  const [saved,         setSaved]         = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [localSharing,  setLocalSharing]  = useState(false);
  const [deviceSaving,  setDeviceSaving]  = useState(false);
  const [deviceSaved,   setDeviceSaved]   = useState(false);
  const [feedPosted,    setFeedPosted]    = useState(false);
  const savedReelId = useRef<string | undefined>();

  const playerRef      = useRef<ReelPreviewPlayerHandle>(null);
  const capturedUri    = useRef<string | undefined>();

  // Step 1 → 2: 현재 슬라이드 미리 캡처
  const handleGoToShare = async () => {
    try {
      capturedUri.current = await playerRef.current?.captureCurrentFrame();
    } catch {}
    goToShare();
  };

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      const reel = await saveReel(selectedFrames, caption, hashtags.split(/\s+/).filter(Boolean));
      savedReelId.current = reel.id;
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleShareToFeed = () => {
    if (feedPosted || !onShareToFeed) return;
    const runningFrame = selectedFrames.find(f => f.type === 'running') as
      | (typeof selectedFrames[0] & {type: 'running'})
      | undefined;
    const dietFrame = selectedFrames.find(f => f.type === 'diet') as
      | (typeof selectedFrames[0] & {type: 'diet'})
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
      reelId: savedReelId.current,
      caption,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
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

  // 기기 갤러리에 직접 저장
  const handleSaveToDevice = async () => {
    if (deviceSaved || deviceSaving) return;
    if (!capturedUri.current) {
      Alert.alert('저장 실패', '미리보기 화면에서 이미지를 캡처하지 못했습니다.\n이전 단계로 돌아가서 다시 시도해주세요.');
      return;
    }
    setDeviceSaving(true);
    try {
      const result = await shareService.saveToDevice(capturedUri.current);
      if (result === 'saved') {
        setDeviceSaved(true);
      } else if (result === 'shared') {
        // iOS 공유 시트 오픈됨 — 완료 처리하지 않음 (사용자가 직접 저장)
      }
      // permission_denied / failed: shareService 내부에서 Alert 표시
    } finally {
      setDeviceSaving(false);
    }
  };

  const handleDoShare = async (method: 'stories' | 'feed' | 'native') => {
    setLocalSharing(true);
    try {
      const content = {
        caption,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        imageDataUrl: capturedUri.current,
      };
      if (method === 'stories')     await shareService.shareToInstagramStories(content);
      else if (method === 'feed')   await shareService.shareToInstagramFeed(content);
      else                          await shareService.shareNative(content);
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
      <SafeAreaView style={s.modal} edges={['top', 'bottom']}>

        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={step === 0 ? handleClose : goBack}
            style={s.headerBtn}>
            <Text style={s.headerBtnText}>{step === 0 ? '✕' : '‹'}</Text>
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>나의 기록 릴스</Text>
            <View style={s.stepDots}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    s.stepDot,
                    step === i && s.stepDotActive,
                    step > i && s.stepDotDone,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Step 2: 닫기 버튼, 나머지: 단계 레이블 */}
          {step === 2 ? (
            <TouchableOpacity onPress={handleClose} style={s.headerBtn}>
              <Text style={s.headerBtnText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.headerBtn}>
              <Text style={s.stepLabel}>{STEP_LABELS[step]}</Text>
            </View>
          )}
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
            deviceSaving={deviceSaving}
            deviceSaved={deviceSaved}
            feedPosted={feedPosted}
            onSave={handleSave}
            onSaveToDevice={handleSaveToDevice}
            onDoShare={handleDoShare}
            onShareToFeed={onShareToFeed ? handleShareToFeed : () => {}}
            onDone={handleClose}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ── 스타일 ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  modal: {flex: 1, backgroundColor: colors.background},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  headerBtn: {width: 44, alignItems: 'center', justifyContent: 'center'},
  headerBtnText: {fontSize: 22, color: colors.text.primary, fontWeight: '400', lineHeight: 28},
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {...typography.body1, fontWeight: '700', color: colors.text.primary},
  stepLabel: {...typography.caption, color: colors.text.secondary, textAlign: 'right'},
  stepDots: {flexDirection: 'row', gap: 6, marginTop: 4},
  stepDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border},
  stepDotActive: {backgroundColor: colors.primary, width: 18},
  stepDotDone: {backgroundColor: colors.primaryLight},

  step: {flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md},
  stepDesc: {...typography.body2, color: colors.text.secondary, marginBottom: spacing.md},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: spacing.lg},

  sectionLabel: {
    ...typography.body2, fontWeight: '700', color: colors.text.primary,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  sectionLabelSpaced: {marginTop: spacing.lg},

  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  itemCardSelected: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  itemCardLeft: {flex: 1},
  itemCardMain: {...typography.body1, fontWeight: '700', color: colors.text.primary},
  itemCardSub: {...typography.caption, color: colors.text.secondary, marginTop: 2},
  itemCardMeta: {...typography.caption, color: colors.text.disabled, marginTop: 2},
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkboxSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  checkmark: {fontSize: 13, color: '#fff', fontWeight: '700'},

  emptyBox: {alignItems: 'center', paddingVertical: spacing.xxl},
  emptyIcon: {fontSize: 40, marginBottom: spacing.md},
  emptyText: {...typography.body1, color: colors.text.disabled, textAlign: 'center', lineHeight: 24},

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.md,
  },
  primaryBtnDisabled: {backgroundColor: colors.border},
  primaryBtnText: {...typography.button, color: '#fff', fontWeight: '700'},

  inputLabel: {
    ...typography.body2, fontWeight: '600', color: colors.text.primary,
    marginTop: spacing.md, marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, padding: spacing.sm,
    ...typography.body2, color: colors.text.primary, minHeight: 48,
  },
  previewFooter: {height: spacing.xl},

  shareStep: {paddingBottom: 0},
  shareScrollContent: {paddingBottom: spacing.xl},

  sharingIndicator: {alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md},
  sharingText: {...typography.body1, color: colors.text.secondary},
  shareOptions: {gap: spacing.sm},

  shareCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  shareCardNative: {borderColor: colors.primaryLight},
  shareCardIcon: {fontSize: 32, marginBottom: spacing.xs},
  shareCardTitle: {...typography.body1, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs},
  shareCardSub: {...typography.caption, color: colors.text.secondary},

  saveCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary,
    gap: spacing.sm,
  },
  saveCardDone: {borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.06)'},
  deviceSaveCard: {borderColor: '#5B9BD5'},
  feedShareCard: {borderColor: '#A855F7'},
  feedShareTitle: {color: '#A855F7'},
  saveCardIcon: {fontSize: 24, width: 32, textAlign: 'center'},
  saveCardBody: {flex: 1},
  saveCardTitle: {...typography.body1, fontWeight: '700', color: colors.primary},
  deviceSaveTitle: {color: '#5B9BD5'},
  saveCardTitleDone: {color: '#4CAF50'},
  saveCardSub: {...typography.caption, color: colors.text.secondary, marginTop: 2},

  // 완료 버튼
  doneBtn: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
});
