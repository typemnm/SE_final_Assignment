import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {formatDate} from '@utils/format';
import type {DietFrame, MealEntry} from '../hooks/useReelCreator';

interface Props {
  frame: DietFrame;
  compact?: boolean;
}

// ── 폰트: Android condensed, iOS system ──────────

const BOLD_FONT = Platform.select({
  android: 'sans-serif-condensed',
  ios: undefined,
});

// ── 식사별 설정 ───────────────────────────────────

const MEAL_CFG: Record<string, {icon: string; accent: string; bg: string}> = {
  아침: {icon: '🌅', accent: '#FF8F00', bg: 'rgba(255,143,0,0.16)'},
  점심: {icon: '☀️', accent: '#039BE5', bg: 'rgba(3,155,229,0.16)'},
  저녁: {icon: '🌙', accent: '#AB47BC', bg: 'rgba(171,71,188,0.16)'},
  간식: {icon: '🍪', accent: '#EF5350', bg: 'rgba(239,83,80,0.16)'},
};

// ── 서브 컴포넌트 ─────────────────────────────────

interface MacroBarProps {
  label: string;
  ratio: number;
  color: string;
}

const MacroBar = ({label, ratio, color}: MacroBarProps) => {
  const pct = Math.min(100, Math.max(0, Math.round(ratio)));
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, {width: `${pct}%`, backgroundColor: color}]} />
      </View>
      <Text style={styles.macroPercent}>{pct}%</Text>
    </View>
  );
};

interface MealRowProps {
  meal: MealEntry;
}

const MealRow = ({meal}: MealRowProps) => {
  const cfg = MEAL_CFG[meal.mealType] ?? MEAL_CFG['간식'];
  return (
    <View style={[styles.mealRow, {backgroundColor: cfg.bg, borderLeftColor: cfg.accent}]}>
      {/* 식사 종류 */}
      <View style={styles.mealHeader}>
        <Text style={styles.mealIcon}>{cfg.icon}</Text>
        <Text style={[styles.mealTypeName, {color: cfg.accent}]}>
          {meal.mealType}
        </Text>
      </View>
      {/* 칼로리 (크게) */}
      <Text style={[styles.mealCal, {fontFamily: BOLD_FONT}]}>
        {meal.calories}
        <Text style={styles.mealCalUnit}> kcal</Text>
      </Text>
      {/* 메뉴 항목 */}
      {meal.items.length > 0 && (
        <Text style={styles.mealItems} numberOfLines={2}>
          {meal.items.slice(0, 2).join('\n')}
        </Text>
      )}
    </View>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────

export const DietSlideFrame = ({frame, compact = false}: Props) => {
  const hasMeals = (frame.meals?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(frame.analyzedAt)}</Text>
        <Text style={styles.tag}>🍽️ 식단 분석</Text>
      </View>

      {hasMeals ? (
        <>
          {/* 총 칼로리 */}
          <View style={styles.totalSection}>
            <Text style={[styles.totalNumber, {fontFamily: BOLD_FONT}]}>
              {frame.totalCalories.toLocaleString()}
            </Text>
            <Text style={styles.totalUnit}>kcal{'\n'}하루 총 섭취</Text>
          </View>

          {/* 식사별 행 */}
          <View style={styles.mealsContainer}>
            {frame.meals!.map(meal => (
              <MealRow key={meal.mealType} meal={meal} />
            ))}
          </View>

          {/* 영양소 비율 pill */}
          <View style={styles.macroPillRow}>
            <View style={[styles.macroPill, {backgroundColor: 'rgba(3,155,229,0.20)'}]}>
              <Text style={[styles.macroPillTxt, {color: '#29B6F6'}]}>
                탄 {Math.round(frame.carbRatio)}%
              </Text>
            </View>
            <View style={[styles.macroPill, {backgroundColor: 'rgba(56,142,60,0.20)'}]}>
              <Text style={[styles.macroPillTxt, {color: '#66BB6A'}]}>
                단 {Math.round(frame.proteinRatio)}%
              </Text>
            </View>
            <View style={[styles.macroPill, {backgroundColor: 'rgba(255,143,0,0.20)'}]}>
              <Text style={[styles.macroPillTxt, {color: '#FFA726'}]}>
                지 {Math.round(frame.fatRatio)}%
              </Text>
            </View>
          </View>
        </>
      ) : (
        // 식사 데이터 없을 때 폴백
        <>
          <View style={styles.caloriesSection}>
            <Text style={[styles.caloriesNumber, {fontFamily: BOLD_FONT}]}>
              {frame.totalCalories.toLocaleString()}
            </Text>
            <Text style={styles.caloriesUnit}>kcal</Text>
          </View>
          <View style={styles.macrosBarsSection}>
            <MacroBar label="탄수화물" ratio={frame.carbRatio} color="#29B6F6" />
            <MacroBar label="단백질  " ratio={frame.proteinRatio} color="#66BB6A" />
            <MacroBar label="지방    " ratio={frame.fatRatio} color="#FFA726" />
          </View>
          {frame.aiComment ? (
            <Text style={styles.comment} numberOfLines={3}>
              "{frame.aiComment}"
            </Text>
          ) : (
            <View style={styles.spacer} />
          )}
        </>
      )}

      {/* 워터마크 */}
      <View style={styles.watermarkRow}>
        <View style={styles.wDot} />
        <Text style={styles.watermark}>kelpus</Text>
      </View>
    </View>
  );
};

// ── 스타일 ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D2E1A',
    padding: 20,
    justifyContent: 'space-between',
  },

  // 헤더 — 날짜/태그 크게
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  date: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  tag: {
    fontSize: 14,
    color: '#66BB6A',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // 총 칼로리 — 크고 굵게
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  totalNumber: {
    fontSize: 58,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 64,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  totalUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
    fontWeight: '500',
  },

  // 식사별 행 — 세로 정렬, 왼쪽 정렬
  mealsContainer: {flex: 1, gap: 6, marginVertical: 8},
  mealRow: {
    flex: 1,
    borderRadius: 12,
    borderLeftWidth: 3,
    paddingHorizontal: 13,
    paddingVertical: 8,
    gap: 3,
    justifyContent: 'center',
  },
  mealHeader: {flexDirection: 'row', alignItems: 'center', gap: 6},
  mealIcon: {fontSize: 18},
  mealTypeName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mealCal: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 38,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  mealCalUnit: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.60)',
  },
  mealItems: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 20,
  },

  // 영양소 pill
  macroPillRow: {flexDirection: 'row', gap: 6},
  macroPill: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  macroPillTxt: {fontSize: 14, fontWeight: '700', letterSpacing: 0.5},

  // 폴백 (식사 데이터 없을 때)
  caloriesSection: {alignItems: 'center', paddingVertical: 10},
  caloriesNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 72,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  caloriesUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  macrosBarsSection: {gap: 12},
  macroRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  macroLabel: {width: 54, fontSize: 12, color: 'rgba(255,255,255,0.65)'},
  macroTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {height: '100%', borderRadius: 3},
  macroPercent: {
    width: 34,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
  },
  comment: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  spacer: {height: 36},

  // 워터마크
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 4,
  },
  wDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#66BB6A'},
  watermark: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '700',
    letterSpacing: 2.5,
  },
});
