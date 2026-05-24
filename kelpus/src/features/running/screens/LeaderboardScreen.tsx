import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {useRunning} from '../hooks/useRunning';
import {colors, typography, spacing} from '@theme/index';
import type {LeaderboardPeriod} from '@appTypes/running.types';
import {formatDistance} from '@utils/format';

export const LeaderboardScreen = () => {
  const {leaderboardEntries, fetchLeaderboard} = useRunning();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');

  useEffect(() => { fetchLeaderboard(period, 'total_distance'); }, [period]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>리더보드</Text>
      <View style={styles.tabs}>
        {(['weekly', 'monthly', 'all'] as LeaderboardPeriod[]).map(p => (
          <TouchableOpacity key={p} style={[styles.tab, period === p && styles.activeTab]} onPress={() => setPeriod(p)}>
            <Text style={[styles.tabText, period === p && styles.activeTabText]}>
              {p === 'weekly' ? '주간' : p === 'monthly' ? '월간' : '전체'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={leaderboardEntries}
        keyExtractor={item => item.userId}
        renderItem={({item}) => (
          <View style={[styles.entry, item.isCurrentUser && styles.myEntry]}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Text style={styles.name}>{item.userName}</Text>
            <Text style={styles.value}>{formatDistance(item.value)}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.md},
  tabs: {flexDirection: 'row', marginBottom: spacing.md},
  tab: {flex: 1, padding: spacing.sm, alignItems: 'center', borderRadius: 8},
  activeTab: {backgroundColor: colors.primary},
  tabText: {...typography.body2, color: colors.text.secondary},
  activeTabText: {color: colors.text.inverse},
  entry: {flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderRadius: 8, marginBottom: spacing.sm},
  myEntry: {borderWidth: 2, borderColor: colors.primary},
  rank: {...typography.h3, color: colors.primary, width: 40},
  name: {...typography.body1, color: colors.text.primary, flex: 1},
  value: {...typography.body2, color: colors.text.secondary},
});
