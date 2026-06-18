/**
 * 웹 전용: react-native-linear-gradient 미지원
 * CSS linear-gradient 인라인 스타일로 대체
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import {colors, typography, spacing} from '@theme/index';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  const gradientStyle =
    variant === 'primary'
      ? {background: `linear-gradient(90deg, ${colors.gradient.button[0]}, ${colors.gradient.button[1]})`}
      : variant === 'accent'
      ? {background: `linear-gradient(90deg, ${colors.gradient.accent[0]}, ${colors.gradient.accent[1]})`}
      : {};

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.75}
        style={[
          styles.base,
          styles.outlineBase,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
        ]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={[styles.text, styles.outlineText]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[styles.base, fullWidth && styles.fullWidth, isDisabled && styles.disabled]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={[styles.text, styles.ghostText]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  // primary / accent — CSS gradient
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.base, fullWidth && styles.fullWidth, isDisabled && styles.disabled]}>
      <View style={[styles.gradientFill, gradientStyle as any]}>
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Text style={[styles.text, variant === 'accent' ? styles.accentText : styles.primaryText]}>
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fullWidth: {alignSelf: 'stretch'},
  gradientFill: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  outlineBase: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {opacity: 0.45},
  text: {...typography.button},
  primaryText: {color: colors.text.inverse},
  accentText: {color: '#1A1200'},
  outlineText: {color: colors.primary},
  ghostText: {color: colors.primary},
});
