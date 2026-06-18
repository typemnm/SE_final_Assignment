import {StyleSheet} from 'react-native';

/**
 * 폰트 패밀리
 * - 설치 필요: npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/space-grotesk
 *   또는 react-native-google-fonts 패키지 사용
 * - 설치 전까지는 시스템 폰트로 fallback (iOS: SF Pro, Android: Roboto)
 */
export const fonts = {
  /** 본문·UI 전반 — Plus Jakarta Sans (현대적, 스포티) */
  sans: 'PlusJakartaSans',
  /** 제목·큰 숫자 — Space Grotesk (독특한 개성, 숫자 가독성 우수) */
  grotesk: 'SpaceGrotesk',
};

export const typography = StyleSheet.create({
  h1: {fontFamily: fonts.grotesk, fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.5},
  h2: {fontFamily: fonts.grotesk, fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.3},
  h3: {fontFamily: fonts.sans,    fontSize: 20, fontWeight: '600', lineHeight: 28},
  body1: {fontFamily: fonts.sans, fontSize: 16, fontWeight: '400', lineHeight: 24},
  body2: {fontFamily: fonts.sans, fontSize: 14, fontWeight: '400', lineHeight: 20},
  caption: {fontFamily: fonts.sans, fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.3},
  button: {fontFamily: fonts.sans, fontSize: 15, fontWeight: '600', lineHeight: 22, letterSpacing: 0.3},
  /** 거리·칼로리 등 큰 통계 숫자 전용 */
  stat: {fontFamily: fonts.grotesk, fontSize: 48, fontWeight: '700', lineHeight: 56, letterSpacing: -1},
  statSm: {fontFamily: fonts.grotesk, fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.5},
});
