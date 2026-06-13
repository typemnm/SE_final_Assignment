import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {spacing, typography} from '@theme/index';

interface SocialLoginButtonProps {
  provider: 'kakao' | 'google' | 'apple';
  onPress: () => void;
  disabled?: boolean;
}

const providerConfig = {
  kakao: {label: '카카오로 로그인', backgroundColor: '#FEE500', textColor: '#000000'},
  google: {label: 'Google로 로그인', backgroundColor: '#FFFFFF', textColor: '#000000'},
  apple: {label: 'Apple로 로그인', backgroundColor: '#000000', textColor: '#FFFFFF'},
};

export const SocialLoginButton = ({provider, onPress, disabled}: SocialLoginButtonProps) => {
  const config = providerConfig[provider];
  return (
    <TouchableOpacity
      style={[styles.button, {backgroundColor: config.backgroundColor}, disabled && styles.disabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}>
      <Text style={[styles.text, {color: config.textColor}]}>{config.label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {padding: spacing.md, borderRadius: 8, alignItems: 'center', marginBottom: spacing.sm},
  text: {...typography.button},
  disabled: {opacity: 0.4},
});
