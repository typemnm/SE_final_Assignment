import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useRunning} from '../hooks/useRunning';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {ThemeBackground} from '@components/common/ThemeBackground';
import {useThemeContext} from '@theme/ThemeContext';
import {fmtKm, fmtElapsed} from '../utils';
import type {LeaderboardPeriod, LeaderboardCriterion, LeaderboardListEntry} from '../types';

const PERIODS: {key: LeaderboardPeriod; label: string}[] = [
  {key: 'weekly',  label: '주간'},
  {key: 'monthly', label: '월간'},
  {key: 'all',     label: '전체'},
];

const CRITERIA: {key: LeaderboardCriterion; label: string}[] = [
  {key: 'total_distance', label: '거리'},
  {key: 'count',          label: '횟수'},
  {key: 'total_time',     label: '시간'},
];

const formatValue = (value: number, criterion: LeaderboardCriterion): string => {
  if (criterion === 'total_distance') return fmtKm(value);
  if (criterion === 'total_time')     return fmtElapsed(Math.round(value));
  return `${value}회`;
};

// ── Podium (시상대) ──────────────────────────────────────────────────────────
const MEDAL_COLORS = {
  1: {stand: '#C9A227', light: 'rgba(255,215,0,0.18)', label: '#7A5900'},
  2: {stand: '#8FA3AE', light: 'rgba(180,192,200,0.18)', label: '#3A4E56'},
  3: {stand: '#A0705A', light: 'rgba(185,120,60,0.18)',  label: '#5C3320'},
} as const;
const STAND_H = {1: 80, 2: 56, 3: 40} as const;
const MEDALS  = {1: '🥇', 2: '🥈', 3: '🥉'} as const;

interface PodiumSlotProps {
  rank: 1 | 2 | 3;
  entry: LeaderboardListEntry | undefined;
  criterion: LeaderboardCriterion;
  isMe: boolean;
}

const PodiumSlot = ({rank, entry, criterion, isMe}: PodiumSlotProps) => {
  const mc  = MEDAL_COLORS[rank];
  const h   = STAND_H[rank];
  return (
    <View style={pd.slotCol}>
      {/* Crown for 1st */}
      {rank === 1 && <Text style={pd.crown}>👑</Text>}

      {/* Avatar circle */}
      <View style={[pd.avatar, {backgroundColor: mc.light, borderColor: mc.stand}, isMe && pd.avatarMe]}>
        <Text style={pd.avatarEmoji}>{entry ? (isMe ? '👤' : '🏃') : '—'}</Text>
      </View>

      {/* Name */}
      <Text style={[pd.name, {color: isMe ? mc.stand : '#fff'}, rank === 1 && pd.nameBig]}
        numberOfLines={1}>
        {entry?.userName ?? '-'}
      </Text>

      {/* Value */}
      <Text style={[pd.value, {color: 'rgba(255,255,255,0.75)'}]}>
        {entry ? formatValue(entry.value, criterion) : ''}
      </Text>

      {/* Medal emoji above stand */}
      <Text style={pd.medal}>{MEDALS[rank]}</Text>

      {/* Stand block */}
      <View style={[pd.stand, {height: h, backgroundColor: mc.stand}]}>
        <Text style={[pd.standNum, {color: mc.label}]}>{rank}</Text>
      </View>
    </View>
  );
};

const Podium = ({entries, criterion}: {entries: LeaderboardListEntry[]; criterion: LeaderboardCriterion}) => {
  const top3 = [1, 2, 3].map(r => entries.find(e => e.rank === r));
  const order: (1|2|3)[] = [2, 1, 3]; // visual order: 2nd left, 1st center, 3rd right
  return (
    <View style={pd.container}>
      {order.map(rank => (
        <PodiumSlot
          key={rank}
          rank={rank}
          entry={top3[rank - 1]}
          criterion={criterion}
          isMe={!!top3[rank - 1]?.isCurrentUser}
        />
      ))}
    </View>
  );
};

const pd = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginHorizontal: 16, marginBottom: 6, paddingTop: 16,
    height: 220,
  },
  slotCol: {flex: 1, alignItems: 'center'},
  crown: {fontSize: 20, marginBottom: 2},
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 4,
  },
  avatarMe: {borderWidth: 2.5},
  avatarEmoji: {fontSize: 20},
  name: {fontSize: 12, fontWeight: '700', marginBottom: 2, textAlign: 'center', paddingHorizontal: 2},
  nameBig: {fontSize: 13},
  value: {fontSize: 10, marginBottom: 4, fontWeight: '600'},
  medal: {fontSize: 22, marginBottom: 4},
  stand: {
    width: '80%', borderTopLeftRadius: 6, borderTopRightRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  standNum: {fontSize: 18, fontWeight: '800'},
});

// ── Rank row (table) ─────────────────────────────────────────────────────────
const RankRow = ({item, criterion, tc}: {
  item: LeaderboardListEntry;
  criterion: LeaderboardCriterion;
  tc: ReturnType<typeof useThemeContext>['tc'];
}) => {
  const isTop3 = item.rank <= 3;
  const medal  = isTop3 ? (['🥇','🥈','🥉'][item.rank - 1]) : null;
  return (
    <View style={[
      rr.row,
      {backgroundColor: item.isCurrentUser ? `${tc.emerald}18` : tc.card,
       borderLeftColor: item.isCurrentUser ? tc.emerald : 'transparent'},
    ]}>
      <View style={rr.rankCell}>
        {medal
          ? <Text style={rr.medal}>{medal}</Text>
          : <Text style={[rr.rankNum, {color: tc.textSec}]}>#{item.rank}</Text>}
      </View>
      <View style={rr.info}>
        <Text style={[rr.name, {color: item.isCurrentUser ? tc.emerald : tc.textPri},
          item.isCurrentUser && {fontWeight: '800'}]}>
          {item.userName}{item.isCurrentUser ? ' 👤' : ''}
        </Text>
        {item.badge ? <Text style={[rr.badge, {color: tc.textDis}]}>{item.badge}</Text> : null}
      </View>
      <Text style={[rr.val, {color: item.isCurrentUser ? tc.emerald : tc.textPri},
        item.isCurrentUser && {fontWeight: '800'}]}>
        {formatValue(item.value, criterion)}
      </Text>
    </View>
  );
};

const rr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    borderLeftWidth: 3,
  },
  rankCell: {width: 44, alignItems: 'center'},
  medal: {fontSize: 22},
  rankNum: {fontSize: 15, fontWeight: '700'},
  info: {flex: 1, marginLeft: 6},
  name: {fontSize: 14},
  badge: {fontSize: 11, marginTop: 2},
  val: {fontSize: 14, fontWeight: '600'},
});

// ── Main screen ───────────────────────────────────────────────────────────────
export const LeaderboardScreen = () => {
  const {tc, isDark} = useThemeContext();
  const {
    leaderboardEntries, myRank, myValue,
    nearbyEntries, nearbyMyRank, nearbyTotalUsers,
    loading,
    fetchLeaderboard, fetchNearbyLeaderboard,
  } = useRunning();

  const [period,    setPeriod]    = useState<LeaderboardPeriod>('weekly');
  const [criterion, setCriterion] = useState<LeaderboardCriterion>('total_distance');
  const [tab,       setTab]       = useState<'all' | 'nearby'>('all');

  const reload = useCallback(() => {
    fetchLeaderboard(period, criterion);
    fetchNearbyLeaderboard(period, criterion);
  }, [fetchLeaderboard, fetchNearbyLeaderboard, period, criterion]);

  useEffect(() => { reload(); }, [reload]);

  const segBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const activeSegBg = isDark ? 'rgba(52,211,153,0.18)' : tc.emerald;

  // Podium background — always dark so medals pop
  const podiumBg = isDark
    ? 'rgba(8,22,14,0.95)'
    : 'rgba(28, 53, 40, 0.90)';

  const displayEntries = tab === 'nearby' ? nearbyEntries : leaderboardEntries;
  const showPodium     = tab === 'all' && leaderboardEntries.length > 0;

  const Header = (
    <>
      {/* ── Period + Criterion ────────────────────────────────── */}
      <View style={[s.filterCard, {backgroundColor: tc.card, borderColor: tc.cardBorderSide}]}>
        {/* Period segments */}
        <View style={[s.segment, {backgroundColor: segBg}]}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.segBtn, period === p.key && {backgroundColor: activeSegBg}]}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.8}>
              <Text style={[s.segText, {color: period === p.key ? '#fff' : tc.textSec}]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Criterion pills */}
        <View style={s.pills}>
          {CRITERIA.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.pill,
                {borderColor: criterion === c.key ? tc.emerald : tc.cardBorderSide},
                criterion === c.key && {backgroundColor: `${tc.emerald}1A`},
              ]}
              onPress={() => setCriterion(c.key)}
              activeOpacity={0.8}>
              <Text style={[s.pillText, {color: criterion === c.key ? tc.emerald : tc.textSec}]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Podium ───────────────────────────────────────────── */}
      {showPodium && (
        <View style={[s.podiumWrap, {backgroundColor: podiumBg}]}>
          <Podium entries={leaderboardEntries} criterion={criterion} />
        </View>
      )}

      {/* ── My rank banner ────────────────────────────────────── */}
      {myRank ? (
        <View style={[s.myBanner, {backgroundColor: `${tc.emerald}1C`, borderColor: `${tc.emerald}40`}]}>
          <View>
            <Text style={[s.myBannerLabel, {color: tc.textSec}]}>내 순위</Text>
            <Text style={[s.myBannerValue, {color: tc.emerald}]}>
              {myRank}위
              {myValue != null ? `  ·  ${formatValue(myValue, criterion)}` : ''}
            </Text>
          </View>
          {nearbyTotalUsers > 0 && (
            <Text style={[s.myBannerTotal, {color: tc.textDis}]}>
              전체 {nearbyTotalUsers}명 중
            </Text>
          )}
        </View>
      ) : null}

      {/* ── All / Nearby toggle ───────────────────────────────── */}
      <View style={[s.segment, s.segMt, {backgroundColor: segBg}]}>
        {(['all', 'nearby'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.segBtn, tab === t && {backgroundColor: activeSegBg}]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}>
            <Text style={[s.segText, {color: tab === t ? '#fff' : tc.textSec}]}>
              {t === 'all' ? '전체 순위' : '주변 순위'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <LoadingSpinner />}

      {tab === 'nearby' && nearbyMyRank ? (
        <Text style={[s.nearbyNote, {color: tc.textDis}]}>
          내 순위({nearbyMyRank}위) 기준 위아래 3명
        </Text>
      ) : null}

      {/* Table header row */}
      {displayEntries.length > 0 && (
        <View style={[s.tableHeader, {borderBottomColor: tc.divider}]}>
          <Text style={[s.thRank, {color: tc.textDis}]}>순위</Text>
          <Text style={[s.thName, {color: tc.textDis}]}>이름</Text>
          <Text style={[s.thVal, {color: tc.textDis}]}>기록</Text>
        </View>
      )}
    </>
  );

  return (
    <ThemeBackground style={s.root}>
      <FlatList
        contentContainerStyle={[s.content, {paddingBottom: 40}]}
        data={displayEntries}
        keyExtractor={item => `${item.userId}-${item.rank}`}
        ListHeaderComponent={Header}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <RankRow item={item} criterion={criterion} tc={tc} />
        )}
        ItemSeparatorComponent={() => (
          <View style={[s.divider, {backgroundColor: tc.divider}]} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>🏆</Text>
              <Text style={[s.emptyText, {color: tc.textSec}]}>
                {tab === 'nearby' && !nearbyMyRank
                  ? '리더보드에 참여하려면\n먼저 러닝을 기록하세요.'
                  : '리더보드 데이터가 없습니다.'}
              </Text>
            </View>
          ) : null
        }
      />
    </ThemeBackground>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  content: {},

  filterCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 10,
    borderRadius: 18, borderWidth: 1, padding: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    gap: 10,
  },

  segment: {
    flexDirection: 'row', borderRadius: 12, padding: 3,
  },
  segMt: {marginHorizontal: 16, marginBottom: 10},
  segBtn: {
    flex: 1, paddingVertical: 8,
    alignItems: 'center', borderRadius: 10,
  },
  segText: {fontSize: 13, fontWeight: '700'},

  pills: {flexDirection: 'row', gap: 8},
  pill: {
    flex: 1, paddingVertical: 7, alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5,
  },
  pillText: {fontSize: 13, fontWeight: '700'},

  podiumWrap: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, overflow: 'hidden',
    paddingHorizontal: 8,
  },

  myBanner: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  myBannerLabel: {fontSize: 12, fontWeight: '600', marginBottom: 2},
  myBannerValue: {fontSize: 18, fontWeight: '800'},
  myBannerTotal: {fontSize: 12},

  nearbyNote: {
    fontSize: 12, fontStyle: 'italic',
    paddingHorizontal: 16, marginBottom: 8,
  },

  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingBottom: 8, borderBottomWidth: 1,
  },
  thRank: {width: 60, fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
  thName: {flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
  thVal:  {fontSize: 11, fontWeight: '700', letterSpacing: 0.5},

  divider: {height: 1, marginLeft: 62},
  emptyWrap: {alignItems: 'center', paddingTop: 48},
  emptyEmoji: {fontSize: 48, marginBottom: 14},
  emptyText: {fontSize: 15, textAlign: 'center', lineHeight: 24},
});
