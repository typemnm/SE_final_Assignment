import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {MyPageStackParamList} from './types';
import {ProfileScreen} from '@features/profile/screens/ProfileScreen';
import {ProfileEditScreen} from '@features/profile/screens/ProfileEditScreen';
import {StatisticsScreen} from '@features/profile/screens/StatisticsScreen';
import {colors} from '@theme/index';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

export const MyPageNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerTintColor: colors.primary,
        headerStyle: {backgroundColor: colors.background},
        headerTitleStyle: {color: colors.text.primary},
      }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{title: '마이페이지'}} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{title: '프로필 수정'}} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} options={{title: '내 기록 통계'}} />
    </Stack.Navigator>
  );
};
