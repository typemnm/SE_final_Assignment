import React, {useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Animated, ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useProfile} from '../hooks/useProfile';
import {useAuth} from '@features/auth/hooks/useAuth';
import {Button} from '@components/common/Button';
import {AppHeader} from '@components/common/AppHeader';
import {ThemeBackground} from '@components/common/ThemeBackground';
import {useThemeContext} from '@theme/ThemeContext';
import type {MyPageStackParamList} from '@navigation/types';

type NavProp = NativeStackNavigationProp<MyPageStackParamList>;

const GOAL_LABELS: Record<string, string> = {
  weight_loss: '체중 감량',
  muscle_gain: '근육 증가',
  health_maintenance: '건강 유지',
};

const fadeSlide = (a: Animated.Value) => ({
  opacity: a,
  transform: [{translateY: a.interpolate({inputRange: [0, 1], outputRange: [28, 0]})}],
});

export const ProfileScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {tc} = useThemeContext();
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

  const SA = useRef(Array.from({length: 4}, () => new Animated.Value(0))).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const runAnim = useCallback(() => {
    animRef.current?.stop();
    SA.forEach(a => a.setValue(0));
    animRef.current = Animated.stagger(80, SA.map(a =>
      Animated.spring(a, {toValue: 1, tension: 55, friction: 8, useNativeDriver: true}),
    ));
    animRef.current.start();
  }, [SA]);

  // 탭에 포커스될 때마다 데이터 새로 고침 + 애니메이션
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchSubscription();
      // 애니메이션은 로딩 완료 후에 runAnim()에서 실행됨 (아래 useRef 방식)
      return () => animRef.current?.stop();
    }, [fetchProfile, fetchSubscription]),
  );

  // profile.loading이 true → false 로 바뀌는 시점에 입장 애니메이션 실행
  const prevLoadingRef = useRef<boolean | null>(null);
  if (prevLoadingRef.current !== profile.loading) {
    if (prevLoadingRef.current === true && !profile.loading) {
      // 로딩 완료 직후 — React 렌더 도중 SA 값 직접 세팅 (0으로 초기화)
      SA.forEach(a => a.setValue(0));
    }
    prevLoadingRef.current = profile.loading;
  }

  // 로딩 완료 시 애니메이션 트리거
  const justFinishedLoading = prevLoadingRef.current === false && !profile.loading;
  React.useEffect(() => {
    if (!profile.loading) {
      runAnim();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.loading]);

  void justFinishedLoading; // unused variable suppressor

  const cardBorder = {
    backgroundColor: tc.card,
    borderTopColor: tc.cardBorderTop,
    borderLeftColor: tc.cardBorderSide,
    borderRightColor: tc.cardBorderSide,
    borderBottomColor: tc.cardBorderSide,
  };

  return (
    <ThemeBackground style={s.root}>
      <AppHeader />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* 로딩 중 표시 — 컨텐츠 위에 오버레이 방식 (Animated.View는 항상 마운트 유지) */}
        {profile.loading && (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={tc.emerald} />
            <Text style={[s.loadingText, {color: tc.textSec}]}>프로필 불러오는 중...</Text>
          </View>
        )}

        {/* ── 이메일 + 경고 ──────────────────────────────────── */}
        <Animated.View style={fadeSlide(SA[0])}>
          {profile.email ? (
            <View style={s.emailRow}>
              <Text style={[s.emailText, {color: tc.textSec}]}>{profile.email}</Text>
            </View>
          ) : null}
          {!isProfileComplete && !profile.loading ? (
            <View style={[s.warningBanner, {
              backgroundColor: 'rgba(252, 211, 77, 0.12)',
              borderColor: 'rgba(252, 211, 77, 0.3)',
            }]}>
              <Text style={[s.warningText, {color: tc.gold}]}>
                프로필을 완성하면 AI 식단 분석을 이용할 수 있습니다.
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── 프로필 정보 카드 ────────────────────────────────── */}
        <Animated.View style={[s.card, fadeSlide(SA[1]), cardBorder]}>
          <Text style={[s.cardTitle, {color: tc.textPri}]}>프로필 정보</Text>
          <View style={[s.row, {borderBottomColor: tc.divider}]}>
            <Text style={[s.rowLabel, {color: tc.textSec}]}>나이</Text>
            <Text style={[s.rowValue, {color: tc.textPri}]}>
              {profile.age ? `${profile.age}세` : '미설정'}
            </Text>
          </View>
          <View style={[s.row, {borderBottomColor: tc.divider}]}>
            <Text style={[s.rowLabel, {color: tc.textSec}]}>성별</Text>
            <Text style={[s.rowValue, {color: tc.textPri}]}>
              {profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : '미설정'}
            </Text>
          </View>
          <View style={[s.row, s.rowLast]}>
            <Text style={[s.rowLabel, {color: tc.textSec}]}>목표</Text>
            <Text style={[s.rowValue, {color: tc.textPri}]}>
              {profile.goal ? (GOAL_LABELS[profile.goal] ?? profile.goal) : '미설정'}
            </Text>
          </View>
        </Animated.View>

        {/* ── 구독 정보 카드 ──────────────────────────────────── */}
        <Animated.View style={[s.card, fadeSlide(SA[2]), cardBorder]}>
          <Text style={[s.cardTitle, {color: tc.textPri}]}>구독 정보</Text>
          <View style={[s.row, {borderBottomColor: tc.divider}]}>
            <Text style={[s.rowLabel, {color: tc.textSec}]}>플랜</Text>
            <Text style={[s.rowValue, {
              color: profile.subscriptionType === 'premium' ? tc.gold : tc.textPri,
            }]}>
              {profile.subscriptionType === 'premium' ? '✦ 프리미엄' : '무료'}
            </Text>
          </View>
          <View style={[s.row, s.rowLast]}>
            <Text style={[s.rowLabel, {color: tc.textSec}]}>오늘 AI 분석 잔여</Text>
            <Text style={[s.rowValue, {color: tc.emerald}]}>
              {profile.remaining}/{profile.dailyAiLimit}회
            </Text>
          </View>
        </Animated.View>

        {/* ── 버튼 영역 ────────────────────────────────────────── */}
        <Animated.View style={[s.btnArea, fadeSlide(SA[3])]}>
          <Button title="프로필 수정" onPress={() => navigation.navigate('ProfileEdit')} />
          <View style={s.btnGap} />
          <TouchableOpacity
            style={[s.outlineBtn, {borderColor: tc.emerald}]}
            onPress={() => navigation.navigate('Statistics')}>
            <Text style={[s.outlineBtnText, {color: tc.emerald}]}>내 기록 통계 보기</Text>
          </TouchableOpacity>
          <View style={s.btnGap} />
          <TouchableOpacity
            style={[s.outlineBtn, {borderColor: tc.cardBorderSide}]}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={[s.outlineBtnText, {color: tc.textSec}]}>설정</Text>
          </TouchableOpacity>
          <View style={s.btnGap} />
          <TouchableOpacity
            style={[s.outlineBtn, {borderColor: tc.cardBorderSide}, authLoading && s.btnDisabled]}
            onPress={handleLogout}
            disabled={authLoading}>
            {authLoading ? (
              <ActivityIndicator size="small" color={tc.textSec} />
            ) : (
              <Text style={[s.outlineBtnText, {color: tc.textSec}]}>로그아웃</Text>
            )}
          </TouchableOpacity>
          <View style={s.btnGap} />
          <TouchableOpacity
            style={[s.outlineBtn, {borderColor: 'transparent'}, authLoading && s.btnDisabled]}
            onPress={handleDeleteAccount}
            disabled={authLoading}>
            <Text style={[s.outlineBtnText, {color: '#EF4444'}]}>회원 탈퇴</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </ThemeBackground>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  scroll: {flex: 1},
  content: {paddingBottom: 40},

  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  loadingText: {fontSize: 13},

  emailRow: {paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6},
  emailText: {fontSize: 13},

  warningBanner: {
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 10, borderWidth: 1,
  },
  warningText: {fontSize: 13, lineHeight: 20},

  card: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    padding: 16,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  cardTitle: {fontSize: 15, fontWeight: '700', marginBottom: 12, letterSpacing: 0.2},

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1,
  },
  rowLast: {borderBottomWidth: 0},
  rowLabel: {fontSize: 14},
  rowValue: {fontSize: 14, fontWeight: '500'},

  btnArea: {paddingHorizontal: 16, paddingTop: 4},
  btnGap: {height: 10},
  outlineBtn: {
    padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  outlineBtnText: {fontSize: 15, fontWeight: '600'},
  btnDisabled: {opacity: 0.5},
});
