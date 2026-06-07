import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useDiet} from '../hooks/useDiet';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';
import {NutritionChart} from '../components/NutritionChart';

export const DietAnalysisScreen = () => {
  const {currentAnalysis, analyzing} = useDiet();

  if (analyzing) {
    return <LoadingSpinner fullScreen />;
  }

  if (!currentAnalysis) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>분석 결과가 없습니다. 식단 화면에서 AI 분석을 요청하세요.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI 식단 분석 결과</Text>
      <View style={styles.calorieCard}>
        <Text style={styles.scoreLabel}>총 칼로리</Text>
        <Text style={styles.score}>{Math.round(currentAnalysis.total_calories)} kcal</Text>
      </View>
      <NutritionChart
        title="탄단지 비율"
        protein={currentAnalysis.protein_ratio}
        carbs={currentAnalysis.carb_ratio}
        fat={currentAnalysis.fat_ratio}
        unit="%"
      />
      <Text style={styles.sectionTitle}>AI 코멘트</Text>
      <Text style={styles.comment}>{currentAnalysis.ai_comment ?? 'AI 코멘트가 없습니다.'}</Text>
      <Text style={styles.timestamp}>분석 시각: {currentAnalysis.analyzed_at}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.lg},
  empty: {
    ...typography.body1,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  calorieCard: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreLabel: {...typography.body2, color: colors.text.inverse},
  score: {...typography.h1, color: colors.text.inverse},
  sectionTitle: {...typography.h3, color: colors.text.primary, marginBottom: spacing.md},
  comment: {...typography.body1, color: colors.text.secondary, marginBottom: spacing.sm},
  timestamp: {...typography.caption, color: colors.text.secondary},
});
