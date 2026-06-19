import React, {useEffect, useRef} from 'react';
import {Text, View} from 'react-native';

interface Coord {
  latitude?: number;
  lat?: number;
  longitude?: number;
  lng?: number;
}

interface Props {
  route: Coord[];
  currentPosition?: Coord | null;
  isLive?: boolean;
}

function toLat(c: Coord): number {
  return (c.latitude ?? c.lat) as number;
}
function toLng(c: Coord): number {
  return (c.longitude ?? c.lng) as number;
}

export function RunningMapView({route, currentPosition, isLive}: Props) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!route || route.length === 0) return;
    const naver = (globalThis as any).naver;
    if (!naver) return;
    const container = containerRef.current;
    if (!container) return;

    const center = new naver.maps.LatLng(toLat(route[0]), toLng(route[0]));
    const map = new naver.maps.Map(container, {center, zoom: 15});
    mapRef.current = map;

    const path = route.map((c: Coord) => new naver.maps.LatLng(toLat(c), toLng(c)));
    const polyline = new naver.maps.Polyline({path, map});
    polylineRef.current = polyline;

    const marker = new naver.maps.Marker({position: center, map});
    markerRef.current = marker;

    return () => {
      polyline.setMap(null);
      marker.setMap(null);
      map.destroy();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !currentPosition) return;
    const naver = (globalThis as any).naver;
    if (!naver) return;
    const pos = new naver.maps.LatLng(toLat(currentPosition), toLng(currentPosition));
    if (isLive && mapRef.current.panTo) {
      mapRef.current.panTo(pos);
    }
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    }
  }, [currentPosition, isLive]);

  useEffect(() => {
    if (!polylineRef.current || !route) return;
    const naver = (globalThis as any).naver;
    if (!naver) return;
    const path = route.map((c: Coord) => new naver.maps.LatLng(toLat(c), toLng(c)));
    polylineRef.current.setPath(path);
  }, [route]);

  if (!route || route.length === 0) {
    return (
      <View>
        <Text>경로 데이터가 없습니다</Text>
      </View>
    );
  }

  return <View ref={containerRef} style={{flex: 1}} />;
}
