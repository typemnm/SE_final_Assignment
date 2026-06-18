import React, {useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useSelector} from 'react-redux';
import type {RootState} from '@store/index';
import {ThemeBackground} from '@components/common/ThemeBackground';
import {useThemeContext} from '@theme/ThemeContext';
import {fmtKm, fmtElapsed, fmtMinPerKm} from '../utils';

const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export const RunningStatsScreen = () => {
  const {tc} = useThemeContext();
  const records = useSelector((s: RootState) => s.running.records as any[]);

  const stats = useMemo(() => {
    if (!records.length) return null;

    const sorted = [...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const totalDist  = records.reduce((s, r) => s + r.distance, 0);
    const totalSecs  = records.reduce((s, r) => s + r.duration, 0);
    const totalCals  = records.reduce((s, r) => s + (r.calories ?? 0), 0);
    const bestDist   = Math.max(...records.map(r => r.distance));
    const bestPace   = records
      .filter(r => r.avgPace > 0)
      .reduce((best, r) => (r.avgPace < best ? r.avgPace : best), Infinity);
    const bestCals   = Math.max(...records.map(r => r.calories ?? 0));

    // Current streak (consecutive days up to today)
    const today = new Date(); today.setHours(0,0,0,0);
    const runDates = new Set(records.map(r => {
      const d = new Date(r.date); d.setHours(0,0,0,0); return d.getTime();
    }));
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if (runDates.has(d.getTime())) { streak++; } else { break; }
    }

    // Last 6 months totals
    const now = new Date();
    const monthly = Array.from({length: 6}, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const y = d.getFullYear(); const m = d.getMonth();
      const dist = records
        .filter(r => { const rd = new Date(r.date); return rd.getFullYear() === y && rd.getMonth() === m; })
        .reduce((s, r) => s + r.distance, 0);
      return {label: MONTH_KR[m], distKm: dist};
    });
    const maxMonthly = Math.max(...monthly.map(m => m.distKm), 1);

    return {totalDist, totalSecs, totalCals, totalCount: records.length,
            bestDist, bestPace, bestCals, streak, monthly, maxMonthly, sorted};
  }, [records]);

  if (!stats) {
    return (
      <ThemeBackground style={s.root}>
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📊</Text>
          <Text style={[s.emptyText, {color: tc.textSec}]}>아직 러닝 기록이 없습니다.</Text>
        </View>
      </ThemeBackground>
    );
  }

  const BAR_MAX = 72;

  return (
    <ThemeBackground style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 전체 합계 ─────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, {color: tc.textSec}]}>전체 합계</Text>
        <View style={[s.card, {backgroundColor: tc.card, borderColor: tc.cardBorderSide}]}>
          <View style={s.statsGrid}>
            <View style={s.gridItem}>
              <Text style={[s.bigVal, {color: tc.emerald}]}>{stats.totalDist.toFixed(1)}</Text>
              <Text style={[s.bigUnit, {color: tc.textSec}]}>km</Text>
              <Text style={[s.gridLabel, {color: tc.textSec}]}>총 거리</Text>
            </View>
            <View style={[s.gridDiv, {backgroundColor: tc.divider}]} />
            <View style={s.gridItem}>
              <Text style={[s.bigVal, {color: tc.textPri}]}>{stats.totalCount}</Text>
              <Text style={[s.bigUnit, {color: tc.textSec}]}>회</Text>
              <Text style={[s.gridLabel, {color: tc.textSec}]}>러닝 횟수</Text>
            </View>
            <View style={[s.gridDiv, {backgroundColor: tc.divider}]} />
            <View style={s.gridItem}>
              <Text style={[s.bigVal, {color: tc.textPri}]}>{fmtElapsed(stats.totalSecs)}</Text>
              <Text style={[s.gridLabel, {color: tc.textSec, marginTop: 4}]}>총 시간</Text>
            </View>
            <View style={[s.gridDiv, {backgroundColor: tc.divider}]} />
            <View style={s.gridItem}>
              <Text style={[s.bigVal, {color: tc.gold}]}>{stats.totalCals.toLocaleString()}</Text>
              <Text style={[s.bigUnit, {color: tc.textSec}]}>kcal</Text>
              <Text style={[s.gridLabel, {color: tc.textSec}]}>소모 칼로리</Text>
            </View>
          </View>
        </View>

        {/* ── 개인 최고 기록 ────────────────────────────────────── */}
        <Text style={[s.sectionTitle, {color: tc.textSec}]}>개인 최고 기록</Text>
        <View style={[s.card, {backgroundColor: tc.card, borderColor: tc.cardBorderSide}]}>
          <RecordRow
            emoji="🏅" label="최장 거리"
            value={fmtKm(stats.bestDist)} tc={tc} />
          <View style={[s.rowDiv, {backgroundColor: tc.divider}]} />
          <RecordRow
            emoji="⚡" label="최고 페이스"
            value={fmtMinPerKm(stats.bestPace === Infinity ? 0 : stats.bestPace)} tc={tc} />
          <View style={[s.rowDiv, {backgroundColor: tc.divider}]} />
          <RecordRow
            emoji="🔥" label="최다 칼로리"
            value={`${stats.bestCals} kcal`} tc={tc} />
          <View style={[s.rowDiv, {backgroundColor: tc.divider}]} />
          <RecordRow
            emoji="🔥" label="현재 연속 기록"
            value={`${stats.streak}일 연속`}
            highlight={stats.streak > 0}
            tc={tc} />
        </View>

        {/* ── 월별 거리 ─────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, {color: tc.textSec}]}>최근 6개월 거리</Text>
        <View style={[s.card, {backgroundColor: tc.card, borderColor: tc.cardBorderSide}]}>
          <View style={s.barsRow}>
            {stats.monthly.map((m, i) => {
              const barH = m.distKm > 0 ? Math.max(6, (m.distKm / stats.maxMonthly) * BAR_MAX) : 0;
              return (
                <View key={i} style={s.barCol}>
                  <Text style={[s.barDistLabel, {color: m.distKm > 0 ? tc.emerald : 'transparent'}]}>
                    {m.distKm > 0 ? m.distKm.toFixed(0) : ''}
                  </Text>
                  <View style={[s.barBg, {backgroundColor: tc.track, height: BAR_MAX}]}>
                    <View style={[s.barFill, {height: barH, backgroundColor: i === 5 ? tc.teal : tc.emerald}]} />
                  </View>
                  <Text style={[s.barLabel, {color: i === 5 ? tc.emerald : tc.textSec}]}>
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </ThemeBackground>
  );
};

const RecordRow = ({emoji, label, value, highlight, tc}: {
  emoji: string; label: string; value: string; highlight?: boolean;
  tc: ReturnType<typeof useThemeContext>['tc'];
}) => (
  <View style={s.recordRow}>
    <Text style={s.recordEmoji}>{emoji}</Text>
    <Text style={[s.recordLabel, {color: tc.textSec}]}>{label}</Text>
    <Text style={[s.recordValue, {color: highlight ? tc.emerald : tc.textPri}]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  root: {flex: 1},
  scroll: {padding: 16, paddingBottom: 40},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyEmoji: {fontSize: 52, marginBottom: 12},
  emptyText: {fontSize: 15},

  sectionTitle: {fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 4, textTransform: 'uppercase'},

  card: {
    borderRadius: 18, borderWidth: 1, marginBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },

  statsGrid: {flexDirection: 'row', paddingVertical: 18},
  gridItem: {flex: 1, alignItems: 'center'},
  bigVal: {fontSize: 22, fontWeight: '800'},
  bigUnit: {fontSize: 11, marginTop: 1},
  gridLabel: {fontSize: 11, marginTop: 5},
  gridDiv: {width: 1, alignSelf: 'stretch', marginVertical: 10},

  recordRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    gap: 12,
  },
  recordEmoji: {fontSize: 18, width: 24},
  recordLabel: {flex: 1, fontSize: 14},
  recordValue: {fontSize: 15, fontWeight: '700'},
  rowDiv: {height: 1, marginHorizontal: 16},

  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 16, gap: 4,
  },
  barCol: {flex: 1, alignItems: 'center', gap: 4},
  barDistLabel: {fontSize: 9, fontWeight: '700'},
  barBg: {width: '100%', borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end'},
  barFill: {width: '100%', borderRadius: 5},
  barLabel: {fontSize: 10, marginTop: 4},
});
