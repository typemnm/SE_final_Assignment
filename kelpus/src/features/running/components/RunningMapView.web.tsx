import React, {useRef, useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NAVER_MAPS_CLIENT_ID} from '../config';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RunningMapViewProps {
  route: Coordinate[];
  currentPosition?: Coordinate | null;
  isLive?: boolean;
  height?: number;
}

const g = globalThis as any;
const SEOUL = {lat: 37.5665, lng: 126.978};

let naverMapsPromise: Promise<void> | null = null;
const loadNaverMaps = (): Promise<void> => {
  if (g.naver?.maps) return Promise.resolve();
  if (naverMapsPromise) return naverMapsPromise;
  naverMapsPromise = new Promise<void>((resolve, reject) => {
    if (!g.document) return reject(new Error('No document'));
    const script = g.document.createElement('script');
    script.type = 'text/javascript';
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

export const RunningMapView = ({
  route,
  currentPosition,
  isLive = false,
  height = 250,
}: RunningMapViewProps) => {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (!containerRef.current) return;
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
      const anchor = currentPosition ?? (route.length > 0 ? {latitude: route[0].latitude, longitude: route[0].longitude} : null);
      const center = anchor
        ? new naver.maps.LatLng(anchor.latitude, anchor.longitude)
        : new naver.maps.LatLng(SEOUL.lat, SEOUL.lng);

      const map = new naver.maps.Map(containerRef.current, {
        center,
        zoom: isLive ? 17 : 15,
        mapTypeControl: false,
        scaleControl: false,
        logoControl: true,
        zoomControl: false,
      });
      mapRef.current = map;

      // 경로 폴리라인
      polylineRef.current = new naver.maps.Polyline({
        map,
        path: [],
        strokeColor: '#00C8FF',
        strokeWeight: 5,
        strokeOpacity: 0.95,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      });

      // 라이브 모드: 현재 위치 마커
      if (isLive) {
        currentMarkerRef.current = new naver.maps.Marker({
          map,
          position: center,
          icon: {
            content: `<div style="
              width:18px;height:18px;
              background:#00E5FF;
              border:3px solid #fff;
              border-radius:50%;
              box-shadow:0 0 0 6px rgba(0,229,255,0.25),0 0 14px rgba(0,229,255,0.7);
            "></div>`,
            anchor: new naver.maps.Point(9, 9),
          },
          zIndex: 100,
        });
      }

      setReady(true);
    };

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      polylineRef.current = null;
      currentMarkerRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 경로 업데이트
  useEffect(() => {
    if (!ready || !mapRef.current || !polylineRef.current) return;
    const naver = g.naver;

    const path = route.map(p => new naver.maps.LatLng(p.latitude, p.longitude));
    polylineRef.current.setPath(path);

    // 비라이브 모드: 전체 경로에 맞게 bounds 조정 + 출발/도착 마커
    if (!isLive && route.length >= 2) {
      const lats = route.map(p => p.latitude);
      const lngs = route.map(p => p.longitude);
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(Math.min(...lats), Math.min(...lngs)),
        new naver.maps.LatLng(Math.max(...lats), Math.max(...lngs)),
      );
      mapRef.current.fitBounds(bounds, {top: 48, right: 48, bottom: 48, left: 48});

      // 출발 마커
      if (!startMarkerRef.current) {
        startMarkerRef.current = new naver.maps.Marker({
          map: mapRef.current,
          position: new naver.maps.LatLng(route[0].latitude, route[0].longitude),
          icon: {
            content: `<div style="width:16px;height:16px;background:#4CAF50;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(76,175,80,0.8);"></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
          zIndex: 90,
        });
      }

      // 도착 마커
      const last = route[route.length - 1];
      if (endMarkerRef.current) {
        endMarkerRef.current.setPosition(new naver.maps.LatLng(last.latitude, last.longitude));
      } else {
        endMarkerRef.current = new naver.maps.Marker({
          map: mapRef.current,
          position: new naver.maps.LatLng(last.latitude, last.longitude),
          icon: {
            content: `<div style="width:16px;height:16px;background:#F44336;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(244,67,54,0.8);"></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
          zIndex: 90,
        });
      }
    }
  }, [route, ready, isLive]);

  // 현재 위치 업데이트 (라이브 모드)
  useEffect(() => {
    if (!ready || !mapRef.current || !currentPosition || !isLive) return;
    const naver = g.naver;
    const pos = new naver.maps.LatLng(currentPosition.latitude, currentPosition.longitude);

    mapRef.current.panTo(pos, {duration: 300, easing: 'easeOutCubic'});

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setPosition(pos);
    }
  }, [currentPosition, isLive, ready]);

  if (errorMsg) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <Text style={styles.placeholderText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!isLive && route.length === 0) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <Text style={styles.placeholderText}>경로 데이터가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, {height}]}>
      {React.createElement('div' as any, {
        ref: containerRef,
        style: {width: '100%', height: '100%'},
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {overflow: 'hidden', alignSelf: 'stretch'},
  placeholder: {
    backgroundColor: '#1a1f2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {color: '#90A4AE', fontSize: 14},
});
