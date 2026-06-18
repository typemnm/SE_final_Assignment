import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {MyPageStackParamList} from './types';
import {ProfileScreen} from '@features/profile/screens/ProfileScreen';
import {ProfileEditScreen} from '@features/profile/screens/ProfileEditScreen';
import {StatisticsScreen} from '@features/profile/screens/StatisticsScreen';
import {SettingsScreen} from '@features/profile/screens/SettingsScreen';
import {useThemeContext} from '@theme/ThemeContext';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

export const MyPageNavigator = () => {
  const {tc} = useThemeContext();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: tc.headerBg},
        headerTintColor: tc.emerald,
        headerTitleStyle: {fontWeight: '700', color: tc.textPri},
        headerTitleAlign: 'center',
      }}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{title: '프로필 수정'}} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} options={{title: '내 기록 통계'}} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{title: '설정'}} />
    </Stack.Navigator>
  );
};
