import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Button} from '@components/common/Button';
import {Input} from '@components/common/Input';
import {colors, typography, spacing} from '@theme/index';

export const SignUpScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <Input label="이름" value={name} onChangeText={setName} placeholder="이름을 입력하세요" />
      <Input label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="email@example.com" />
      <Input label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry placeholder="8자 이상" />
      <Button title="가입하기" onPress={() => {}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: spacing.xl, backgroundColor: colors.background},
  title: {...typography.h2, color: colors.text.primary, marginBottom: spacing.xl},
});
