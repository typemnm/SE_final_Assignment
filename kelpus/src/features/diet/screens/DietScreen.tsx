import React from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {useDiet} from '../hooks/useDiet';
import {Button} from '@components/common/Button';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';

export const DietScreen = () => {
  const {records, analyzing, requestAnalysis} = useDiet();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>식단 분석</Text>
      <Button title="AI 분석 요청" onPress={() => requestAnalysis('profile_id', new Date().toISOString().split('T')[0])} loading={analyzing} />
      {records.length === 0 ? (
        <Text style={styles.empty}>동기화된 식단 기록이 없습니다.</Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <View style={styles.item}>
              <Text style={styles.mealType}>{item.mealType}</Text>
              <Text style={styles.calories}>{item.totalCalories} kcal</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.md},
  empty: {...typography.body1, color: colors.text.disabled, textAlign: 'center', marginTop: spacing.xl},
  item: {flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderRadius: 8, marginBottom: spacing.sm},
  mealType: {...typography.body1, color: colors.text.primary},
  calories: {...typography.body2, color: colors.text.secondary},
});
