import React, {useState} from 'react';
import {TextInput, View, Text, StyleSheet} from 'react-native';
import {colors, typography, spacing} from '@theme/index';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
}

export const Input = ({label, value, onChangeText, placeholder, secureTextEntry = false, error, keyboardType = 'default'}: InputProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.focused, error && styles.error]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginBottom: spacing.md},
  label: {...typography.body2, color: colors.text.secondary, marginBottom: spacing.xs},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  focused: {borderColor: colors.primary},
  error: {borderColor: colors.error},
  errorText: {...typography.caption, color: colors.error, marginTop: spacing.xs},
});
