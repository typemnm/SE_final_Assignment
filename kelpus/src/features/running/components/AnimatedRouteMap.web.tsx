/**
 * Web-only: Naver Maps + 경로 애니메이션
 * Webpack이 .web.tsx를 .tsx보다 우선 선택하므로 네이티브는 SVG 버전을 사용
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {NAVER_MAPS_CLIENT_ID} from '../config';

type RoutePoint = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: string;
};

interface AnimatedRouteMapProps {
  route: RoutePoint[];
  height?: number;
  autoPlay?: boolean;
  animationDuration?: number;
  horizontalPadding?: number;
}

const g = globalThis as any;

/**
 * Naver Maps JS SDK 로드.
 * onload 대신 SDK 공식 callback 파라미터를 사용 —
 * naver.maps 내부 초기화가 완전히 끝난 뒤 callback이 호출되므로
 * "naver.maps is null" 레이스 컨디션이 발생하지 않는다.
 */
const CALLBACK_NAME = '__naverMapsReady__';
let naverMapsPromise: Promise<void> | null = null;
const loadNaverMaps = (): Promise<void> => {
  if (g.naver?.maps) return Promise.resolve();
  if (naverMapsPromise) return naverMapsPromise;

  naverMapsPromise = new Promise<void>((resolve, reject) => {
    if (!g.document) return reject(new Error('No document'));

    g[CALLBACK_NAME] = () => {
      delete g[CALLBACK_NAME];
      resolve();
    };

    const script = g.document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      `https://oapi.map.naver.com/openapi/v3/maps.js` +
      `?ncpKeyId=${NAVER_MAPS_CLIENT_ID}&callback=${CALLBACK_NAME}`;
    script.onerror = () => {
      naverMapsPromise = null;
      delete g[CALLBACK_NAME];
      reject(new Error('Naver Maps 스크립트 로드 실패'));
    };
    g.document.head.appendChild(script);
  });
  return naverMapsPromise;
};

const toLatLng = (naver: any, lat: number, lng: number) =>
  new naver.maps.LatLng(lat, lng);

const getCoord = (p: RoutePoint): [number, number] => [
  p.lat ?? p.latitude ?? 0,
  p.lng ?? p.longitude ?? 0,
];

export const AnimatedRouteMap = ({
  route,
  height = 300,
  autoPlay = true,
  animationDuration = 3000,
}: AnimatedRouteMapProps) => {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);           // naver.maps.Map 인스턴스
  const polylineRef = useRef<any>(null);       // 애니메이션 폴리라인
  const ghostRef = useRef<any>(null);          // 전체 경로 (흐릿한 가이드)
  const runnerRef = useRef<any>(null);         // 러너 마커
  const timerRef = useRef<any>(null);
  const coordsRef = useRef<[number, number][]>([]);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  coordsRef.current = route
    .map(getCoord)
    .filter(c => c[0] !== 0 || c[1] !== 0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    const naver = g.naver;
    const map = mapRef.current;
    const coords = coordsRef.current;
    if (!naver?.maps || !map || coords.length < 2) return;

    stopTimer();

    // 기존 애니메이션 레이어 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (runnerRef.current) {
      runnerRef.current.setMap(null);
      runnerRef.current = null;
    }

    setPlaying(true);

    // 애니메이션 폴리라인 (밝은 파란색)
    const polyline = new naver.maps.Polyline({
      map,
      path: [],
      strokeColor: '#00C8FF',
      strokeWeight: 5,
      strokeOpacity: 0.95,
    });
    polylineRef.current = polyline;

    const startMs = Date.now();

    timerRef.current = setInterval(() => {
      // naver.maps가 예기치 않게 null이면 타이머를 중단 (방어 코드)
      if (!naver?.maps) { stopTimer(); setPlaying(false); return; }

      const elapsed = Date.now() - startMs;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Phase 1 (0→65%): 경로 그리기
      const drawPhase = Math.min(progress / 0.65, 1);
      const nVisible = Math.max(2, Math.round(drawPhase * coords.length));
      const visiblePath = coords
        .slice(0, nVisible)
        .map(([lat, lng]) => toLatLng(naver, lat, lng));
      polyline.setPath(visiblePath);

      // Phase 2 (65%→100%): 러너 도트 이동
      if (progress > 0.65) {
        const runPhase = (progress - 0.65) / 0.35;
        const runIdx = Math.min(
          Math.round(runPhase * (coords.length - 1)),
          coords.length - 1,
        );
        const [rLat, rLng] = coords[runIdx];
        const runPos = toLatLng(naver, rLat, rLng);

        if (!runnerRef.current) {
          runnerRef.current = new naver.maps.Marker({
            map,
            position: runPos,
            icon: {
              content: `<div style="
                width:20px;height:20px;
                background:#FFEB3B;
                border:3px solid #fff;
                border-radius:50%;
                box-shadow:0 0 12px rgba(255,235,59,0.9),0 0 24px rgba(255,235,59,0.5);
              "></div>`,
              anchor: new naver.maps.Point(10, 10),
            },
            zIndex: 100,
          });
        } else {
          runnerRef.current.setPosition(runPos);
        }
      }

      if (progress >= 1) {
        stopTimer();
        setPlaying(false);

        // 도착 마커
        const [eLat, eLng] = coords[coords.length - 1];
        new naver.maps.Marker({
          map,
          position: toLatLng(naver, eLat, eLng),
          icon: {
            content: `<div style="
              width:20px;height:20px;
              background:#F44336;
              border:3px solid #fff;
              border-radius:50%;
              box-shadow:0 0 8px rgba(244,67,54,0.8);
            "></div>`,
            anchor: new naver.maps.Point(10, 10),
          },
          zIndex: 90,
        });
      }
    }, 16);
  }, [animationDuration, stopTimer]);

  useEffect(() => {
    const coords = coordsRef.current;
    if (!containerRef.current || coords.length < 2) return;

    if (NAVER_MAPS_CLIENT_ID === 'YOUR_NAVER_CLIENT_ID') {
      setErrorMsg(
        'config.ts에 Naver Maps Client ID를 입력하세요.\n' +
          'console.ncloud.com → AI·NAVER API → Maps',
      );
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        await loadNaverMaps();
      } catch (e: any) {
        if (mounted) setErrorMsg('Naver Maps 로드 실패: ' + e.message);
        return;
      }
      if (!mounted || !containerRef.current) return;

      const naver = g.naver;
      const [cLat, cLng] = coords[Math.floor(coords.length / 2)];

      const map = new naver.maps.Map(containerRef.current, {
        center: toLatLng(naver, cLat, cLng),
        zoom: 16,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        mapTypeControl: false,
        scaleControl: false,
        logoControl: true,
        zoomControl: true,
        zoomControlOptions: {position: naver.maps.Position.TOP_RIGHT},
      });
      mapRef.current = map;

      // bounds 자동 맞춤
      const bounds = new naver.maps.LatLngBounds(
        toLatLng(naver, Math.min(...coords.map(c => c[0])), Math.min(...coords.map(c => c[1]))),
        toLatLng(naver, Math.max(...coords.map(c => c[0])), Math.max(...coords.map(c => c[1]))),
      );
      map.fitBounds(bounds, {top: 48, right: 48, bottom: 48, left: 48});

      // Ghost route (전체 경로, 반투명)
      ghostRef.current = new naver.maps.Polyline({
        map,
        path: coords.map(([lat, lng]) => toLatLng(naver, lat, lng)),
        strokeColor: '#90A4AE',
        strokeWeight: 3,
        strokeOpacity: 0.4,
        strokeStyle: 'dash',
      });

      // 출발 마커
      const [sLat, sLng] = coords[0];
      new naver.maps.Marker({
        map,
        position: toLatLng(naver, sLat, sLng),
        icon: {
          content: `<div style="
            width:20px;height:20px;
            background:#4CAF50;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 8px rgba(76,175,80,0.8);
          "></div>`,
          anchor: new naver.maps.Point(10, 10),
        },
        zIndex: 90,
      });

      setReady(true);
      if (autoPlay) startAnimation();
    };

    init();

    return () => {
      mounted = false;
      stopTimer();
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coords = coordsRef.current;

  if (errorMsg) {
    return (
      <View style={[styles.fallback, {height}]}>
        <Text style={styles.fallbackTitle}>🗺️ 네이버 지도 설정 필요</Text>
        <Text style={styles.fallbackMsg}>{errorMsg}</Text>
      </View>
    );
  }

  if (coords.length < 2) {
    return (
      <View style={[styles.fallback, {height}]}>
        <Text style={styles.fallbackMsg}>경로 데이터 없음</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, {height}]}>
      {React.createElement('div' as any, {
        ref: containerRef,
        style: {width: '100%', height: '100%'},
      })}
      {ready && !playing && (
        <TouchableOpacity
          style={styles.replayBtn}
          onPress={startAnimation}
          activeOpacity={0.8}>
          <Text style={styles.replayText}>▶ 다시 보기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative' as any,
    alignSelf: 'stretch',
    borderRadius: 12,
  },
  fallback: {
    backgroundColor: '#1a1f2e',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 24,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  fallbackMsg: {
    color: '#90A4AE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  replayBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(0,200,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  replayText: {color: '#00C8FF', fontSize: 12, fontWeight: '600'},
});
