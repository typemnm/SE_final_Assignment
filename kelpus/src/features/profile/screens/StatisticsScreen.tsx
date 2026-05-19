import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, typography, spacing} from '@theme/index';

type Period = 'daily' | 'weekly' | 'monthly';

export const StatisticsScreen = () => {
  const [period, setPeriod] = useState<Period>('weekly');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 기록 통계</Text>
      <View style={styles.tabRow}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[styles.tab, period === p && styles.activeTab]} onPress={() => setPeriod(p)}>
            <Text style={[styles.tabText, period === p && styles.activeTabText]}>
              {p === 'daily' ? '일' : p === 'weekly' ? '주' : '월'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.placeholder}>통계 차트가 여기에 표시됩니다.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.lg},
  tabRow: {flexDirection: 'row', marginBottom: spacing.lg},
  tab: {flex: 1, padding: spacing.sm, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surface},
  activeTab: {backgroundColor: colors.primary},
  tabText: {...typography.body2, color: colors.text.secondary},
  activeTabText: {color: colors.text.inverse},
  placeholder: {...typography.body1, color: colors.text.disabled, textAlign: 'center', marginTop: spacing.xl},
});
