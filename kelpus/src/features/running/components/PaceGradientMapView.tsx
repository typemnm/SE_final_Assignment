import React, {useRef, useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import MapView, {Polyline, Marker} from 'react-native-maps';
import {colors} from '@theme/index';
import {buildPaceSegments} from '../utils';

type RoutePoint = {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  altitude?: number;
  timestamp: string;
};

interface PaceGradientMapViewProps {
  route: RoutePoint[];
  avgPace: number;
  height?: number;
}

export const PaceGradientMapView = ({
  route,
  avgPace,
  height = 280,
}: PaceGradientMapViewProps) => {
  const mapRef = useRef<MapView>(null);

  const getCoord = (p: RoutePoint) => ({
    latitude: p.latitude ?? p.lat ?? 0,
    longitude: p.longitude ?? p.lng ?? 0,
  });

  const coords = route.map(getCoord).filter(c => c.latitude !== 0 || c.longitude !== 0);
  const segments = buildPaceSegments(route, avgPace);

  useEffect(() => {
    if (coords.length > 0 && mapRef.current) {
      const lats = coords.map(c => c.latitude);
      const lngs = coords.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const pad = 0.002;
      mapRef.current.animateToRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: maxLat - minLat + pad,
        longitudeDelta: maxLng - minLng + pad,
      }, 300);
    }
  }, [coords.length]);

  if (coords.length === 0) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <Text style={styles.placeholderText}>경로 데이터가 없습니다</Text>
      </View>
    );
  }

  const initialRegion = coords.length > 0 ? {
    latitude: coords[Math.floor(coords.length / 2)].latitude,
    longitude: coords[Math.floor(coords.length / 2)].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  return (
    <View>
      <MapView
        ref={mapRef}
        style={[styles.map, {height}]}
        initialRegion={initialRegion}>
        {segments.map((seg, i) => (
          <Polyline
            key={i}
            coordinates={seg.coordinates}
            strokeColor={seg.color}
            strokeWidth={5}
          />
        ))}
        {coords.length > 0 && (
          <>
            <Marker coordinate={coords[0]} pinColor="#4CAF50" title="출발" />
            <Marker coordinate={coords[coords.length - 1]} pinColor="#F44336" title="도착" />
          </>
        )}
      </MapView>
      <PaceLegend />
    </View>
  );
};

const PaceLegend = () => (
  <View style={styles.legend}>
    {[
      {color: '#00BCD4', label: '매우 빠름'},
      {color: '#4CAF50', label: '빠름'},
      {color: '#8BC34A', label: '평균'},
      {color: '#FF9800', label: '느림'},
      {color: '#F44336', label: '매우 느림'},
    ].map(item => (
      <View key={item.label} style={styles.legendItem}>
        <View style={[styles.legendDot, {backgroundColor: item.color}]} />
        <Text style={styles.legendLabel}>{item.label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  map: {width: '100%'},
  placeholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {color: '#757575', fontSize: 14},
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4},
  legendDot: {width: 10, height: 10, borderRadius: 5, marginRight: 4},
  legendLabel: {fontSize: 11, color: '#616161'},
});
