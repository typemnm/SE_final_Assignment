import React from 'react';
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';

enableScreens(false);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement(
        'pre',
        { style: { color: 'red', padding: 20, whiteSpace: 'pre-wrap', background: '#fff', margin: 0 } },
        '[React Error]\n' + (this.state.error ? this.state.error.stack : String(this.state.error))
      );
    }
    return this.props.children;
  }
}

const AppWithBoundary = () =>
  React.createElement(ErrorBoundary, null, React.createElement(App));

AppRegistry.registerComponent('kelpus', () => AppWithBoundary);
AppRegistry.runApplication('kelpus', {
  rootTag: document.getElementById('root'),
});
