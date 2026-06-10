import React, {useState} from 'react';
import {View, Text, FlatList, StyleSheet, TextInput, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDiet} from '../hooks/useDiet';
import {Button} from '@components/common/Button';
import {colors, typography, spacing} from '@theme/index';
import {NutritionChart} from '../components/NutritionChart';
import type {DietNavigationProp} from '@navigation/types';

export const DietScreen = () => {
  const navigation = useNavigation<DietNavigationProp>();
  const {
    records,
    currentAnalysis,
    analyzing,
    error,
    cameraBusy,
    cameraError,
    clearCameraError,
    requestAnalysis,
    analyzeCapturedImage,
  } = useDiet();
  const [dietImageUrl, setDietImageUrl] = useState('');

  const trimmedUrl = dietImageUrl.trim();
  const isBusy = analyzing || cameraBusy;
  const canAnalyze = trimmedUrl.length > 0 && !isBusy;
  const displayError = cameraError ?? error;

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      return;
    }
    clearCameraError();
    const result = await requestAnalysis(trimmedUrl).catch(() => null);

    if (result) {
      navigation.navigate('DietAnalysis');
    }
  };

  const handleAnalyzeWithCamera = async () => {
    if (isBusy) {
      return;
    }

    const result = await analyzeCapturedImage();

    if (result) {
      navigation.navigate('DietAnalysis');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>식단 분석</Text>
      <View style={styles.formCard}>
        <Text style={styles.label}>식단 이미지 URL</Text>
        <TextInput
          value={dietImageUrl}
          onChangeText={setDietImageUrl}
          placeholder="https://example.com/meal.jpg 또는 /static/diet_uploads/..."
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Button
          title="AI 분석 요청"
          onPress={handleAnalyze}
          loading={analyzing}
          disabled={!canAnalyze}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="카메라로 촬영"
          onPress={handleAnalyzeWithCamera}
          variant="outline"
          loading={cameraBusy}
          disabled={isBusy}
        />
        {cameraBusy && <Text style={styles.progress}>사진 업로드 후 AI 분석을 요청하는 중입니다.</Text>}
        <Text style={styles.helper}>
          이미지 업로드 API로 받은 URL이나 외부 이미지 URL을 입력하세요.
        </Text>
      </View>

      {displayError && <Text style={styles.error}>{displayError}</Text>}

      {currentAnalysis && (
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>최근 AI 식단 분석 결과</Text>
          <Text style={styles.calorie}>{Math.round(currentAnalysis.total_calories)} kcal</Text>
          <NutritionChart
            title="탄단지 비율"
            protein={currentAnalysis.protein_ratio}
            carbs={currentAnalysis.carb_ratio}
            fat={currentAnalysis.fat_ratio}
            unit="%"
          />
          {currentAnalysis.ai_comment && (
            <Text style={styles.comment}>{currentAnalysis.ai_comment}</Text>
          )}
          <Text style={styles.timestamp}>분석 시각: {currentAnalysis.analyzed_at}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>동기화된 식단 기록</Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>동기화된 식단 기록이 없습니다.</Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({item}) => (
            <View style={styles.item}>
              <Text style={styles.mealType}>{item.mealType}</Text>
              <Text style={styles.calories}>{item.totalCalories} kcal</Text>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.md},
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: {...typography.body2, color: colors.text.primary, marginBottom: spacing.xs},
  input: {
    ...typography.body1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  helper: {...typography.caption, color: colors.text.secondary, marginTop: spacing.xs},
  buttonSpacer: {height: spacing.sm},
  progress: {...typography.caption, color: colors.text.secondary, marginTop: spacing.sm},
  error: {...typography.body2, color: colors.error, marginBottom: spacing.md},
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {...typography.h3, color: colors.text.primary, marginBottom: spacing.md},
  calorie: {...typography.h1, color: colors.primary, marginBottom: spacing.md},
  comment: {...typography.body1, color: colors.text.primary, marginBottom: spacing.sm},
  timestamp: {...typography.caption, color: colors.text.secondary},
  empty: {
    ...typography.body1,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  mealType: {...typography.body1, color: colors.text.primary},
  calories: {...typography.body2, color: colors.text.secondary},
});
