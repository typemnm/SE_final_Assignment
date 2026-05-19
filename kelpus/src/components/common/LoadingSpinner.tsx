import React from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {colors} from '@theme/index';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export const LoadingSpinner = ({size = 'large', fullScreen = false}: LoadingSpinnerProps) => (
  <View style={[styles.container, fullScreen && styles.fullScreen]}>
    <ActivityIndicator size={size} color={colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: {padding: 16, alignItems: 'center', justifyContent: 'center'},
  fullScreen: {flex: 1},
});
