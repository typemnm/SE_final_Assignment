import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useDiet} from '../hooks/useDiet';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';

export const DietAnalysisScreen = () => {
  const {currentAnalysis, analyzing} = useDiet();

  if (analyzing) return <LoadingSpinner fullScreen />;

  if (!currentAnalysis) return (
    <View style={styles.container}>
      <Text style={styles.empty}>분석 결과가 없습니다. 식단 화면에서 AI 분석을 요청하세요.</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI 식단 분석 결과</Text>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>영양 점수</Text>
        <Text style={styles.score}>{currentAnalysis.nutritionScore}점</Text>
      </View>
      <Text style={styles.sectionTitle}>개선 제안</Text>
      {currentAnalysis.suggestions.map((s, i) => (
        <Text key={i} style={styles.suggestion}>• {s}</Text>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.lg},
  empty: {...typography.body1, color: colors.text.disabled, textAlign: 'center', marginTop: spacing.xl},
  scoreCard: {backgroundColor: colors.primary, borderRadius: 12, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg},
  scoreLabel: {...typography.body2, color: colors.text.inverse},
  score: {...typography.h1, color: colors.text.inverse},
  sectionTitle: {...typography.h3, color: colors.text.primary, marginBottom: spacing.md},
  suggestion: {...typography.body1, color: colors.text.secondary, marginBottom: spacing.sm},
});
