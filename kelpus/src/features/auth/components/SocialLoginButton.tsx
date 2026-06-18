import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet} from 'react-native';

interface SocialLoginButtonProps {
  provider: 'kakao' | 'google' | 'apple';
  onPress: () => void;
}

const providerConfig = {
  kakao: {
    label: '카카오로 로그인',
    symbol: 'K',
    symbolBg: '#FEE500',
    symbolColor: '#3D1D00',
  },
  google: {
    label: 'Google로 로그인',
    symbol: 'G',
    symbolBg: '#FFFFFF',
    symbolColor: '#4285F4',
  },
  apple: {
    label: 'Apple로 로그인',
    symbol: '',
    symbolBg: '#F2F2F2',
    symbolColor: '#000000',
  },
};

export const SocialLoginButton = ({provider, onPress}: SocialLoginButtonProps) => {
  const config = providerConfig[provider];
  return (
    <TouchableOpacity style={s.button} onPress={onPress} activeOpacity={0.72}>
      <View style={[s.iconCircle, {backgroundColor: config.symbolBg}]}>
        <Text style={[s.iconText, {color: config.symbolColor}]}>{config.symbol}</Text>
      </View>
      <Text style={s.label}>{config.label}</Text>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 36, 25, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(45, 74, 60, 0.4)',
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    color: '#D0E8D8',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    fontFamily: 'PlusJakartaSans',
  },
  chevron: {
    color: '#4B6358',
    fontSize: 22,
    lineHeight: 24,
  },
});
