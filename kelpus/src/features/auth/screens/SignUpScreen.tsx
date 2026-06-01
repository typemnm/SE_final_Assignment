import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../hooks/useAuth';
import {Button} from '@components/common/Button';
import {Input} from '@components/common/Input';
import {colors, typography, spacing} from '@theme/index';
import {isValidEmail, isValidPassword} from '@utils/validation';
import type {AuthNavigationProp} from '@navigation/types';

export const SignUpScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const {signUp, loading, error} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; password?: string; confirm?: string}>({});

  const validate = (): boolean => {
    const newErrors: {email?: string; password?: string; confirm?: string} = {};
    if (!isValidEmail(email)) newErrors.email = '올바른 이메일을 입력하세요.';
    if (!isValidPassword(password)) newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    if (password !== confirmPassword) newErrors.confirm = '비밀번호가 일치하지 않습니다.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    try {
      await signUp({email, password});
    } catch {
      Alert.alert('오류', error ?? '회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <Text style={styles.subtitle}>Kelpus와 함께 건강을 관리하세요</Text>
      <Input
        label="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        error={errors.email}
        placeholder="email@example.com"
      />
      <Input
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={errors.password}
        placeholder="8자 이상 입력"
      />
      <Input
        label="비밀번호 확인"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={errors.confirm}
        placeholder="비밀번호를 다시 입력하세요"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Button title="가입하기" onPress={handleSignUp} loading={loading} />
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.loginLink}>로그인</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: spacing.xl, backgroundColor: colors.background, justifyContent: 'center'},
  title: {...typography.h2, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs},
  subtitle: {...typography.body1, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xl},
  errorText: {...typography.body2, color: colors.error, textAlign: 'center', marginBottom: spacing.sm},
  loginRow: {flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md},
  loginText: {...typography.body2, color: colors.text.secondary},
  loginLink: {...typography.body2, color: colors.primary, fontWeight: '600'},
});
