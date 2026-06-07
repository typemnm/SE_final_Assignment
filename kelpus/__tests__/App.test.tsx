import React from 'react';
import {render} from '@testing-library/react-native';
import App from '../App';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaInsetsContext: jest.requireActual('react').createContext({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
  useSafeAreaFrame: () => ({x: 0, y: 0, width: 390, height: 844}),
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('App', () => {
  it('renders without crashing', () => {
    const {toJSON} = render(<App />);
    expect(toJSON()).toBeTruthy();
  });
});
