import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSubscription} from '../../subscription/hooks/useSubscription';
import {SubscriptionType} from '@appTypes/subscription.types';
import {colors, typography, spacing} from '@theme/index';

export const AnalysisCountBadge = () => {
  const {plan, dailyLimitStatus} = useSubscription();
  const remaining = dailyLimitStatus?.remaining ?? 0;
  const limit = dailyLimitStatus?.limit ?? 0;
  const isLow = remaining <= 1;

  return (
    <View style={[styles.badge, isLow && styles.badgeLow]}>
      <Text style={styles.text}>AI 분석 {remaining}/{limit}회 남음</Text>
      {plan?.type === SubscriptionType.FREE && (
        <Text style={styles.subText}>프리미엄으로 업그레이드하면 더 많이 이용 가능</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {backgroundColor: colors.primaryLight, padding: spacing.sm, borderRadius: 8, marginBottom: spacing.md},
  badgeLow: {backgroundColor: '#FFEBEE'},
  text: {...typography.body2, color: colors.primaryDark},
  subText: {...typography.caption, color: colors.text.secondary, marginTop: spacing.xs},
});
