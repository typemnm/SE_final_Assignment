import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import MapView, {Polyline} from 'react-native-maps';
import type {GpsPoint} from '@appTypes/health.types';
import {colors} from '@theme/index';

interface RunningMapViewProps {
  route: GpsPoint[];
}

export const RunningMapView = ({route}: RunningMapViewProps) => {
  if (!route || route.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>경로 데이터가 없습니다</Text>
      </View>
    );
  }

  const coordinates = route.map(p => ({latitude: p.latitude, longitude: p.longitude}));
  const initialRegion = {
    latitude: coordinates[0].latitude,
    longitude: coordinates[0].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      <Polyline coordinates={coordinates} strokeColor={colors.primary} strokeWidth={4} />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {height: 250, width: '100%'},
  placeholder: {height: 250, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center'},
  placeholderText: {color: colors.text.secondary},
});
