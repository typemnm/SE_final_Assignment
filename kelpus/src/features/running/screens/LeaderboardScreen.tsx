import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import {useRunning} from '../hooks/useRunning';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';
import {fmtKm, fmtElapsed} from '../utils';
import type {LeaderboardPeriod, LeaderboardCriterion, LeaderboardListEntry} from '../types';

const PERIODS: {key: LeaderboardPeriod; label: string}[] = [
  {key: 'weekly', label: '주간'},
  {key: 'monthly', label: '월간'},
  {key: 'all', label: '전체'},
];

const CRITERIA: {key: LeaderboardCriterion; label: string}[] = [
  {key: 'total_distance', label: '거리'},
  {key: 'count', label: '횟수'},
  {key: 'total_time', label: '시간'},
];

const formatValue = (value: number, criterion: LeaderboardCriterion): string => {
  if (criterion === 'total_distance') return fmtKm(value);
  if (criterion === 'total_time') return fmtElapsed(Math.round(value));
  return `${value}회`;
};

const RankBadge = ({rank}: {rank: number}) => {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <View style={styles.rankBadge}>
      {medal ? (
        <Text style={styles.rankMedal}>{medal}</Text>
      ) : (
        <Text style={styles.rankNumber}>#{rank}</Text>
      )}
    </View>
  );
};

const EntryRow = ({
  item,
  criterion,
  highlighted = false,
}: {
  item: LeaderboardListEntry;
  criterion: LeaderboardCriterion;
  highlighted?: boolean;
}) => (
  <View
    style={[
      styles.entry,
      item.isCurrentUser && styles.myEntry,
      highlighted && !item.isCurrentUser && styles.highlightedEntry,
    ]}>
    <RankBadge rank={item.rank} />
    <View style={styles.entryInfo}>
      <Text style={[styles.entryName, item.isCurrentUser && styles.myEntryName]}>
        {item.userName}
        {item.isCurrentUser ? ' 👤' : ''}
      </Text>
      {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
    </View>
    <Text style={[styles.entryValue, item.isCurrentUser && styles.myEntryValue]}>
      {formatValue(item.value, criterion)}
    </Text>
  </View>
);

export const LeaderboardScreen = () => {
  const {
    leaderboardEntries,
    myRank,
    myValue,
    nearbyEntries,
    nearbyMyRank,
    nearbyTotalUsers,
    loading,
    fetchLeaderboard,
    fetchNearbyLeaderboard,
  } = useRunning();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [criterion, setCriterion] = useState<LeaderboardCriterion>('total_distance');
  const [tab, setTab] = useState<'all' | 'nearby'>('all');

  const reload = useCallback(() => {
    fetchLeaderboard(period, criterion);
    fetchNearbyLeaderboard(period, criterion);
  }, [fetchLeaderboard, fetchNearbyLeaderboard, period, criterion]);

  useEffect(() => {
    reload();
  }, [reload]);

  const Header = (
    <>
      {/* 기간 탭 */}
      <View style={styles.tabGroup}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.tab, period === p.key && styles.activeTab]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.8}>
            <Text style={[styles.tabText, period === p.key && styles.activeTabText]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 기준 토글 */}
      <View style={styles.criterionRow}>
        {CRITERIA.map(c => (
          <TouchableOpacity
            key={c.key}
            style={[styles.criterionBtn, criterion === c.key && styles.criterionActive]}
            onPress={() => setCriterion(c.key)}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.criterionText,
                criterion === c.key && styles.criterionTextActive,
              ]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 내 순위 배너 */}
      {myRank ? (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankLabel}>내 순위</Text>
          <Text style={styles.myRankValue}>
            {myRank}위
            {myValue !== null && myValue !== undefined
              ? ` · ${formatValue(myValue, criterion)}`
              : ''}
          </Text>
          {nearbyTotalUsers > 0 && (
            <Text style={styles.myRankTotal}>전체 {nearbyTotalUsers}명 중</Text>
          )}
        </View>
      ) : null}

      {/* 뷰 전환 탭 */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewTab, tab === 'all' && styles.viewTabActive]}
          onPress={() => setTab('all')}
          activeOpacity={0.8}>
          <Text style={[styles.viewTabText, tab === 'all' && styles.viewTabTextActive]}>
            전체 순위
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, tab === 'nearby' && styles.viewTabActive]}
          onPress={() => setTab('nearby')}
          activeOpacity={0.8}>
          <Text style={[styles.viewTabText, tab === 'nearby' && styles.viewTabTextActive]}>
            주변 순위
          </Text>
        </TouchableOpacity>
      </View>

      {loading && <LoadingSpinner />}

      {tab === 'nearby' && nearbyMyRank && (
        <View style={styles.nearbyInfo}>
          <Text style={styles.nearbyInfoText}>
            내 순위({nearbyMyRank}위) 기준 위아래 3명
          </Text>
        </View>
      )}
    </>
  );

  const displayEntries = tab === 'nearby' ? nearbyEntries : leaderboardEntries;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={displayEntries}
      keyExtractor={item => `${item.userId}-${item.rank}`}
      ListHeaderComponent={Header}
      renderItem={({item}) => (
        <EntryRow
          item={item}
          criterion={criterion}
          highlighted={tab === 'nearby'}
        />
      )}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {tab === 'nearby' && !nearbyMyRank
                ? '리더보드에 참여하려면 먼저 러닝을 기록하세요.'
                : '리더보드 데이터가 없습니다.'}
            </Text>
          </View>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.divider} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: spacing.xl},

  tabGroup: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 10},
  activeTab: {backgroundColor: colors.primary},
  tabText: {...typography.body2, color: colors.text.secondary, fontWeight: '600'},
  activeTabText: {color: colors.text.inverse},

  criterionRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  criterionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  criterionActive: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  criterionText: {...typography.body2, color: colors.text.secondary, fontWeight: '600', fontSize: 13},
  criterionTextActive: {color: colors.primary},

  myRankBanner: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myRankLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  myRankValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  myRankTotal: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },

  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 3,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewTabActive: {backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2},
  viewTabText: {fontSize: 13, fontWeight: '600', color: colors.text.secondary},
  viewTabTextActive: {color: colors.text.primary},

  nearbyInfo: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  nearbyInfoText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  myEntry: {backgroundColor: '#E8F5E9'},
  highlightedEntry: {backgroundColor: '#F9F9F9'},
  rankBadge: {width: 44, alignItems: 'center'},
  rankMedal: {fontSize: 24},
  rankNumber: {
    ...typography.body1,
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  entryInfo: {flex: 1, marginLeft: spacing.sm},
  entryName: {...typography.body1, color: colors.text.primary, fontWeight: '500'},
  myEntryName: {color: colors.primary, fontWeight: '800'},
  badge: {...typography.caption, color: colors.text.secondary, marginTop: 2},
  entryValue: {...typography.body2, color: colors.text.secondary, fontWeight: '600'},
  myEntryValue: {color: colors.primary, fontWeight: '800'},

  divider: {height: 1, backgroundColor: colors.divider, marginLeft: 60},
  emptyWrap: {alignItems: 'center', paddingTop: spacing.xxl},
  emptyText: {...typography.body1, color: colors.text.disabled, textAlign: 'center', paddingHorizontal: spacing.xl},
});
