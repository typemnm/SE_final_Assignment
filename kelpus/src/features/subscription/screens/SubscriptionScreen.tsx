import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSubscription} from '../hooks/useSubscription';
import {Button} from '@components/common/Button';
import {colors, typography, spacing} from '@theme/index';

export const SubscriptionScreen = () => {
  const {plan, remainingAnalyses, totalAnalyses, upgradeToPremium} = useSubscription();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>구독 관리</Text>
      <View style={styles.card}>
        <Text style={styles.planLabel}>현재 플랜</Text>
        <Text style={styles.planName}>{plan === 'free' ? '무료 플랜' : '프리미엄 플랜'}</Text>
        <Text style={styles.analysisCount}>오늘 남은 AI 분석: {remainingAnalyses} / {totalAnalyses}회</Text>
      </View>
      {plan === 'free' && (
        <Button title="프리미엄으로 업그레이드" onPress={upgradeToPremium} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.lg},
  card: {backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3},
  planLabel: {...typography.caption, color: colors.text.secondary},
  planName: {...typography.h3, color: colors.primary, marginVertical: spacing.xs},
  analysisCount: {...typography.body2, color: colors.text.secondary},
});
