import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import MapView, {Polyline, Marker} from 'react-native-maps';
import {formatDate} from '@utils/format';
import type {RunningFrame, RoutePoint} from '../hooks/useReelCreator';

interface Props {
  frame: RunningFrame;
  compact?: boolean;
}

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
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtDist = (km: number) => (km >= 1 ? km.toFixed(2) : String(Math.round(km * 1000)));
const fmtUnit = (km: number) => (km >= 1 ? 'km' : 'm');

const getRegion = (route: RoutePoint[]) => {
  const lats = route.map(p => p.lat);
  const lngs = route.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) * 1.6 || 0.008,
    longitudeDelta: (maxLng - minLng) * 1.6 || 0.008,
  };
};

const BOLD = Platform.select({android: 'sans-serif-condensed', ios: undefined});

// ── StatPill ───────────────────────────────────────────────────────────────

const StatPill = ({icon, value, label, sm}: {icon: string; value: string; label: string; sm: boolean}) => (
  <View style={sp.wrap}>
    <Text style={[sp.icon, sm && {fontSize: 12}]}>{icon}</Text>
    <Text style={[sp.val, sm && {fontSize: 12}]} adjustsFontSizeToFit numberOfLines={1}>
      {value}
    </Text>
    <Text style={[sp.lbl, sm && {fontSize: 9}]}>{label}</Text>
  </View>
);
const sp = StyleSheet.create({
  wrap: {flex: 1, alignItems: 'center', gap: 1},
  icon: {fontSize: 15},
  val: {fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.3},
  lbl: {fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3},
});

// ── Main ───────────────────────────────────────────────────────────────────

export const RunningSlideFrame = ({frame, compact = false}: Props) => {
  const hasRoute = (frame.route?.length ?? 0) >= 2;
  const region   = hasRoute ? getRegion(frame.route!) : undefined;
  const coords   = hasRoute ? frame.route!.map(p => ({latitude: p.lat, longitude: p.lng})) : [];

  // 하단 통계 패널: compact 72px, full 86px
  const PANEL_H = compact ? 72 : 86;

  return (
    <View style={s.root}>

      {/* ── 지도 — 패널 위 공간 전부 차지 ──────────────────────── */}
      <View style={s.mapWrap}>
        {hasRoute && region ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            pointerEvents="none">
            <Polyline
              coordinates={coords}
              strokeColor="#34D399"
              strokeWidth={compact ? 4 : 5}
              lineCap="round"
              lineJoin="round"
            />
            <Marker coordinate={coords[0]}                  pinColor="#60A5FA" title="출발" />
            <Marker coordinate={coords[coords.length - 1]} pinColor="#F87171" title="도착" />
          </MapView>
        ) : (
          <View style={s.noMap}>
            <Text style={[s.noMapIco, compact && {fontSize: 28}]}>🗺️</Text>
            <Text style={[s.noMapTxt, compact && {fontSize: 11}]}>GPS 경로 없음</Text>
          </View>
        )}

        {/* 날짜 + 태그 — 지도 위 오버레이 */}
        <View style={s.topOverlay}>
          <View style={s.tagChip}>
            <Text style={[s.tagTxt, compact && {fontSize: 10}]}>🏃 러닝 기록</Text>
          </View>
          <Text style={[s.dateTxt, compact && {fontSize: 10}]}>{formatDate(frame.date)}</Text>
        </View>

        {/* 거리 — 지도 하단 중앙 오버레이 */}
        <View style={s.distOverlay}>
          <View style={s.distBg}>
            <Text style={[s.distNum, compact && s.distNumSm, {fontFamily: BOLD}]}>
              {fmtDist(frame.distanceKm)}
            </Text>
            <Text style={[s.distUnit, compact && s.distUnitSm]}>
              {fmtUnit(frame.distanceKm)}
            </Text>
          </View>
        </View>

        {/* 하단 그라디언트 페이드 */}
        <View style={s.bottomFade} />
      </View>

      {/* ── 통계 패널 — 고정 높이 ──────────────────────────────── */}
      <View style={[s.panel, {height: PANEL_H}]}>
        <View style={s.statsRow}>
          <StatPill icon="⏱" value={fmtDuration(frame.durationSeconds)} label="시간"   sm={compact} />
          <View style={s.sep} />
          <StatPill icon="👟" value={`${fmtPace(frame.avgPaceMinPerKm)}/km`} label="페이스" sm={compact} />
          <View style={s.sep} />
          <StatPill icon="🔥" value={`${frame.calories}`}                label="kcal"  sm={compact} />
        </View>
        <View style={s.wRow}>
          <View style={s.wDot} />
          <Text style={[s.wTxt, compact && {fontSize: 9}]}>kelpus</Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0A1929'},

  // 지도
  mapWrap: {flex: 1, overflow: 'hidden', backgroundColor: '#162740'},
  noMap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0D2037',
  },
  noMapIco: {fontSize: 40},
  noMapTxt: {fontSize: 13, color: 'rgba(255,255,255,0.4)'},

  // 상단 오버레이
  topOverlay: {
    position: 'absolute', top: 10, left: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  tagChip: {
    backgroundColor: 'rgba(10,25,41,0.72)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
  },
  tagTxt: {fontSize: 12, color: '#34D399', fontWeight: '700'},
  dateTxt: {fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500'},

  // 거리 오버레이 (지도 하단 중앙)
  distOverlay: {
    position: 'absolute', bottom: 36, left: 0, right: 0,
    alignItems: 'center',
  },
  distBg: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 5,
    backgroundColor: 'rgba(8,20,36,0.75)',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  distNum: {
    fontSize: 54, fontWeight: '900', color: '#fff',
    letterSpacing: -2, lineHeight: 58, includeFontPadding: false,
  },
  distNumSm: {fontSize: 42, lineHeight: 46, letterSpacing: -1},
  distUnit: {fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginBottom: 6},
  distUnitSm: {fontSize: 17, marginBottom: 4},

  // 하단 페이드
  bottomFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 52,
    backgroundColor: 'rgba(8,20,36,0.85)',
  },

  // 통계 패널
  panel: {paddingHorizontal: 14, justifyContent: 'center', gap: 6},
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8,
  },
  sep: {width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)'},
  wRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5},
  wDot: {width: 5, height: 5, borderRadius: 3, backgroundColor: '#34D399'},
  wTxt: {fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: '700', letterSpacing: 2},
});
