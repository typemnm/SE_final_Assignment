import React, {Component, ErrorInfo, ReactNode} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Button} from './Button';
import {colors, typography, spacing} from '@theme/index';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError(error: Error): State {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View style={styles.container}>
          <Text style={styles.title}>오류가 발생했습니다</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Button title="다시 시도" onPress={() => this.setState({hasError: false})} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  title: {...typography.h3, color: colors.error, marginBottom: spacing.md},
  message: {...typography.body2, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg},
});
