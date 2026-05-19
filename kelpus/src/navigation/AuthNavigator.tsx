import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AuthStackParamList} from './types';
import {LoginScreen} from '@features/auth/screens/LoginScreen';
import {SignUpScreen} from '@features/auth/screens/SignUpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};
