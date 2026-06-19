import React, {useRef, useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import MapView, {Polyline, Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors} from '@theme/index';

// 초기 위치 fallback: 서울 중심
const SEOUL_REGION = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

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

export const RunningMapView = ({
  route,
  currentPosition,
  isLive = false,
  height = 250,
}: RunningMapViewProps) => {
  const mapRef = useRef<MapView>(null);

  // GPS 좌표 업데이트 시 카메라 이동
  useEffect(() => {
    if (isLive && currentPosition && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        300,
      );
    }
  }, [currentPosition, isLive]);

  const hasRoute = route.length > 0;
  const anchor = currentPosition ?? (hasRoute ? route[route.length - 1] : null);

  // 비라이브 모드에서 경로 없으면 플레이스홀더
  if (!isLive && !hasRoute) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <Text style={styles.placeholderText}>경로 데이터가 없습니다</Text>
      </View>
    );
  }

  // 라이브 모드: 현재 위치 있으면 해당 위치, 없으면 서울 기본값으로 지도 렌더링
  const initialRegion = anchor
    ? {
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        latitudeDelta: isLive ? 0.005 : 0.01,
        longitudeDelta: isLive ? 0.005 : 0.01,
      }
    : SEOUL_REGION;

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, {height}]}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      showsUserLocation={isLive}
      showsMyLocationButton={isLive}
      followsUserLocation={false}>
      {hasRoute && (
        <Polyline
          coordinates={route}
          strokeColor={colors.primary}
          strokeWidth={4}
        />
      )}
      {currentPosition && isLive && (
        <Marker
          coordinate={currentPosition}
          pinColor={colors.primary}
          title="현재 위치"
        />
      )}
      {!isLive && hasRoute && (
        <>
          <Marker coordinate={route[0]} pinColor="#4CAF50" title="출발" />
          <Marker coordinate={route[route.length - 1]} pinColor="#F44336" title="도착" />
        </>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {width: '100%'},
  placeholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {color: '#757575', fontSize: 14},
});
