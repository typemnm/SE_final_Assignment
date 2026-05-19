import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {colors, typography, spacing} from '@theme/index';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
}

export const Button = ({title, onPress, variant = 'primary', loading = false, disabled = false}: ButtonProps) => {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.text.inverse} />
      ) : (
        <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {backgroundColor: colors.primary},
  secondary: {backgroundColor: colors.secondary},
  outline: {backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary},
  disabled: {opacity: 0.5},
  text: {...typography.button, color: colors.text.inverse},
  outlineText: {color: colors.primary},
});
