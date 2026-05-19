import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {SplitPace} from '@appTypes/running.types';
import {colors, typography, spacing} from '@theme/index';
import {formatPace} from '@utils/format';

interface PaceChartProps {
  splitPaces: SplitPace[];
}

export const PaceChart = ({splitPaces}: PaceChartProps) => {
  const maxPace = Math.max(...splitPaces.map(s => s.pace));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>구간별 페이스</Text>
      <View style={styles.chart}>
        {splitPaces.map(split => (
          <View key={split.km} style={styles.bar}>
            <View style={[styles.fill, {height: `${(split.pace / maxPace) * 100}%`, backgroundColor: split.pace < maxPace * 0.8 ? colors.primary : colors.accent}]} />
            <Text style={styles.label}>{split.km}km</Text>
            <Text style={styles.pace}>{formatPace(split.pace)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md},
  title: {...typography.body1, color: colors.text.primary, marginBottom: spacing.sm},
  chart: {flexDirection: 'row', alignItems: 'flex-end', height: 120},
  bar: {flex: 1, alignItems: 'center', justifyContent: 'flex-end'},
  fill: {width: '60%', borderRadius: 4},
  label: {...typography.caption, color: colors.text.secondary, marginTop: spacing.xs},
  pace: {...typography.caption, color: colors.text.disabled},
});
