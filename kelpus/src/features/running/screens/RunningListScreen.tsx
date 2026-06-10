import React, {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useRunning} from '../hooks/useRunning';
import {useHealthSync} from '../hooks/useHealthSync';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';
import {fmtKm, fmtMinPerKm, fmtElapsed} from '../utils';
import type {RunningStackParams} from '../types';

type NavProp = NativeStackNavigationProp<RunningStackParams>;

const QuickAction = ({
  label,
  emoji,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    style={[
      styles.quickAction,
      primary && styles.quickActionPrimary,
      disabled && styles.quickActionDisabled,
    ]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={disabled}>
    <Text style={styles.quickActionEmoji}>{emoji}</Text>
    <Text style={[styles.quickActionLabel, primary && styles.quickActionLabelPrimary]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SyncBadge = ({status, lastSync}: {status: string; lastSync: string | null}) => {
  if (status === 'idle' && !lastSync) return null;
  const map: Record<string, {color: string; label: string}> = {
    syncing: {color: '#FF9800', label: '동기화 중...'},
    done: {color: '#4CAF50', label: '동기화 완료'},
    error: {color: '#F44336', label: '동기화 실패'},
  };
  const s = map[status] ?? {color: '#9E9E9E', label: ''};
  const t = lastSync
    ? new Date(lastSync).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})
    : '';
  return (
    <View style={styles.syncBadge}>
      <View style={[styles.syncDot, {backgroundColor: s.color}]} />
      <Text style={styles.syncText}>{s.label}{t && status === 'done' ? ` · ${t}` : ''}</Text>
    </View>
  );
};

const confirmDelete = (onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if ((globalThis as any).confirm?.('이 러닝 기록을 삭제하시겠습니까?')) {
      onConfirm();
    }
  } else {
    Alert.alert('삭제', '이 러닝 기록을 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {text: '삭제', style: 'destructive', onPress: onConfirm},
    ]);
  }
};

export const RunningListScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {
    records,
    loading,
    syncStatus,
    lastSyncTime,
    fetchRecords,
    selectRunning,
    deleteRunning,
    addSampleRun,
  } = useRunning();
  const {syncFromHealth} = useHealthSync();
  const [syncing, setSyncing] = useState(false);
  const [addingSample, setAddingSample] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords]),
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncFromHealth(30);
      if (Platform.OS !== 'web') {
        Alert.alert(
          '동기화 완료',
          `새로운 기록: ${result.synced}개\n이미 동기화됨: ${result.skipped}개`,
        );
      }
    } finally {
      setSyncing(false);
    }
  }, [syncFromHealth]);

  const handleAddSample = useCallback(async () => {
    setAddingSample(true);
    try {
      await addSampleRun();
    } finally {
      setAddingSample(false);
    }
  }, [addSampleRun]);

  const handleDelete = useCallback(
    (id: string) => {
      confirmDelete(async () => {
        try {
          await deleteRunning(id);
        } catch {
          if (Platform.OS !== 'web') {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        }
      });
    },
    [deleteRunning],
  );

  if (loading && records.length === 0) return <LoadingSpinner fullScreen />;

  const platformLabel = Platform.OS === 'ios' ? 'Apple Health' : '삼성 헬스';

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={records}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionsRow}>
            <QuickAction
              emoji="🏃"
              label="러닝 시작"
              onPress={() => navigation.navigate('RunningTracker')}
              primary
            />
            <QuickAction
              emoji="🏆"
              label="리더보드"
              onPress={() => navigation.navigate('Leaderboard')}
            />
            <QuickAction
              emoji="🗺️"
              label="코스 추천"
              onPress={() => navigation.navigate('RunningCourses')}
            />
            <QuickAction
              emoji="🔄"
              label={platformLabel}
              onPress={handleSync}
              disabled={syncing || syncStatus === 'syncing'}
            />
            <QuickAction
              emoji="🧪"
              label="샘플 추가"
              onPress={handleAddSample}
              disabled={addingSample}
            />
          </ScrollView>

          <SyncBadge
            status={syncing ? 'syncing' : syncStatus}
            lastSync={lastSyncTime}
          />

          <Text style={styles.sectionTitle}>러닝 기록</Text>
        </>
      }
      renderItem={({item}) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => {
            selectRunning(item);
            navigation.navigate('RunningDetail', {recordId: item.id});
          }}>
          {/* 날짜 + 삭제 버튼 */}
          <View style={styles.cardTop}>
            <Text style={styles.cardDate}>
              {new Date(item.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 통계 */}
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fmtKm(item.distance)}</Text>
              <Text style={styles.statLabel}>거리</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fmtElapsed(item.duration)}</Text>
              <Text style={styles.statLabel}>시간</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fmtMinPerKm(item.avgPace)}</Text>
              <Text style={styles.statLabel}>페이스</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.calories}</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>
          </View>

          {/* 미니 경로 표시 (경로 있을 때) */}
          {item.route && item.route.length > 1 && (
            <View style={styles.routeIndicator}>
              <Text style={styles.routeIndicatorText}>
                📍 {item.route.length}개 GPS 포인트
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🏃‍♂️</Text>
            <Text style={styles.emptyText}>아직 러닝 기록이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              🧪 샘플 추가로 테스트해보거나{'\n'}러닝을 시작해보세요!
            </Text>
            <TouchableOpacity
              style={styles.emptySampleBtn}
              onPress={handleAddSample}
              disabled={addingSample}
              activeOpacity={0.8}>
              <Text style={styles.emptySampleBtnText}>
                {addingSample ? '추가 중...' : '샘플 기록 추가하기'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: spacing.xl},

  actionsRow: {paddingHorizontal: spacing.md, paddingVertical: spacing.md},
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
  },
  quickActionPrimary: {backgroundColor: colors.primary, borderColor: colors.primary},
  quickActionDisabled: {opacity: 0.45},
  quickActionEmoji: {fontSize: 22, marginBottom: 4},
  quickActionLabel: {...typography.caption, color: colors.text.secondary, fontWeight: '600', fontSize: 11},
  quickActionLabelPrimary: {color: colors.text.inverse},

  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  syncDot: {width: 7, height: 7, borderRadius: 4, marginRight: 6},
  syncText: {fontSize: 12, color: colors.text.secondary},

  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardDate: {...typography.body2, color: colors.text.secondary},
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(244,67,54,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {fontSize: 12, color: '#F44336', fontWeight: '700'},

  cardStats: {flexDirection: 'row', alignItems: 'center'},
  statItem: {flex: 1, alignItems: 'center'},
  statValue: {...typography.body1, color: colors.text.primary, fontWeight: '600'},
  statLabel: {...typography.caption, color: colors.text.secondary, marginTop: 2},
  statDivider: {width: 1, height: 30, backgroundColor: colors.divider},

  routeIndicator: {marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.divider},
  routeIndicatorText: {fontSize: 11, color: colors.text.disabled},

  emptyWrap: {alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl},
  emptyEmoji: {fontSize: 52, marginBottom: spacing.md},
  emptyText: {...typography.body1, color: colors.text.secondary, fontWeight: '600'},
  emptySubText: {
    ...typography.body2,
    color: colors.text.disabled,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySampleBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  emptySampleBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
});
