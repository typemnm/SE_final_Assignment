import React, {useEffect} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {useRunning} from '../hooks/useRunning';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';
import {formatDistance, formatDuration, formatDate} from '@utils/format';

export const RunningScreen = () => {
  const {records, loading, fetchRecords} = useRunning();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>러닝 기록</Text>
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>{formatDistance(item.distance)}</Text>
              <Text style={styles.stat}>{formatDuration(item.duration)}</Text>
              <Text style={styles.stat}>{item.calories} kcal</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>러닝 기록이 없습니다.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.md},
  item: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  date: {...typography.body2, color: colors.text.secondary, marginBottom: spacing.xs},
  stats: {flexDirection: 'row', justifyContent: 'space-between'},
  stat: {...typography.body1, color: colors.text.primary},
  empty: {
    ...typography.body1,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
