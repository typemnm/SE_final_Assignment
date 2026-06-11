/**
 * 웹 전용: react-native-maps 대신 Naver Maps JS SDK를 사용
 * Metro/Webpack이 .web.tsx를 .tsx보다 우선 선택하므로
 * 네이티브 앱에서는 RunningSlideFrame.tsx 가 사용됨
 */
import React, {useEffect, useRef, useState} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {formatDate} from '@utils/format';
import type {RunningFrame} from '../hooks/useReelCreator';

// ── Naver Maps 로더 ────────────────────────────

const NAVER_MAPS_CLIENT_ID = 'rf624clnsb';
const g = globalThis as any;

let naverMapsPromise: Promise<void> | null = null;
const loadNaverMaps = (): Promise<void> => {
  if (g.naver?.maps) return Promise.resolve();
  if (naverMapsPromise) return naverMapsPromise;
  naverMapsPromise = new Promise<void>((resolve, reject) => {
    if (!g.document) return reject(new Error('No document'));
    const script = g.document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}`;
    script.onload = () => resolve();
    script.onerror = () => {
      naverMapsPromise = null;
      reject(new Error('Naver Maps 로드 실패'));
    };
    g.document.head.appendChild(script);
  });
  return naverMapsPromise;
};

// ── 포맷 헬퍼 ──────────────────────────────────

const fmtPace = (v: number): string => {
  if (!v || !isFinite(v) || v <= 0) return "--'--\"";
  const m = Math.floor(v);
  const s = Math.round((v - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

const fmtDuration = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtDist = (km: number) =>
  km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`;

const BOLD_FONT = Platform.select({android: 'sans-serif-condensed', ios: undefined});

// ── 지도 파트 ──────────────────────────────────

interface MapPartProps {
  frame: RunningFrame;
  compact: boolean;
}

const NaverMapPart = ({frame, compact}: MapPartProps) => {
  const containerRef = useRef<any>(null);
  const [status, setStatus] = useState<'init' | 'ready' | 'error'>('init');

  useEffect(() => {
    const route = frame.route?.filter(p => p.lat !== 0 || p.lng !== 0) ?? [];
    if (route.length < 2) {
      setStatus('error');
      return;
    }

    let mounted = true;

    loadNaverMaps()
      .then(() => {
        if (!mounted || !containerRef.current) return;
        const naver = g.naver;

        const lats = route.map(p => p.lat);
        const lngs = route.map(p => p.lng);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

        const map = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(
            (minLat + maxLat) / 2,
            (minLng + maxLng) / 2,
          ),
          zoom: 15,
          draggable: false,
          pinchZoom: false,
          scrollWheel: false,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
          disableDoubleClickZoom: true,
          disableDoubleTapZoom: true,
          disableKineticPan: true,
        });

        // 경로에 맞게 bounds 자동 조정
        const bounds = new naver.maps.LatLngBounds(
          new naver.maps.LatLng(minLat, minLng),
          new naver.maps.LatLng(maxLat, maxLng),
        );
        map.fitBounds(bounds, {top: 28, right: 28, bottom: 28, left: 28});

        // 경로 폴리라인 (앱 primary 초록색)
        new naver.maps.Polyline({
          map,
          path: route.map(p => new naver.maps.LatLng(p.lat, p.lng)),
          strokeColor: '#4CAF50',
          strokeWeight: 5,
          strokeOpacity: 0.95,
        });

        // 출발 마커 (파랑)
        new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(route[0].lat, route[0].lng),
          icon: {
            content: `<div style="
              width:16px;height:16px;
              background:#2196F3;
              border:2.5px solid #fff;
              border-radius:50%;
              box-shadow:0 1px 4px rgba(0,0,0,.5)
            "></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
        });

        // 도착 마커 (빨강)
        new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(
            route[route.length - 1].lat,
            route[route.length - 1].lng,
          ),
          icon: {
            content: `<div style="
              width:16px;height:16px;
              background:#F44336;
              border:2.5px solid #fff;
              border-radius:50%;
              box-shadow:0 1px 4px rgba(0,0,0,.5)
            "></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
        });

        if (mounted) setStatus('ready');
      })
      .catch(() => {
        if (mounted) setStatus('error');
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.routeBox, compact && styles.routeBoxCompact]}>
      {/* 지도 컨테이너 — 항상 마운트해야 Naver Maps가 그릴 수 있음 */}
      <View ref={containerRef} style={styles.mapContainer} />
      {/* 로딩 오버레이 */}
      {status === 'init' && (
        <View style={[StyleSheet.absoluteFillObject, styles.mapOverlay]}>
          <Text style={styles.mapOverlayText}>🗺️ 지도 로딩 중...</Text>
        </View>
      )}
      {/* 오류 표시 */}
      {status === 'error' && (
        <View style={[StyleSheet.absoluteFillObject, styles.noRouteBox]}>
          <Text style={styles.noRouteIcon}>🗺️</Text>
          <Text style={styles.noRouteTxt}>경로 데이터 없음</Text>
        </View>
      )}
    </View>
  );
};

// ── 통계 박스 ──────────────────────────────────

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

interface Props {
  frame: RunningFrame;
  compact?: boolean;
}

export const RunningSlideFrame = ({frame, compact = false}: Props) => (
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
        <Text style={styles.subItem}>⏱ {fmtDuration(frame.durationSeconds)}</Text>
        <View style={styles.subDot} />
        <Text style={styles.subItem}>👟 {fmtPace(frame.avgPaceMinPerKm)}/km</Text>
      </View>
    </View>

    {/* Naver 지도 */}
    <NaverMapPart frame={frame} compact={compact ?? false} />

    {/* 통계 */}
    <View style={styles.statsRow}>
      <StatBox icon="🔥" value={`${frame.calories}`} label="칼로리" accent="#FF7043" />
      <StatBox icon="👟" value={fmtPace(frame.avgPaceMinPerKm)} label="페이스" accent="#FFD600" />
      <StatBox icon="⏱" value={fmtDuration(frame.durationSeconds)} label="시간" accent="#64B5F6" />
    </View>

    {/* 워터마크 */}
    <View style={styles.watermarkRow}>
      <View style={styles.wDot} />
      <Text style={styles.watermark}>kelpus</Text>
    </View>
  </View>
);

// ── 스타일 ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  date: {fontSize: 15, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5},
  tag: {fontSize: 13, color: '#64B5F6', fontWeight: '700', letterSpacing: 1.5},
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
  subDot: {width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)'},

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
  mapContainer: {flex: 1},
  mapOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FD',
  },
  mapOverlayText: {fontSize: 13, color: '#546E7A'},
  noRouteBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#162740',
  },
  noRouteIcon: {fontSize: 28},
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
  watermark: {fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '700', letterSpacing: 2},
});
