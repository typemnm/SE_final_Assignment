import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  NaverMapView as NaverMapViewRaw,
  NaverMapPathOverlay,
  NaverMapMarkerOverlay,
  type NaverMapViewProps,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';

const NaverMapView = NaverMapViewRaw as unknown as React.ComponentType<
  NaverMapViewProps & {ref?: React.Ref<NaverMapViewRef>}
>;

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

const getCoord = (p: RoutePoint) => ({
  latitude: p.lat ?? p.latitude ?? 0,
  longitude: p.lng ?? p.longitude ?? 0,
});

export const AnimatedRouteMap = ({route, height = 300}: AnimatedRouteMapProps) => {
  const coords = route.map(getCoord).filter(c => c.latitude !== 0 || c.longitude !== 0);

  if (coords.length < 2) {
    return (
      <View style={[styles.noDataWrap, {height}]}>
        <Text style={styles.noDataText}>경로 데이터 없음</Text>
      </View>
    );
  }

  const mid = coords[Math.floor(coords.length / 2)];
  const initialCamera = {
    latitude: mid.latitude,
    longitude: mid.longitude,
    zoom: 15,
    tilt: 0,
    bearing: 0,
  };
  const start = coords[0];
  const end = coords[coords.length - 1];

  return (
    <View style={[styles.wrapper, {height}]}>
      <NaverMapView
        style={styles.map}
        initialCamera={initialCamera}
        isShowLocationButton={false}
        isShowCompass={false}
        isShowScaleBar={false}
        isScrollGesturesEnabled>
        <NaverMapPathOverlay
          coords={coords}
          width={5}
          color="#00C8FF"
          outlineWidth={1}
          outlineColor="rgba(255,255,255,0.3)"
        />
        <NaverMapMarkerOverlay
          latitude={start.latitude}
          longitude={start.longitude}
          caption={{text: '출발', textSize: 12}}
        />
        <NaverMapMarkerOverlay
          latitude={end.latitude}
          longitude={end.longitude}
          caption={{text: '도착', textSize: 12}}
        />
      </NaverMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    alignSelf: 'stretch',
    borderRadius: 12,
  },
  map: {flex: 1},
  noDataWrap: {
    backgroundColor: '#1a1f2e',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
  },
  noDataText: {color: '#90A4AE', fontSize: 14},
});
