import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import MapView, {Polyline, Marker} from 'react-native-maps';
import {formatDate} from '@utils/format';
import type {RunningFrame, RoutePoint} from '../hooks/useReelCreator';

interface Props {
  frame: RunningFrame;
  compact?: boolean;
}

// ── 포맷 헬퍼 ──────────────────────────────────

const fmtPace = (minPerKm: number): string => {
  if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0) return "--'--\"";
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

const fmtDuration = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtDist = (km: number) =>
  km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`;

// ── 지도 리전 계산 ──────────────────────────────

const getRegion = (route: RoutePoint[]) => {
  const lats = route.map(p => p.lat);
  const lngs = route.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = (maxLat - minLat) * 1.5 || 0.008;
  const lngSpan = (maxLng - minLng) * 1.5 || 0.008;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latSpan,
    longitudeDelta: lngSpan,
  };
};

// 폰트: Android condensed, iOS system
const BOLD_FONT = Platform.select({
  android: 'sans-serif-condensed',
  ios: undefined,
});

// ── 서브 컴포넌트 ──────────────────────────────

interface StatBoxProps {
  icon: string;
  value: string;
  label: string;
  accent: string;
}

const StatBox = ({icon, value, label, accent}: StatBoxProps) => (
  <View style={[styles.statBox, {borderTopColor: accent}]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, {fontFamily: BOLD_FONT}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── 메인 컴포넌트 ──────────────────────────────

export const RunningSlideFrame = ({frame, compact = false}: Props) => {
  const hasRoute = (frame.route?.length ?? 0) >= 2;
  const region = hasRoute ? getRegion(frame.route!) : undefined;
  const coordinates = hasRoute
    ? frame.route!.map(p => ({latitude: p.lat, longitude: p.lng}))
    : [];

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(frame.date)}</Text>
        <Text style={styles.tag}>🏃 러닝 기록</Text>
      </View>

      {/* 거리 + 페이스/시간 */}
      <View style={styles.distanceBlock}>
        <Text
          style={[
            styles.distanceNumber,
            compact && styles.distanceNumberCompact,
            {fontFamily: BOLD_FONT},
          ]}>
          {fmtDist(frame.distanceKm)}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.subItem}>
            <Text style={styles.subEmoji}>⏱ </Text>
            {fmtDuration(frame.durationSeconds)}
          </Text>
          <View style={styles.subDot} />
          <Text style={styles.subItem}>
            <Text style={styles.subEmoji}>👟 </Text>
            {fmtPace(frame.avgPaceMinPerKm)}/km
          </Text>
        </View>
      </View>

      {/* GPS 지도 */}
      <View style={[styles.routeBox, compact && styles.routeBoxCompact]}>
        {hasRoute && region ? (
          <MapView
            style={styles.map}
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            pointerEvents="none">
            <Polyline
              coordinates={coordinates}
              strokeColor="#4CAF50"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
            <Marker
              coordinate={coordinates[0]}
              pinColor="#2196F3"
              title="출발"
            />
            <Marker
              coordinate={coordinates[coordinates.length - 1]}
              pinColor="#F44336"
              title="도착"
            />
          </MapView>
        ) : (
          <View style={styles.noRouteBox}>
            <Text style={styles.noRouteIcon}>🗺️</Text>
            <Text style={styles.noRouteTxt}>경로 데이터 없음</Text>
          </View>
        )}
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <StatBox
          icon="🔥"
          value={`${frame.calories}`}
          label="칼로리"
          accent="#FF7043"
        />
        <StatBox
          icon="👟"
          value={fmtPace(frame.avgPaceMinPerKm)}
          label="페이스"
          accent="#FFD600"
        />
        <StatBox
          icon="⏱"
          value={fmtDuration(frame.durationSeconds)}
          label="시간"
          accent="#64B5F6"
        />
      </View>

      {/* 워터마크 */}
      <View style={styles.watermarkRow}>
        <View style={styles.wDot} />
        <Text style={styles.watermark}>kelpus</Text>
      </View>
    </View>
  );
};

// ── 스타일 ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
    padding: 20,
    justifyContent: 'space-between',
  },

  // 헤더
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  date: {fontSize: 15, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5},
  tag: {
    fontSize: 13,
    color: '#64B5F6',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // 거리
  distanceBlock: {gap: 5},
  distanceNumber: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 58,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  distanceNumberCompact: {fontSize: 40, lineHeight: 46, letterSpacing: -0.5},
  subRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  subItem: {fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '500'},
  subEmoji: {fontSize: 12},
  subDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // 지도
  routeBox: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#E8F4FD',
    minHeight: 80,
  },
  routeBoxCompact: {maxHeight: 160},
  map: {flex: 1},
  noRouteBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#162740',
  },
  noRouteIcon: {fontSize: 32},
  noRouteTxt: {fontSize: 13, color: 'rgba(255,255,255,0.45)'},

  // 통계
  statsRow: {flexDirection: 'row', gap: 8},
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 2,
  },
  statIcon: {fontSize: 20, marginBottom: 4},
  statValue: {fontSize: 20, fontWeight: '800', color: '#FFFFFF'},
  statLabel: {fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, letterSpacing: 0.5},

  // 워터마크
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 2,
  },
  wDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#64B5F6'},
  watermark: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '700',
    letterSpacing: 2,
  },
});
