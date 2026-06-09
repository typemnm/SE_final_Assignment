import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useRunning} from '../hooks/useRunning';
import {AnimatedRouteMap} from '../components/AnimatedRouteMap';
import {ElevationChart} from '../components/ElevationChart';
import {spacing} from '@theme/index';
import {fmtKm, fmtMinPerKm, fmtElapsed, calcElevationGain} from '../utils';
import type {RunningStackParams} from '../types';

type Props = NativeStackScreenProps<RunningStackParams, 'RunningDetail'>;

// ────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────

const HeroDistance = ({km}: {km: number}) => (
  <View style={styles.heroWrap}>
    <View style={styles.heroRow}>
      <Text style={styles.heroNum}>{km.toFixed(2)}</Text>
      <Text style={styles.heroUnit}>km</Text>
    </View>
    <Text style={styles.heroLabel}>거리</Text>
  </View>
);

const StatBadge = ({label, value, accent}: {label: string; value: string; accent?: boolean}) => (
  <View style={styles.statBadge}>
    <Text style={[styles.statBadgeValue, accent && styles.statBadgeAccent]}>{value}</Text>
    <Text style={styles.statBadgeLabel}>{label}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const SectionHeader = ({title}: {title: string}) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const SplitRow = ({
  km,
  paceSeconds,
  avgPaceSeconds,
  index,
}: {
  km: number;
  paceSeconds: number;
  avgPaceSeconds: number;
  index: number;
}) => {
  const diff = paceSeconds - avgPaceSeconds;
  const isFast = diff < -8;
  const isSlow = diff > 8;
  const statusColor = isFast ? '#4CAF50' : isSlow ? '#F44336' : '#9E9E9E';
  const statusLabel = isFast ? '빠름' : isSlow ? '느림' : '평균';
  const mins = Math.floor(paceSeconds / 60);
  const secs = paceSeconds % 60;

  // pace bar width (relative to avg)
  const barRatio = Math.min(avgPaceSeconds / Math.max(paceSeconds, 1), 1.4);

  return (
    <View style={[styles.splitRow, index % 2 === 0 && styles.splitRowAlt]}>
      <Text style={styles.splitKm}>{km}km</Text>
      <View style={styles.splitBarWrap}>
        <View style={[styles.splitBar, {width: `${Math.round(barRatio * 60)}%` as any, backgroundColor: statusColor}]} />
      </View>
      <Text style={styles.splitPace}>{`${mins}'${String(secs).padStart(2, '0')}"`}</Text>
      <Text style={[styles.splitStatus, {color: statusColor}]}>{statusLabel}</Text>
    </View>
  );
};

// ────────────────────────────────────────────────────────────
// 메인 스크린
// ────────────────────────────────────────────────────────────

export const RunningDetailScreen = () => {
  useRoute<Props['route']>();
  const {selectedRecord, loading} = useRunning();
  const {width} = useWindowDimensions();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  if (!selectedRecord) {
    return (
      <View style={styles.center}>
        <Text style={styles.noData}>기록을 선택해주세요.</Text>
      </View>
    );
  }

  const record = selectedRecord;
  const routeRaw = record.route ?? [];
  const splitPaces: Array<{km: number; pace: number}> = record.splitPaces ?? [];
  const elevGain = calcElevationGain(routeRaw);
  const avgPaceSeconds = Math.round(record.avgPace * 60);

  const dateObj = new Date(record.date);
  const dateStr = dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = dateObj.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* ── 날짜/시간 헤더 ── */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.timeText}>{timeStr} 출발</Text>
      </View>

      {/* ── 히어로: 거리 ── */}
      <HeroDistance km={record.distance} />

      {/* ── 주요 통계 ── */}
      <View style={styles.statsRow}>
        <StatBadge label="시간" value={fmtElapsed(record.duration)} />
        <View style={styles.statSep} />
        <StatBadge label="평균 페이스" value={fmtMinPerKm(record.avgPace)} accent />
        <View style={styles.statSep} />
        <StatBadge label="칼로리" value={`${record.calories}`} />
        <View style={styles.statSep} />
        <StatBadge label="고도 상승" value={`${elevGain}m`} />
      </View>

      <Divider />

      {/* ── 애니메이션 경로 지도 ── */}
      <SectionHeader title="경로" />
      <View style={styles.mapWrap}>
        <AnimatedRouteMap
          route={routeRaw}
          height={280}
          autoPlay
        />
      </View>

      {/* ── 구간 정보 칩 ── */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>🏁 {splitPaces.length}km 완주</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>⚡ 최고 {splitPaces.length > 0
            ? fmtMinPerKm(Math.min(...splitPaces.map(s => s.pace / 60)) )
            : fmtMinPerKm(record.avgPace)}</Text>
        </View>
        {elevGain > 0 && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>⛰ +{elevGain}m</Text>
          </View>
        )}
      </View>

      {/* ── 고도 그래프 ── */}
      {elevGain > 0 && (
        <>
          <Divider />
          <SectionHeader title="고도 프로파일" />
          <View style={styles.elevWrap}>
            <ElevationChart
              route={routeRaw}
              totalDistanceKm={record.distance}
              width={width}
              height={110}
            />
          </View>
        </>
      )}

      {/* ── 구간별 페이스 테이블 ── */}
      {splitPaces.length > 0 && (
        <>
          <Divider />
          <SectionHeader title="구간별 페이스" />
          <View style={styles.splitTable}>
            {/* 헤더 */}
            <View style={styles.splitHeader}>
              <Text style={[styles.splitKm, styles.splitHeaderText]}>구간</Text>
              <View style={styles.splitBarWrap} />
              <Text style={[styles.splitPace, styles.splitHeaderText]}>페이스</Text>
              <Text style={[styles.splitStatus, styles.splitHeaderText]}>평가</Text>
            </View>
            {splitPaces.map((s, i) => (
              <SplitRow
                key={i}
                km={s.km}
                paceSeconds={s.pace}
                avgPaceSeconds={avgPaceSeconds}
                index={i}
              />
            ))}
            {/* 평균 행 */}
            <View style={styles.splitAvgRow}>
              <Text style={styles.splitAvgLabel}>평균</Text>
              <Text style={styles.splitAvgValue}>{fmtMinPerKm(record.avgPace)}</Text>
            </View>
          </View>
        </>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
};

// ────────────────────────────────────────────────────────────
// 스타일
// ────────────────────────────────────────────────────────────

const BG = '#0A0A0F';
const SURFACE = '#12141A';
const CYAN = '#00E5FF';
const TEXT = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.70)';

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: BG},
  content: {paddingBottom: 24},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG},
  noData: {color: TEXT_DIM, fontSize: 16},

  // 헤더
  header: {paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4},
  dateText: {color: TEXT_MID, fontSize: 13, fontWeight: '500'},
  timeText: {color: TEXT_DIM, fontSize: 12, marginTop: 2},

  // 히어로
  heroWrap: {paddingHorizontal: spacing.md, paddingVertical: spacing.md},
  heroRow: {flexDirection: 'row', alignItems: 'flex-end'},
  heroNum: {
    fontSize: 78,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 84,
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 26,
    fontWeight: '300',
    color: TEXT_MID,
    marginBottom: 10,
    marginLeft: 6,
  },
  heroLabel: {
    color: TEXT_DIM,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // 통계
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  statBadge: {flex: 1, alignItems: 'center'},
  statBadgeValue: {fontSize: 17, fontWeight: '700', color: TEXT},
  statBadgeAccent: {color: CYAN},
  statBadgeLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSep: {width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)'},

  divider: {height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4},

  sectionHeader: {
    color: TEXT_DIM,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 8,
  },

  // 구간 정보 칩
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {color: CYAN, fontSize: 12, fontWeight: '600'},

  // 지도 래퍼
  mapWrap: {
    marginHorizontal: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // 고도 그래프
  elevWrap: {backgroundColor: SURFACE},

  // 구간 테이블
  splitTable: {marginHorizontal: spacing.md, borderRadius: 10, overflow: 'hidden'},
  splitHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  splitHeaderText: {color: TEXT_DIM, fontSize: 10, textTransform: 'uppercase', fontWeight: '700'},
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: SURFACE,
  },
  splitRowAlt: {backgroundColor: '#0f1018'},
  splitKm: {width: 42, color: TEXT_MID, fontSize: 13},
  splitBarWrap: {flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginHorizontal: 8, overflow: 'hidden'},
  splitBar: {height: 4, borderRadius: 2},
  splitPace: {width: 58, color: TEXT, fontSize: 13, fontWeight: '600', textAlign: 'right'},
  splitStatus: {width: 36, fontSize: 11, fontWeight: '700', textAlign: 'right'},
  splitAvgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,229,255,0.06)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,229,255,0.15)',
  },
  splitAvgLabel: {color: CYAN, fontSize: 12, fontWeight: '700'},
  splitAvgValue: {color: CYAN, fontSize: 13, fontWeight: '800'},
});
