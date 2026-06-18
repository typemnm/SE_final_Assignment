/**
 * Web-only: react-native-linear-gradient / react-native-vector-icons not supported on web.
 * CSS linear-gradient via inline style, text-based icons.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../hooks/useAuth';
import {SocialLoginButton} from '../components/SocialLoginButton';
import {colors} from '@theme/index';
import {isValidEmail, isValidPassword} from '@utils/validation';
import type {AuthNavigationProp} from '@navigation/types';
import type {SocialProvider} from '@appTypes/auth.types';
import {configureGoogleSignIn, signInWithGoogle} from '../services/googleAuth.service';
import {signInWithApple} from '../services/appleAuth.service';
import {signInWithKakao} from '../services/kakaoAuth.service';

const INPUT_BG = 'rgba(15, 36, 25, 0.4)';
const INPUT_BORDER = 'rgba(45, 74, 60, 0.3)';
const INPUT_BORDER_FOCUS = '#34D399';
const CARD_BG = 'rgba(15, 36, 25, 0.65)';
const CARD_BORDER_TOP = 'rgba(45, 74, 60, 0.5)';
const CARD_BORDER_SIDE = 'rgba(45, 74, 60, 0.25)';
const DIVIDER_COLOR = 'rgba(45, 74, 60, 0.4)';

// Simple text icons (no native library)
const WEB_ICONS: Record<string, string> = {
  email: '✉',
  lock: '⚿',
  visibility: '◉',
  'visibility-off': '○',
  check: '✓',
};

// ─────────────────────────────────────────────────────────
// GlassInput (web)
// ─────────────────────────────────────────────────────────
interface GlassInputProps {
  iconName: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  error?: string;
  rightIconName?: string;
  onRightIconPress?: () => void;
}

const GlassInput = ({
  iconName,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  rightIconName,
  onRightIconPress,
}: GlassInputProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={gi.container}>
      <View style={[gi.wrap, focused && gi.wrapFocused, !!error && gi.wrapError]}>
        <Text style={[gi.leftIcon, {color: focused ? INPUT_BORDER_FOCUS : '#5A7A6A'}]}>
          {WEB_ICONS[iconName] ?? '·'}
        </Text>
        <TextInput
          style={gi.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#4B6358"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIconName && (
          <TouchableOpacity onPress={onRightIconPress} style={gi.rightIcon}>
            <Text style={gi.rightIconText}>{WEB_ICONS[rightIconName] ?? '·'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={gi.error}>{error}</Text> : null}
    </View>
  );
};

const gi = StyleSheet.create({
  container: {marginBottom: 12},
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    minHeight: 52,
  },
  wrapFocused: {
    borderColor: INPUT_BORDER_FOCUS,
    backgroundColor: 'rgba(52, 211, 153, 0.04)',
  },
  wrapError: {borderColor: colors.error},
  leftIcon: {fontSize: 16, paddingHorizontal: 14},
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 8,
  },
  rightIcon: {paddingHorizontal: 14},
  rightIconText: {fontSize: 16, color: '#5A7A6A'},
  error: {color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4},
});

// ─────────────────────────────────────────────────────────
// LoginScreen (web)
// ─────────────────────────────────────────────────────────
export const LoginScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const {login, socialLogin, loading} = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validate = (): boolean => {
    const newErrors: {email?: string; password?: string} = {};
    if (!isValidEmail(email)) newErrors.email = '올바른 이메일을 입력하세요.';
    if (!isValidPassword(password)) newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login({email, password});
    } catch {
      Alert.alert('오류', '로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      let idToken: string;
      if (provider === 'google') {
        configureGoogleSignIn();
        const result = await signInWithGoogle();
        idToken = result.idToken;
      } else if (provider === 'apple') {
        const result = await signInWithApple();
        idToken = result.identityToken;
      } else {
        const result = await signInWithKakao();
        idToken = result.accessToken;
      }
      await socialLogin({provider, id_token: idToken});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '소셜 로그인에 실패했습니다.';
      Alert.alert('로그인 오류', message);
    }
  };

  return (
    <View style={[s.bg, {background: 'linear-gradient(to bottom, #03170E, #0A1F15)'} as any]}>
      {/* Decorative orbs */}
      <View style={s.topOrb} />
      <View style={s.bottomOrb} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <View style={s.logoBox}>
            <Text style={s.logoLetter}>K</Text>
          </View>
          <Text style={s.appName}>KELPUS</Text>
          <Text style={s.tagline}>새벽 숲의 상쾌함을 담은 헬스케어</Text>
        </View>

        {/* ── Glass form card ── */}
        <View style={s.card}>
          <GlassInput
            iconName="email"
            value={email}
            onChangeText={setEmail}
            placeholder="이메일"
            keyboardType="email-address"
            error={errors.email}
          />
          <GlassInput
            iconName="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호 (8자 이상)"
            secureTextEntry={!showPassword}
            error={errors.password}
            rightIconName={showPassword ? 'visibility-off' : 'visibility'}
            onRightIconPress={() => setShowPassword(v => !v)}
          />

          <View style={s.optionRow}>
            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setRememberMe(v => !v)}
              activeOpacity={0.7}>
              <View style={[s.checkbox, rememberMe && s.checkboxActive]}>
                {rememberMe && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.checkLabel}>로그인 유지</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.forgotLink}>비밀번호 찾기</Text>
            </TouchableOpacity>
          </View>

          {/* Login button — CSS gradient */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            style={[s.loginBtn, loading && s.loginBtnDisabled]}>
            <View
              style={[
                s.loginBtnGradient,
                {background: 'linear-gradient(135deg, #18A479, #5AF0B3)'} as any,
              ]}>
              <Text style={s.loginBtnText}>
                {loading ? '로그인 중...' : '로그인'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Divider ── */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>또는 소셜 계정으로 로그인</Text>
          <View style={s.dividerLine} />
        </View>

        <SocialLoginButton provider="kakao" onPress={() => handleSocialLogin('kakao')} />
        <SocialLoginButton provider="google" onPress={() => handleSocialLogin('google')} />
        <SocialLoginButton provider="apple" onPress={() => handleSocialLogin('apple')} />

        <View style={s.signUpRow}>
          <Text style={s.signUpText}>아직 계정이 없으신가요? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
            <Text style={s.signUpLink}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  bg: {flex: 1, backgroundColor: '#03170E'},

  topOrb: {
    position: 'absolute',
    top: -180,
    alignSelf: 'center',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(52, 211, 153, 0.13)',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
    justifyContent: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },

  logoSection: {alignItems: 'center', marginBottom: 32},
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoLetter: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 34,
    fontWeight: '700',
    color: '#5AF0B3',
  },
  appName: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 7,
    color: '#5AF0B3',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: '#A7C4B5',
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER_TOP,
    borderLeftWidth: 1,
    borderLeftColor: CARD_BORDER_SIDE,
    borderRightWidth: 1,
    borderRightColor: CARD_BORDER_SIDE,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER_SIDE,
    padding: 24,
    marginBottom: 20,
  },

  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checkRow: {flexDirection: 'row', alignItems: 'center'},
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {backgroundColor: '#34D399', borderColor: '#34D399'},
  checkMark: {fontSize: 11, color: '#03170E', fontWeight: '700'},
  checkLabel: {color: '#A7C4B5', fontSize: 13},
  forgotLink: {color: '#34D399', fontSize: 13, fontWeight: '500'},

  loginBtn: {borderRadius: 14, overflow: 'hidden'},
  loginBtnDisabled: {opacity: 0.55},
  loginBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18A479',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#003825',
    letterSpacing: 0.5,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: DIVIDER_COLOR},
  dividerText: {
    color: '#4B6358',
    fontSize: 12,
    marginHorizontal: 12,
    letterSpacing: 0.3,
  },

  signUpRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 24},
  signUpText: {color: '#A7C4B5', fontSize: 14},
  signUpLink: {color: '#34D399', fontSize: 14, fontWeight: '600'},
});
