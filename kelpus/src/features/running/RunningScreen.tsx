import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RunningStackParams} from './types';
import {RunningListScreen} from './screens/RunningListScreen';
import {RunningTrackerScreen} from './screens/RunningTrackerScreen';
import {RunningDetailScreen} from './screens/RunningDetailScreen';
import {LeaderboardScreen} from './screens/LeaderboardScreen';
import {RunningCoursesScreen} from './screens/RunningCoursesScreen';
import {colors} from '@theme/index';

const Stack = createNativeStackNavigator<RunningStackParams>();

export const RunningScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.text.primary,
        headerTitleStyle: {fontWeight: '700'},
      }}>
      <Stack.Screen
        name="RunningList"
        component={RunningListScreen}
        options={{title: '러닝'}}
      />
      <Stack.Screen
        name="RunningTracker"
        component={RunningTrackerScreen}
        options={{title: '러닝 시작', headerBackTitle: '취소'}}
      />
      <Stack.Screen
        name="RunningDetail"
        component={RunningDetailScreen}
        options={{title: '러닝 상세'}}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{title: '리더보드'}}
      />
      <Stack.Screen
        name="RunningCourses"
        component={RunningCoursesScreen}
        options={{title: '코스 추천'}}
      />
    </Stack.Navigator>
  );
};
