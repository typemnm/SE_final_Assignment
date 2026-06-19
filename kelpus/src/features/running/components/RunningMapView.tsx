import React, {useRef, useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {
  NaverMapView as NaverMapViewRaw,
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  type NaverMapViewProps,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import {colors} from '@theme/index';

const NaverMapView = NaverMapViewRaw as unknown as React.ComponentType<
  NaverMapViewProps & {ref?: React.Ref<NaverMapViewRef>}
>;

const SEOUL = {latitude: 37.5665, longitude: 126.978, zoom: 14, tilt: 0, bearing: 0};

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
  const mapRef = useRef<NaverMapViewRef>(null);

  useEffect(() => {
    if (isLive && currentPosition && mapRef.current) {
      mapRef.current.animateCameraTo({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        zoom: 17,
        duration: 300,
      });
    }
  }, [currentPosition, isLive]);

  const hasRoute = route.length > 0;
  const anchor = currentPosition ?? (hasRoute ? route[route.length - 1] : null);

  if (!isLive && !hasRoute) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <Text style={styles.placeholderText}>경로 데이터가 없습니다</Text>
      </View>
    );
  }

  const initialCamera = anchor
    ? {latitude: anchor.latitude, longitude: anchor.longitude, zoom: isLive ? 17 : 14, tilt: 0, bearing: 0}
    : SEOUL;

  return (
    <NaverMapView
      ref={mapRef}
      style={[styles.map, {height}]}
      initialCamera={initialCamera}
      isShowLocationButton={false}
      isShowCompass={false}
      isShowScaleBar={false}
      isScrollGesturesEnabled>

      {hasRoute && route.length >= 2 && (
        <NaverMapPathOverlay
          coords={route}
          width={5}
          color={colors.primary}
          outlineWidth={1}
          outlineColor="rgba(255,255,255,0.4)"
        />
      )}

      {!isLive && hasRoute && (
        <NaverMapMarkerOverlay
          latitude={route[0].latitude}
          longitude={route[0].longitude}
          caption={{text: '출발', textSize: 12}}
        />
      )}
      {!isLive && hasRoute && route.length >= 2 && (
        <NaverMapMarkerOverlay
          latitude={route[route.length - 1].latitude}
          longitude={route[route.length - 1].longitude}
          caption={{text: '도착', textSize: 12}}
        />
      )}
    </NaverMapView>
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
