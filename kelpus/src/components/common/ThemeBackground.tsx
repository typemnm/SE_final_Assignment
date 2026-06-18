import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useThemeContext} from '@theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Renders the correct background for the current theme:
 *  - Light mode → linear gradient (peach→mint→teal→sage)
 *  - Dark mode  → solid tc.bg color
 *
 * Use as the root element of every main screen instead of
 * <View style={{backgroundColor: tc.bg}}>.
 */
export const ThemeBackground = ({children, style}: Props) => {
  const {tc} = useThemeContext();

  const flat = StyleSheet.flatten(style ?? {});
  // Remove backgroundColor so it doesn't override the gradient/solid bg
  const {backgroundColor: _removed, ...layoutStyle} = flat as ViewStyle & {backgroundColor?: string};

  if (tc.bgGradient && tc.bgGradient.length >= 2) {
    return (
      <LinearGradient
        colors={tc.bgGradient}
        locations={tc.bgGradientLocations}
        start={tc.bgGradientStart ?? {x: 0, y: 0.5}}
        end={tc.bgGradientEnd   ?? {x: 1, y: 0.5}}
        style={[baseStyle.fill, layoutStyle]}>
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[baseStyle.fill, {backgroundColor: tc.bg}, layoutStyle]}>
      {children}
    </View>
  );
};

const baseStyle = StyleSheet.create({
  fill: {flex: 1},
});
