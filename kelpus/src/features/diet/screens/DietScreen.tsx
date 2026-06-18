import React, {useRef, useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {AppHeader} from '@components/common/AppHeader';
import {ThemeBackground} from '@components/common/ThemeBackground';
import {useThemeContext} from '@theme/ThemeContext';
import {useDiet} from '../hooks/useDiet';
import {colors} from '@theme/index';
import type {DietNavigationProp} from '@navigation/types';

// ─────────── Design tokens ───────────
const CARD    = 'rgba(13, 32, 22, 0.72)';
const CARD_T  = 'rgba(255, 255, 255, 0.09)';  // top highlight
const CARD_S  = 'rgba(45, 74, 60, 0.18)';     // side/bottom
const TRACK   = '#1A2E22';
const TEXT_PRI = '#D0E8D8';
const TEXT_SEC = '#BBCAC0';
const TEXT_DIS = '#4B6358';
const GOLD    = '#FCD34D';
const EMERALD = '#34D399';
const TEAL    = '#18A479';
const TARGET_KCAL = 1900;

const MEAL_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

// ─────────── Animated nutrient bar ───────────
interface NutrientBarProps {
  label: string;
  valueG: number;
  maxG: number;
  barColor: string;
  playAnim?: boolean;
}

const NutrientBar = ({label, valueG, maxG, barColor, playAnim}: NutrientBarProps) => {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = maxG > 0 ? Math.min(valueG / maxG, 1) * 100 : 0;

  useEffect(() => {
    if (!playAnim) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: pct,
      duration: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, playAnim]);

  const animWidth = anim.interpolate({inputRange: [0, 100], outputRange: ['0%', '100%']});

  return (
    <View style={nb.wrap}>
      <View style={nb.row}>
        <Text style={nb.label}>{label}</Text>
        <Text style={nb.value}>{valueG}g</Text>
      </View>
      <View style={nb.track}>
        <Animated.View style={[nb.fill, {width: animWidth, backgroundColor: barColor}]} />
      </View>
    </View>
  );
};

const nb = StyleSheet.create({
  wrap:  {marginBottom: 22},
  row:   {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
  label: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    color: TEXT_SEC, fontFamily: 'PlusJakartaSans', textTransform: 'uppercase',
  },
  value: {fontSize: 18, fontWeight: '600', color: TEXT_PRI, fontFamily: 'SpaceGrotesk'},
  track: {height: 10, backgroundColor: TRACK, borderRadius: 5, overflow: 'hidden'},
  fill:  {height: '100%', borderRadius: 5},
});

// Helper: section style from one Animated.Value
const sectionStyle = (anim: Animated.Value) => ({
  opacity: anim,
  transform: [{
    translateY: anim.interpolate({inputRange: [0, 1], outputRange: [28, 0]}),
  }],
});

// ─────────── DietScreen ───────────
export const DietScreen = () => {
  const navigation = useNavigation<DietNavigationProp>();
  const {
    records, currentAnalysis, analyzing, error,
    healthConnectExportStatus, healthConnectExportError,
    healthConnectBackfillSummary, healthConnectBackfillBusy, healthConnectBackfillError,
    cameraBusy, cameraError, clearCameraError,
    requestAnalysis, analyzeCapturedImage, backfillHealthConnectNutrition,
  } = useDiet();

  const {tc} = useThemeContext();
  const [dietImageUrl, setDietImageUrl] = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [displayCalorie, setDisplayCalorie] = useState(0);
  const [barsReady, setBarsReady] = useState(false);

  const trimmedUrl  = dietImageUrl.trim();
  const isBusy      = analyzing || cameraBusy;
  const canAnalyze  = trimmedUrl.length > 0 && !isBusy;
  const displayError = cameraError ?? error;

  // Derived data
  const totalCalories = currentAnalysis ? Math.round(currentAnalysis.total_calories) : 0;
  const goalPercent   = Math.min(Math.round((totalCalories / TARGET_KCAL) * 100), 100);
  const nd            = currentAnalysis?.nutrition_details;
  const carbsG  = Math.round(nd?.carbohydrate ?? nd?.carbohydrates ?? (currentAnalysis?.carb_ratio  ?? 0) * totalCalories / 4);
  const proteinG= Math.round(nd?.protein      ??                      (currentAnalysis?.protein_ratio?? 0) * totalCalories / 4);
  const fatG    = Math.round(nd?.fat          ??                      (currentAnalysis?.fat_ratio    ?? 0) * totalCalories / 9);
  const latestRecord = records[0];

  // Status messages
  const backfillSummaryText = healthConnectBackfillSummary
    ? `내보내기: 성공 ${healthConnectBackfillSummary.exported}건, 건너뜀 ${healthConnectBackfillSummary.skipped}건`
    : null;
  const hcMessage =
    healthConnectExportStatus === 'exported'    ? 'Health Connect에 저장되었습니다.'         :
    healthConnectExportStatus === 'permission_required' ? 'Health Connect 권한이 필요합니다.' :
    healthConnectExportStatus === 'unavailable' ? 'Health Connect를 사용할 수 없습니다.'     :
    healthConnectExportStatus === 'failed'      ? (healthConnectExportError ?? '내보내기 실패') : null;

  // ── Section entrance animation values (7 sections)
  const SA = useRef(Array.from({length: 7}, () => new Animated.Value(0))).current;
  const countAnim = useRef(new Animated.Value(0)).current;

  // Replay on tab focus
  useFocusEffect(useCallback(() => {
    SA.forEach(a => a.setValue(0));
    countAnim.setValue(0);
    setDisplayCalorie(0);
    setBarsReady(false);

    const stagger = Animated.stagger(
      65,
      SA.map(a =>
        Animated.spring(a, {
          toValue: 1,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }),
      ),
    );
    stagger.start(() => setBarsReady(true));

    const lid = countAnim.addListener(({value}) => setDisplayCalorie(Math.round(value)));
    Animated.timing(countAnim, {
      toValue: totalCalories,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      stagger.stop();
      countAnim.removeListener(lid);
    };
  }, [totalCalories]));

  // Handlers
  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    clearCameraError();
    const result = await requestAnalysis(trimmedUrl).catch(() => null);
    if (result) navigation.navigate('DietAnalysis');
  };
  const handleCamera = async () => {
    if (isBusy) return;
    const result = await analyzeCapturedImage();
    if (result) navigation.navigate('DietAnalysis');
  };

  return (
    <ThemeBackground style={s.root}>
      {/* Decorative background orbs */}
      <View style={[s.orb1, {backgroundColor: tc.orb1}]} />
      <View style={[s.orb2, {backgroundColor: tc.orb2}]} />
      <View style={[s.orb3, {backgroundColor: tc.orb1}]} />

      <AppHeader />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* spacer where header was */}
        <View style={s.headerSpace} />

        {/* ── 1: Hero calorie card ── */}
        <Animated.View style={[sectionStyle(SA[1]), s.section]}>
          <View style={[s.card, s.heroCard]}>
            {/* Inner top shimmer */}
            <LinearGradient
              colors={['rgba(255,255,255,0.06)', 'transparent']}
              style={s.cardShimmer}
            />
            <Text style={s.heroLabel}>오늘의 섭취 칼로리</Text>
            <Text style={s.heroCalorie}>
              {displayCalorie > 0 ? displayCalorie.toLocaleString() : '—'} kcal
            </Text>
            <View style={s.goalBadge}>
              <Text style={s.goalBadgeText}>📈  목표치 {goalPercent}% 달성 중</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── 2: AI comment ── */}
        <Animated.View style={[sectionStyle(SA[2]), s.section]}>
          <Text style={s.commentText}>
            {currentAnalysis?.ai_comment
              ? `"${currentAnalysis.ai_comment}"`
              : '"식단을 분석하면 AI 코멘트가 여기에 표시됩니다."'}
          </Text>
        </Animated.View>

        {/* ── 3: Nutrient progress bars ── */}
        <Animated.View style={[sectionStyle(SA[3]), s.section]}>
          <View style={s.card}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'transparent']}
              style={s.cardShimmer}
            />
            <View style={s.nutriHeader}>
              <Text style={s.nutriTitle}>영양 성분 분석</Text>
            </View>
            <View style={s.barsPad}>
              <NutrientBar label="Carbs (탄수화물)" valueG={carbsG}   maxG={250} barColor={EMERALD} playAnim={barsReady} />
              <NutrientBar label="Protein (단백질)"  valueG={proteinG} maxG={150} barColor={TEAL}    playAnim={barsReady} />
              <NutrientBar label="Fat (지방)"         valueG={fatG}     maxG={80}  barColor={GOLD}    playAnim={barsReady} />
            </View>
          </View>
        </Animated.View>

        {/* ── 4: Bento grid ── */}
        <Animated.View style={[sectionStyle(SA[4]), s.section]}>
          <View style={s.bentoRow}>
            {/* Meal card */}
            <View style={[s.card, s.bentoHalf, {marginRight: 6}]}>
              <LinearGradient colors={['rgba(255,255,255,0.05)','transparent']} style={s.cardShimmer} />
              <Text style={s.bentoIcon}>🥗</Text>
              <View>
                <Text style={s.bentoLabel}>
                  {latestRecord ? (MEAL_LABEL[latestRecord.mealType] ?? latestRecord.mealType) : '기록 없음'}
                </Text>
                <Text style={s.bentoValue} numberOfLines={2}>
                  {latestRecord?.items[0]?.name ?? (latestRecord ? `${latestRecord.totalCalories} kcal` : '식단을\n기록하세요')}
                </Text>
              </View>
            </View>
            {/* Photo/record count card */}
            <View style={[s.card, s.bentoHalf, s.bentoDark, {marginLeft: 6}]}>
              <LinearGradient colors={['rgba(52,211,153,0.12)','transparent']} style={s.cardShimmer} />
              <Text style={s.bentoIcon}>📷</Text>
              <View>
                <Text style={s.bentoLabelLight}>기록된 식단</Text>
                <Text style={s.bentoValueLight}>{records.length}건 기록됨</Text>
              </View>
            </View>
          </View>

          {/* Water intake row */}
          <View style={[s.card, s.waterRow]}>
            <LinearGradient colors={['rgba(255,255,255,0.04)','transparent']} style={s.cardShimmer} />
            <View style={s.waterLeft}>
              <View style={s.waterIconWrap}>
                <Text style={s.waterEmoji}>💧</Text>
              </View>
              <View>
                <Text style={s.bentoLabel}>수분 섭취</Text>
                <Text style={s.bentoValue}>— / 2.0L</Text>
              </View>
            </View>
            <TouchableOpacity style={s.addBtn} activeOpacity={0.7}>
              <Text style={s.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── 5: Tip of the day ── */}
        <Animated.View style={[sectionStyle(SA[5]), s.section]}>
          <View style={[s.card, s.tipCard]}>
            <LinearGradient colors={['rgba(252,211,77,0.08)','transparent']} style={s.cardShimmer} />
            <Text style={s.tipIcon}>💡</Text>
            <View style={s.tipContent}>
              <Text style={s.tipTitle}>오늘의 건강 팁</Text>
              <Text style={s.tipBody}>
                저녁 식사 전 30분 동안의 공복 유지는 소화를 돕고 수면의 질을 높입니다.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── 6: Analysis form ── */}
        <Animated.View style={[sectionStyle(SA[6]), s.section]}>
          <TouchableOpacity
            style={s.analyzeToggle}
            onPress={() => setShowForm(v => !v)}
            activeOpacity={0.75}>
            <LinearGradient
              colors={showForm ? ['rgba(52,211,153,0.12)','rgba(52,211,153,0.06)'] : ['rgba(52,211,153,0.1)','rgba(52,211,153,0.04)']}
              style={s.analyzeToggleGrad}>
              <Text style={s.analyzeToggleText}>
                {showForm ? '▲  닫기' : '📊  식단 AI 분석하기'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {showForm && (
            <View style={[s.card, s.formCard]}>
              <LinearGradient colors={['rgba(255,255,255,0.04)','transparent']} style={s.cardShimmer} />
              <Text style={s.formLabel}>이미지 URL 입력</Text>
              <TextInput
                value={dietImageUrl}
                onChangeText={setDietImageUrl}
                placeholder="https://example.com/meal.jpg"
                placeholderTextColor={TEXT_DIS}
                style={s.formInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Primary gradient button */}
              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={!canAnalyze}
                activeOpacity={0.85}
                style={[s.gradBtn, !canAnalyze && s.btnDisabled]}>
                <LinearGradient
                  colors={['#18A479', '#5AF0B3']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={s.gradBtnInner}>
                  <Text style={s.gradBtnText}>
                    {analyzing ? '분석 중...' : 'AI 분석 요청'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={s.gap8} />

              {/* Outline buttons */}
              <TouchableOpacity
                style={[s.outlineBtn, isBusy && s.btnDisabled]}
                onPress={handleCamera}
                disabled={isBusy}
                activeOpacity={0.75}>
                <Text style={s.outlineBtnText}>
                  {cameraBusy ? '촬영 중...' : '📷  카메라로 촬영'}
                </Text>
              </TouchableOpacity>
              <View style={s.gap8} />
              <TouchableOpacity
                style={[s.outlineBtn, (isBusy || healthConnectBackfillBusy) && s.btnDisabled]}
                onPress={backfillHealthConnectNutrition}
                disabled={isBusy || healthConnectBackfillBusy}
                activeOpacity={0.75}>
                <Text style={s.outlineBtnText}>
                  {healthConnectBackfillBusy ? '내보내는 중...' : 'Health Connect 내보내기'}
                </Text>
              </TouchableOpacity>

              {cameraBusy ? <Text style={s.formHelper}>사진 업로드 후 AI 분석 요청 중...</Text> : null}
              <Text style={s.formHelper}>이미지 URL 또는 업로드 API URL을 입력하세요.</Text>
            </View>
          )}

          {/* Status messages */}
          {displayError        ? <Text style={[s.statusText, {color: colors.error}]}>{displayError}</Text>          : null}
          {healthConnectBackfillError ? <Text style={[s.statusText, {color: colors.error}]}>{healthConnectBackfillError}</Text> : null}
          {backfillSummaryText ? <Text style={[s.statusText, {color: EMERALD}]}>{backfillSummaryText}</Text>        : null}
          {hcMessage           ? <Text style={[s.statusText, {color: healthConnectExportStatus === 'exported' ? EMERALD : GOLD}]}>{hcMessage}</Text> : null}
        </Animated.View>

        {/* Synced records */}
        {records.length > 0 && (
          <View style={[s.section, {marginTop: 4}]}>
            <Text style={s.recordsTitle}>동기화된 식단 기록</Text>
            <FlatList
              data={records}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({item}) => (
                <View style={[s.card, s.recordItem]}>
                  <Text style={s.recordMeal}>{MEAL_LABEL[item.mealType] ?? item.mealType}</Text>
                  <Text style={s.recordCal}>{item.totalCalories} kcal</Text>
                </View>
              )}
            />
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </ThemeBackground>
  );
};

// ─────────── Styles ───────────
const s = StyleSheet.create({
  root:       {flex: 1},
  scroll:     {flex: 1},
  content:    {paddingBottom: 20},
  headerSpace:{height: 0},
  section:    {marginHorizontal: 20, marginBottom: 18},

  // Background orbs
  orb1: {
    position: 'absolute', top: -160, left: -80,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(52, 211, 153, 0.07)',
  },
  orb2: {
    position: 'absolute', top: 320, right: -100,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(252, 211, 77, 0.04)',
  },
  orb3: {
    position: 'absolute', bottom: 100, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(52, 211, 153, 0.04)',
  },

  // Glass card base — no overflow:hidden so iOS shadow shows
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderTopWidth: 1,
    borderTopColor: CARD_T,
    borderLeftWidth: 1,
    borderLeftColor: CARD_S,
    borderRightWidth: 1,
    borderRightColor: CARD_S,
    borderBottomWidth: 1,
    borderBottomColor: CARD_S,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  // Top-of-card shimmer overlay
  cardShimmer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 0,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(60, 74, 66, 0.4)',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center'},
  headerLeaf:  {fontSize: 20, marginRight: 8},
  headerTitle: {
    fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '800',
    letterSpacing: 3, color: EMERALD,
  },
  notifBtn:  {padding: 4},
  notifIcon: {fontSize: 20},

  // Hero card
  heroCard:    {padding: 28, alignItems: 'center'},
  heroLabel:   {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    color: TEXT_SEC, fontFamily: 'PlusJakartaSans',
    textTransform: 'uppercase', marginBottom: 10, zIndex: 1,
  },
  heroCalorie: {
    fontFamily: 'SpaceGrotesk', fontSize: 52, fontWeight: '700',
    color: GOLD, letterSpacing: -1.5, marginBottom: 18, zIndex: 1,
  },
  goalBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.25)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, zIndex: 1,
  },
  goalBadgeText: {
    fontSize: 13, color: EMERALD,
    fontFamily: 'PlusJakartaSans', fontWeight: '500',
  },

  // AI comment
  commentText: {
    fontSize: 16, color: '#62DCAD', fontStyle: 'italic',
    lineHeight: 26, textAlign: 'center',
    fontFamily: 'PlusJakartaSans',
  },

  // Nutrient card
  nutriHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 4, zIndex: 1,
  },
  nutriTitle: {fontFamily: 'PlusJakartaSans', fontSize: 17, fontWeight: '600', color: TEXT_PRI},
  barsPad:    {paddingHorizontal: 24, paddingBottom: 20, zIndex: 1},

  // Bento grid
  bentoRow: {flexDirection: 'row', marginBottom: 12},
  bentoHalf: {flex: 1, height: 158, padding: 20, justifyContent: 'space-between'},
  bentoDark:  {backgroundColor: 'rgba(10, 28, 18, 0.8)'},
  bentoIcon:  {fontSize: 24, marginBottom: 6, zIndex: 1},
  bentoLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    color: TEXT_SEC, fontFamily: 'PlusJakartaSans', marginBottom: 4, zIndex: 1,
  },
  bentoValue: {
    fontSize: 15, fontWeight: '600', color: TEXT_PRI,
    fontFamily: 'PlusJakartaSans', flexShrink: 1, zIndex: 1,
  },
  bentoLabelLight: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.6)', fontFamily: 'PlusJakartaSans', marginBottom: 4, zIndex: 1,
  },
  bentoValueLight: {
    fontSize: 15, fontWeight: '600', color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans', zIndex: 1,
  },

  // Water row
  waterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 20,
  },
  waterLeft: {flexDirection: 'row', alignItems: 'center'},
  waterIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(98, 220, 173, 0.16)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  waterEmoji: {fontSize: 20},
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.35)',
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: {fontSize: 22, color: EMERALD, lineHeight: 26},

  // Tip card
  tipCard: {
    flexDirection: 'row', padding: 22,
    borderLeftWidth: 3, borderLeftColor: GOLD,
  },
  tipIcon:    {fontSize: 20, marginRight: 14, marginTop: 2, zIndex: 1},
  tipContent: {flex: 1, zIndex: 1},
  tipTitle:   {fontFamily: 'PlusJakartaSans', fontSize: 16, fontWeight: '600', color: TEXT_PRI, marginBottom: 6},
  tipBody:    {fontFamily: 'PlusJakartaSans', fontSize: 13, color: TEXT_SEC, lineHeight: 20},

  // Analyze toggle
  analyzeToggle: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.22)',
    marginBottom: 10,
  },
  analyzeToggleGrad: {paddingVertical: 16, alignItems: 'center'},
  analyzeToggleText: {
    color: EMERALD, fontWeight: '600', fontSize: 14,
    fontFamily: 'PlusJakartaSans', letterSpacing: 0.3,
  },

  // Form
  formCard: {padding: 24, marginBottom: 4},
  formLabel: {
    fontSize: 13, color: TEXT_SEC,
    fontFamily: 'PlusJakartaSans', fontWeight: '500', marginBottom: 10, zIndex: 1,
  },
  formInput: {
    backgroundColor: 'rgba(10, 22, 16, 0.5)',
    borderWidth: 1, borderColor: 'rgba(45, 74, 60, 0.35)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: TEXT_PRI, fontSize: 14, fontFamily: 'PlusJakartaSans',
    marginBottom: 14, zIndex: 1,
  },
  gap8: {height: 8},
  gradBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#34D399', shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
    zIndex: 1,
  },
  btnDisabled: {opacity: 0.45},
  gradBtnInner: {paddingVertical: 15, alignItems: 'center', borderRadius: 14},
  gradBtnText: {
    color: '#003825', fontWeight: '700', fontSize: 15,
    fontFamily: 'PlusJakartaSans', letterSpacing: 0.4,
  },
  outlineBtn: {
    borderWidth: 1.5, borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.05)', zIndex: 1,
  },
  outlineBtnText: {
    color: EMERALD, fontWeight: '600', fontSize: 14,
    fontFamily: 'PlusJakartaSans',
  },
  formHelper: {
    fontSize: 12, color: TEXT_DIS,
    fontFamily: 'PlusJakartaSans', marginTop: 10, lineHeight: 18, zIndex: 1,
  },

  // Status
  statusText: {
    fontSize: 13, fontFamily: 'PlusJakartaSans',
    marginTop: 8, lineHeight: 20,
  },

  // Synced records
  recordsTitle: {
    fontFamily: 'PlusJakartaSans', fontSize: 15, fontWeight: '600',
    color: TEXT_PRI, marginBottom: 10,
  },
  recordItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, marginBottom: 8, borderRadius: 16,
  },
  recordMeal: {fontFamily: 'PlusJakartaSans', fontSize: 15, fontWeight: '500', color: TEXT_PRI},
  recordCal:  {fontFamily: 'SpaceGrotesk', fontSize: 14, color: TEXT_SEC},
});

