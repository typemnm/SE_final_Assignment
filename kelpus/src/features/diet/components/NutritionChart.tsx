import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography, spacing} from '@theme/index';

interface NutritionChartProps {
  protein: number;
  carbs: number;
  fat: number;
}

export const NutritionChart = ({protein, carbs, fat}: NutritionChartProps) => {
  const total = protein + carbs + fat || 1;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>영양소 구성</Text>
      <View style={styles.bar}>
        <View style={[styles.segment, {flex: protein / total, backgroundColor: '#4CAF50'}]} />
        <View style={[styles.segment, {flex: carbs / total, backgroundColor: '#2196F3'}]} />
        <View style={[styles.segment, {flex: fat / total, backgroundColor: '#FF5722'}]} />
      </View>
      <View style={styles.legend}>
        {[{label: '단백질', value: protein, color: '#4CAF50'}, {label: '탄수화물', value: carbs, color: '#2196F3'}, {label: '지방', value: fat, color: '#FF5722'}].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: item.color}]} />
            <Text style={styles.legendText}>{item.label}: {item.value}g</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md},
  title: {...typography.body1, color: colors.text.primary, marginBottom: spacing.sm},
  bar: {flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: spacing.sm},
  segment: {height: '100%'},
  legend: {flexDirection: 'row', flexWrap: 'wrap'},
  legendItem: {flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginBottom: spacing.xs},
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: spacing.xs},
  legendText: {...typography.caption, color: colors.text.secondary},
});
