import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useSelector} from 'react-redux';
import {useProfile} from '../hooks/useProfile';
import type {RootState} from '@store/index';
import {colors, typography, spacing} from '@theme/index';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_LABELS: Record<Period, string> = {daily: '일', weekly: '주', monthly: '월'};

export const StatisticsScreen = () => {
  const [period, setPeriod] = useState<Period>('weekly');
  const {profile, isProfileComplete} = useProfile();

  const analysisHistory = useSelector((state: RootState) => state.diet.analysisHistory);
  const runningRecords = useSelector((state: RootState) => state.running.records);

  const totalDistance = runningRecords
    .reduce((sum: number, r) => sum + r.distance, 0)
    .toFixed(1);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.tabRow}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && styles.activeTab]}
            onPress={() => setPeriod(p)}>
            <Text style={[styles.tabText, period === p && styles.activeTabText]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>식단 분석</Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysisHistory.length}</Text>
            <Text style={styles.statLabel}>총 분석 횟수</Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.remaining}</Text>
            <Text style={styles.statLabel}>오늘 잔여 횟수</Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.dailyAiLimit}</Text>
            <Text style={styles.statLabel}>일일 한도</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>러닝 기록</Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{runningRecords.length}</Text>
            <Text style={styles.statLabel}>총 러닝 횟수</Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalDistance}</Text>
            <Text style={styles.statLabel}>총 거리 (km)</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>목표 달성률</Text>
        {isProfileComplete ? (
          <View style={styles.goalArea}>
            <View style={styles.goalCircle}>
              <Text style={styles.goalPercent}>
                {Math.min(
                  100,
                  Math.round(
                    (analysisHistory.length / Math.max(1, profile.dailyAiLimit * 7)) * 100,
                  ),
                )}
                %
              </Text>
              <Text style={styles.goalCircleLabel}>주간</Text>
            </View>
            <Text style={styles.goalDesc}>
              목표:{' '}
              {profile.goal === 'weight_loss'
                ? '체중 감량'
                : profile.goal === 'muscle_gain'
                ? '근육 증가'
                : '건강 유지'}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            프로필을 완성하면 목표 달성률을 볼 수 있습니다.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  tabRow: {flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm},
  tab: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  activeTab: {backgroundColor: colors.primary},
  tabText: {...typography.body2, color: colors.text.secondary},
  activeTabText: {color: colors.text.inverse},
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  statRow: {flexDirection: 'row', justifyContent: 'space-around'},
  statItem: {alignItems: 'center', flex: 1},
  statValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {...typography.caption, color: colors.text.secondary},
  dividerV: {width: 1, backgroundColor: colors.divider, marginVertical: spacing.sm},
  goalArea: {alignItems: 'center'},
  goalCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalPercent: {...typography.h2, color: colors.primary, fontWeight: '700'},
  goalCircleLabel: {...typography.body2, color: colors.text.secondary},
  goalDesc: {...typography.body2, color: colors.text.secondary},
  emptyText: {
    ...typography.body2,
    color: colors.text.disabled,
    textAlign: 'center',
    padding: spacing.md,
  },
});
