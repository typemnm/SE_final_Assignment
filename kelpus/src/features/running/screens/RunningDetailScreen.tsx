import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useRunning} from '../hooks/useRunning';
import {RunningMapView} from '../components/RunningMapView';
import {colors, typography, spacing} from '@theme/index';
import {formatDistance, formatDuration, formatPace} from '@utils/format';

export const RunningDetailScreen = () => {
  const {selectedRecord} = useRunning();

  if (!selectedRecord) return <Text style={{textAlign: 'center', marginTop: 20}}>기록을 선택해주세요.</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>러닝 상세</Text>
      <RunningMapView route={selectedRecord.route ?? []} />
      <View style={styles.statsGrid}>
        {[
          {label: '거리', value: formatDistance(selectedRecord.distance)},
          {label: '시간', value: formatDuration(selectedRecord.duration)},
          {label: '평균 페이스', value: formatPace(selectedRecord.avgPace)},
          {label: '칼로리', value: `${selectedRecord.calories} kcal`},
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  title: {...typography.h2, color: colors.text.primary, padding: spacing.md},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm},
  statCard: {width: '50%', padding: spacing.sm},
  statLabel: {...typography.caption, color: colors.text.secondary},
  statValue: {...typography.h3, color: colors.text.primary},
});
