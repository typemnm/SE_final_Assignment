import React from 'react';
import {TouchableOpacity, Text} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {MyPageStackParamList} from './types';
import {ProfileScreen} from '@features/profile/screens/ProfileScreen';
import {ProfileEditScreen} from '@features/profile/screens/ProfileEditScreen';
import {StatisticsScreen} from '@features/profile/screens/StatisticsScreen';
import {SettingsScreen} from '@features/profile/screens/SettingsScreen';
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
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={({navigation}) => ({
          title: '마이페이지',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{marginRight: 4}}>
              <Text style={{color: colors.primary, fontSize: 14, fontWeight: '600'}}>설정</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{title: '프로필 수정'}} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} options={{title: '내 기록 통계'}} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{title: '설정'}} />
    </Stack.Navigator>
  );
};
