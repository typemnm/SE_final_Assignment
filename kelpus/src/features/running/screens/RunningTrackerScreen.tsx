import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RunningMapView} from '../components/RunningMapView';
import {useRunningTracker} from '../hooks/useRunningTracker';
import {colors, typography, spacing} from '@theme/index';
import {fmtKm, fmtMinPerKm, fmtElapsed} from '../utils';
import type {RunningStackParams} from '../types';

type NavProp = NativeStackNavigationProp<RunningStackParams>;

const StatBox = ({label, value}: {label: string; value: string}) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const RunningTrackerScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {
    tracking,
    currentPosition,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    saveRun,
    discardRun,
  } = useRunningTracker();
  const [saving, setSaving] = useState(false);

  const {status, elapsedSeconds, distanceKm, currentPaceMinPerKm, route} = tracking;
  const routeCoords = route.map(p => ({latitude: p.latitude, longitude: p.longitude}));

  const handleFinish = () => {
    finishTracking();
    // Alert.alert은 웹에서 다중 버튼을 지원하지 않으므로
    // 'finished' 상태에서 인라인 버튼으로 처리
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRun();
      if (Platform.OS !== 'web') {
        Alert.alert('저장 완료', '러닝 기록이 저장되었습니다.');
      }
      navigation.navigate('RunningList');
    } catch {
      if (Platform.OS !== 'web') {
        Alert.alert('오류', '저장에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    discardRun();
    navigation.goBack();
  };

  const handleDiscardConfirm = () => {
    if (Platform.OS === 'web') {
      // 웹에서는 globalThis.confirm 사용
      // eslint-disable-next-line no-alert
      if ((globalThis as any).confirm?.('현재 러닝을 종료하시겠습니까?') !== false) {
        handleDiscard();
      }
    } else {
      Alert.alert('러닝 종료', '현재 러닝을 종료하시겠습니까?', [
        {text: '계속', style: 'cancel'},
        {text: '종료', style: 'destructive', onPress: handleDiscard},
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <RunningMapView
        route={routeCoords}
        currentPosition={currentPosition}
        isLive
        height={300}
      />

      <View style={styles.statsPanel}>
        <View style={styles.statsRow}>
          <StatBox label="거리" value={fmtKm(distanceKm)} />
          <View style={styles.elapsedWrap}>
            <Text style={styles.elapsedTime}>{fmtElapsed(elapsedSeconds)}</Text>
            <Text style={styles.elapsedLabel}>경과 시간</Text>
          </View>
          <StatBox label="페이스" value={fmtMinPerKm(currentPaceMinPerKm)} />
        </View>

        {/* 상태별 컨트롤 */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <TouchableOpacity style={styles.btnStart} onPress={startTracking} activeOpacity={0.85}>
              <Text style={styles.btnStartText}>🏃 시작</Text>
            </TouchableOpacity>
          )}

          {status === 'tracking' && (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnSecondary} onPress={pauseTracking} activeOpacity={0.85}>
                <Text style={styles.btnSecondaryText}>⏸ 일시정지</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnStop} onPress={handleFinish} activeOpacity={0.85}>
                <Text style={styles.btnStopText}>⏹ 완료</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'paused' && (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnStart} onPress={resumeTracking} activeOpacity={0.85}>
                <Text style={styles.btnStartText}>▶ 재개</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnStop} onPress={handleFinish} activeOpacity={0.85}>
                <Text style={styles.btnStopText}>⏹ 완료</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 완료 후 저장/버리기 인라인 UI */}
          {status === 'finished' && (
            <View style={styles.finishedPanel}>
              <Text style={styles.finishedTitle}>러닝 완료!</Text>
              <View style={styles.finishedStats}>
                <View style={styles.finishedStat}>
                  <Text style={styles.finishedStatValue}>{fmtKm(distanceKm)}</Text>
                  <Text style={styles.finishedStatLabel}>거리</Text>
                </View>
                <View style={styles.finishedStat}>
                  <Text style={styles.finishedStatValue}>{fmtElapsed(elapsedSeconds)}</Text>
                  <Text style={styles.finishedStatLabel}>시간</Text>
                </View>
                <View style={styles.finishedStat}>
                  <Text style={styles.finishedStatValue}>{fmtMinPerKm(currentPaceMinPerKm)}</Text>
                  <Text style={styles.finishedStatLabel}>페이스</Text>
                </View>
              </View>
              {saving ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
              ) : (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.btnDiscard}
                    onPress={handleDiscard}
                    activeOpacity={0.85}>
                    <Text style={styles.btnDiscardText}>버리기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSave}
                    onPress={handleSave}
                    activeOpacity={0.85}>
                    <Text style={styles.btnSaveText}>💾 저장하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 진행 중 포기 버튼 */}
        {(status === 'tracking' || status === 'paused') && (
          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscardConfirm}>
            <Text style={styles.discardText}>러닝 포기</Text>
          </TouchableOpacity>
        )}
      </View>

      {status === 'idle' && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            시작 버튼을 누르면 GPS로 경로가 자동 추적됩니다.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  statsPanel: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    margin: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statBox: {alignItems: 'center', flex: 1},
  statValue: {...typography.h3, color: colors.text.primary, fontWeight: '700'},
  statLabel: {...typography.caption, color: colors.text.secondary, marginTop: 2},
  elapsedWrap: {alignItems: 'center', flex: 1.5},
  elapsedTime: {fontSize: 36, fontWeight: '700', color: colors.primary},
  elapsedLabel: {...typography.caption, color: colors.text.secondary, marginTop: 2},

  controls: {alignItems: 'center'},
  btnRow: {flexDirection: 'row', gap: spacing.sm, width: '100%'},

  btnStart: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 50,
    minWidth: 160,
    alignItems: 'center',
  },
  btnStartText: {...typography.button, color: colors.text.inverse, fontSize: 18},

  btnSecondary: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    flex: 1,
  },
  btnSecondaryText: {...typography.button, color: colors.primary},

  btnStop: {
    backgroundColor: '#F44336',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 50,
    alignItems: 'center',
    flex: 1,
  },
  btnStopText: {...typography.button, color: '#fff'},

  // 완료 후 인라인 패널
  finishedPanel: {width: '100%', alignItems: 'center'},
  finishedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  finishedStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  finishedStat: {alignItems: 'center'},
  finishedStatValue: {fontSize: 18, fontWeight: '700', color: colors.text.primary},
  finishedStatLabel: {...typography.caption, color: colors.text.secondary, marginTop: 2},
  spinner: {marginVertical: spacing.md},

  btnSave: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnSaveText: {...typography.button, color: '#fff', fontWeight: '700'},

  btnDiscard: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#9E9E9E',
    alignItems: 'center',
  },
  btnDiscardText: {...typography.button, color: colors.text.secondary},

  discardBtn: {alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs},
  discardText: {...typography.caption, color: colors.text.disabled},

  hint: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  hintText: {...typography.body2, color: colors.text.disabled, textAlign: 'center'},
});
