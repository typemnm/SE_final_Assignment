import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../hooks/useAuth';
import {Button} from '@components/common/Button';
import {Input} from '@components/common/Input';
import {SocialLoginButton} from '../components/SocialLoginButton';
import {colors, typography, spacing} from '@theme/index';
import {isValidEmail, isValidPassword} from '@utils/validation';
import type {AuthNavigationProp} from '@navigation/types';
import type {SocialProvider} from '@appTypes/auth.types';
import {configureGoogleSignIn, signInWithGoogle} from '../services/googleAuth.service';
import {signInWithApple} from '../services/appleAuth.service';
import {signInWithKakao} from '../services/kakaoAuth.service';

export const LoginScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const {login, socialLogin, loading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [loginError, setLoginError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: {email?: string; password?: string} = {};
    if (!isValidEmail(email)) newErrors.email = '올바른 이메일을 입력하세요.';
    if (!isValidPassword(password)) newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoginError(null);
    try {
      await login({email, password}).unwrap();
    } catch (err: unknown) {
      setLoginError(typeof err === 'string' ? err : '로그인에 실패했습니다. 다시 시도해주세요.');
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kelpus</Text>
      <Text style={styles.subtitle}>건강한 라이프스타일을 시작하세요</Text>
      <Input
        label="이메일"
        value={email}
        onChangeText={text => { setEmail(text); setLoginError(null); }}
        keyboardType="email-address"
        error={errors.email}
        placeholder="email@example.com"
      />
      <Input
        label="비밀번호"
        value={password}
        onChangeText={text => { setPassword(text); setLoginError(null); }}
        secureTextEntry
        error={errors.password}
        placeholder="8자 이상 입력"
      />
      {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
      <Button title="로그인" onPress={handleLogin} loading={loading} />
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.divider} />
      </View>
      <SocialLoginButton provider="kakao" onPress={() => handleSocialLogin('kakao')} />
      <SocialLoginButton provider="google" onPress={() => handleSocialLogin('google')} />
      <SocialLoginButton provider="apple" onPress={() => handleSocialLogin('apple')} />
      <View style={styles.signUpRow}>
        <Text style={styles.signUpText}>계정이 없으신가요? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpLink}>회원가입</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: spacing.xl, backgroundColor: colors.background, justifyContent: 'center'},
  title: {...typography.h1, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs},
  subtitle: {...typography.body1, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xl},
  dividerRow: {flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md},
  divider: {flex: 1, height: 1, backgroundColor: colors.border ?? '#E0E0E0'},
  dividerText: {...typography.body2, color: colors.text.secondary, marginHorizontal: spacing.sm},
  signUpRow: {flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md},
  signUpText: {...typography.body2, color: colors.text.secondary},
  signUpLink: {...typography.body2, color: colors.primary, fontWeight: '600'},
  loginError: {...typography.body2, color: colors.error ?? '#D32F2F', textAlign: 'center', marginBottom: spacing.sm},
});
