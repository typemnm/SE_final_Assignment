import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useProfile} from '../hooks/useProfile';
import {useAuth} from '@features/auth/hooks/useAuth';
import {Button} from '@components/common/Button';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';
import type {MyPageStackParamList} from '@navigation/types';

type NavProp = NativeStackNavigationProp<MyPageStackParamList>;

const GOAL_LABELS: Record<string, string> = {
  weight_loss: '체중 감량',
  muscle_gain: '근육 증가',
  health_maintenance: '건강 유지',
};

export const ProfileScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {profile, fetchProfile, fetchSubscription, isProfileComplete} = useProfile();
  const {logout, deleteAccount, loading: authLoading} = useAuth();

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {text: '로그아웃', onPress: () => logout()},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('회원 탈퇴', '정말 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.', [
      {text: '취소', style: 'cancel'},
      {
        text: '탈퇴하기',
        style: 'destructive',
        onPress: () =>
          Alert.alert('최종 확인', '탈퇴를 진행합니다. 계속하시겠습니까?', [
            {text: '취소', style: 'cancel'},
            {text: '확인', style: 'destructive', onPress: () => deleteAccount()},
          ]),
      },
    ]);
  };

  useEffect(() => {
    fetchProfile();
    fetchSubscription();
  }, [fetchProfile, fetchSubscription]);

  if (profile.loading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {profile.email && (
        <View style={styles.emailRow}>
          <Text style={styles.emailText}>{profile.email}</Text>
        </View>
      )}

      {!isProfileComplete && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            프로필을 완성하면 AI 식단 분석을 이용할 수 있습니다.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>프로필 정보</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>나이</Text>
          <Text style={styles.rowValue}>{profile.age ? `${profile.age}세` : '미설정'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>성별</Text>
          <Text style={styles.rowValue}>
            {profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : '미설정'}
          </Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.rowLabel}>목표</Text>
          <Text style={styles.rowValue}>
            {profile.goal ? (GOAL_LABELS[profile.goal] ?? profile.goal) : '미설정'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>구독 정보</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>플랜</Text>
          <Text style={styles.rowValue}>
            {profile.subscriptionType === 'premium' ? '프리미엄' : '무료'}
          </Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.rowLabel}>오늘 AI 분석 잔여</Text>
          <Text style={styles.rowValue}>
            {profile.remaining}/{profile.dailyAiLimit}회
          </Text>
        </View>
      </View>

      <View style={styles.btnArea}>
        <Button title="프로필 수정" onPress={() => navigation.navigate('ProfileEdit')} />
        <View style={styles.btnGap} />
        <TouchableOpacity
          style={styles.statsBtn}
          onPress={() => navigation.navigate('Statistics')}>
          <Text style={styles.statsBtnText}>내 기록 통계 보기</Text>
        </TouchableOpacity>
        <View style={styles.btnGap} />
        <TouchableOpacity
          style={[styles.logoutBtn, authLoading && styles.btnDisabled]}
          onPress={handleLogout}
          disabled={authLoading}>
          {authLoading ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <Text style={styles.logoutBtnText}>로그아웃</Text>
          )}
        </TouchableOpacity>
        <View style={styles.btnGap} />
        <TouchableOpacity
          style={[styles.deleteBtn, authLoading && styles.btnDisabled]}
          onPress={handleDeleteAccount}
          disabled={authLoading}>
          <Text style={styles.deleteBtnText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emailRow: {padding: spacing.md, paddingBottom: 0},
  emailText: {...typography.body2, color: colors.text.secondary},
  warningBanner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  warningText: {...typography.body2, color: '#856404'},
  card: {
    margin: spacing.md,
    marginTop: 0,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLast: {borderBottomWidth: 0},
  rowLabel: {...typography.body2, color: colors.text.secondary},
  rowValue: {...typography.body2, color: colors.text.primary, fontWeight: '500'},
  btnArea: {padding: spacing.md, paddingBottom: spacing.xl},
  btnGap: {height: spacing.sm},
  statsBtn: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  statsBtnText: {...typography.body1, color: colors.primary, fontWeight: '600'},
  logoutBtn: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  logoutBtnText: {...typography.body1, color: colors.text.secondary, fontWeight: '500'},
  deleteBtn: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteBtnText: {...typography.body2, color: colors.error},
  btnDisabled: {opacity: 0.5},
});
