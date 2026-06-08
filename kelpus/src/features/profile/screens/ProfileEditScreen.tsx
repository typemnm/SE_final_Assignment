import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useProfile} from '../hooks/useProfile';
import {Button} from '@components/common/Button';
import {Input} from '@components/common/Input';
import {colors, typography, spacing} from '@theme/index';

type HealthGoal = 'weight_loss' | 'muscle_gain' | 'health_maintenance';
type Gender = 'male' | 'female';

const GOAL_OPTIONS: {label: string; value: HealthGoal}[] = [
  {label: '체중 감량', value: 'weight_loss'},
  {label: '근육 증가', value: 'muscle_gain'},
  {label: '건강 유지', value: 'health_maintenance'},
];

export const ProfileEditScreen = () => {
  const navigation = useNavigation();
  const {profile, updateProfile, isUpdating} = useProfile();

  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [goal, setGoal] = useState<HealthGoal | null>(profile.goal);

  const handleSave = async () => {
    const ageNum = age ? parseInt(age, 10) : null;
    if (age && (isNaN(ageNum!) || ageNum! < 1 || ageNum! > 150)) {
      Alert.alert('입력 오류', '나이는 1~150 사이의 숫자를 입력해주세요.');
      return;
    }
    await updateProfile({
      age: ageNum,
      gender: gender,
      health_goal: goal,
    });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Input
          label="나이"
          value={age}
          onChangeText={setAge}
          placeholder="나이를 입력하세요"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.optionRow}>
          {(['male', 'female'] as Gender[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.optionBtn, gender === g && styles.optionBtnActive]}
              onPress={() => setGender(g)}>
              <Text style={[styles.optionText, gender === g && styles.optionTextActive]}>
                {g === 'male' ? '남성' : '여성'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>건강 목표</Text>
        <View style={styles.goalColumn}>
          {GOAL_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionBtn, styles.goalBtn, goal === opt.value && styles.optionBtnActive]}
              onPress={() => setGoal(opt.value)}>
              <Text style={[styles.optionText, goal === opt.value && styles.optionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.saveArea}>
        {isUpdating ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button title="저장" onPress={handleSave} disabled={isUpdating} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  section: {marginBottom: spacing.lg},
  label: {...typography.body1, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm},
  optionRow: {flexDirection: 'row', gap: spacing.sm},
  goalColumn: {gap: spacing.sm},
  optionBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  goalBtn: {flex: undefined, width: '100%'},
  optionBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  optionText: {...typography.body2, color: colors.text.secondary},
  optionTextActive: {color: colors.text.inverse, fontWeight: '600'},
  saveArea: {marginTop: spacing.xl, marginBottom: spacing.xxl},
});
