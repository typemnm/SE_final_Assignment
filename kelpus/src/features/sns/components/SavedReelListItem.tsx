import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {SavedReel} from '../hooks/useSavedReels';
import type {DietFrame, RunningFrame} from '../hooks/useReelCreator';
import {colors, typography, spacing} from '@theme/index';

interface Props {
  reel: SavedReel;
  onPress: () => void;
}

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];

export const SavedReelListItem = ({reel, onPress}: Props) => {
  const d = new Date(reel.createdAt);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DOW_KR[d.getDay()];

  const dietFrames = reel.frames.filter(f => f.type === 'diet') as DietFrame[];
  const runFrames = reel.frames.filter(f => f.type === 'running') as RunningFrame[];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.item}>
        {/* 날짜 컬럼 */}
        <View style={styles.dateCol}>
          <Text style={styles.dateMonth}>{month}월</Text>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateDow}>{dow}요일</Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 내용 요약 */}
        <View style={styles.content}>
          {dietFrames.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>🍽️</Text>
              <Text style={styles.summaryText}>
                {dietFrames[0].totalCalories.toLocaleString()} kcal
              </Text>
              <Text style={styles.summaryMeta}>
                {' '}· 탄{Math.round(dietFrames[0].carbRatio)}% 단{Math.round(dietFrames[0].proteinRatio)}% 지{Math.round(dietFrames[0].fatRatio)}%
              </Text>
            </View>
          )}
          {runFrames.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>🏃</Text>
              <Text style={styles.summaryText}>
                {runFrames[0].distanceKm >= 1
                  ? `${runFrames[0].distanceKm.toFixed(2)} km`
                  : `${Math.round(runFrames[0].distanceKm * 1000)} m`}
              </Text>
              <Text style={styles.summaryMeta}>
                {' '}· {Math.floor(runFrames[0].durationSeconds / 60)}분
              </Text>
            </View>
          )}
          {reel.caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {reel.caption}
            </Text>
          ) : null}
        </View>

        {/* 화살표 */}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // 날짜 컬럼
  dateCol: {
    alignItems: 'center',
    width: 44,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 32,
    includeFontPadding: false,
  },
  dateDow: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 1,
  },

  // 구분선
  divider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm + 2,
  },

  // 내용
  content: {flex: 1, gap: 4},
  summaryRow: {flexDirection: 'row', alignItems: 'center'},
  summaryIcon: {fontSize: 14, marginRight: 5},
  summaryText: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  caption: {
    ...typography.caption,
    color: colors.text.disabled,
    marginTop: 2,
  },

  // 화살표
  arrow: {
    fontSize: 22,
    color: colors.border,
    fontWeight: '400',
    marginLeft: spacing.sm,
    lineHeight: 28,
  },
});
