import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useProfile} from '../hooks/useProfile';
import {Button} from '@components/common/Button';
import {colors, typography, spacing} from '@theme/index';

export const ProfileScreen = () => {
  const {profile, isProfileComplete} = useProfile();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>마이페이지</Text>
      {!isProfileComplete && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>프로필을 완성하면 AI 식단 분석을 이용할 수 있습니다.</Text>
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.label}>나이</Text>
        <Text style={styles.value}>{profile.age ? `${profile.age}세` : '미설정'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>성별</Text>
        <Text style={styles.value}>{profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : '미설정'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>목표</Text>
        <Text style={styles.value}>{profile.goal ?? '미설정'}</Text>
      </View>
      <Button title="프로필 수정" onPress={() => {}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.lg},
  warning: {backgroundColor: '#FFF3CD', padding: spacing.md, borderRadius: 8, marginBottom: spacing.md},
  warningText: {...typography.body2, color: '#856404'},
  section: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider},
  label: {...typography.body2, color: colors.text.secondary},
  value: {...typography.body1, color: colors.text.primary},
});
