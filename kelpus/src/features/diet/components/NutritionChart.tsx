import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography, spacing} from '@theme/index';

interface NutritionChartProps {
  protein: number;
  carbs: number;
  fat: number;
  unit?: 'g' | '%';
  title?: string;
}

const MACRO_ITEMS = [
  {key: 'protein', label: '단백질', color: '#4CAF50'},
  {key: 'carbs', label: '탄수화물', color: '#2196F3'},
  {key: 'fat', label: '지방', color: '#FF5722'},
] as const;

export const NutritionChart = ({
  protein,
  carbs,
  fat,
  unit = 'g',
  title = '영양소 구성',
}: NutritionChartProps) => {
  const total = protein + carbs + fat || 1;
  const macroValues = {protein, carbs, fat};
  const formatValue = (value: number) => `${Math.round(value * 10) / 10}${unit}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.bar}>
        {MACRO_ITEMS.map(item => (
          <View
            key={item.key}
            style={[
              styles.segment,
              {flex: macroValues[item.key] / total, backgroundColor: item.color},
            ]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {MACRO_ITEMS.map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: item.color}]} />
            <Text style={styles.legendText}>
              {item.label}: {formatValue(macroValues[item.key])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {...typography.body1, color: colors.text.primary, marginBottom: spacing.sm},
  bar: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  segment: {height: '100%'},
  legend: {flexDirection: 'row', flexWrap: 'wrap'},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: spacing.xs},
  legendText: {...typography.caption, color: colors.text.secondary},
});
