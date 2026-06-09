import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {MainTabParamList} from './types';
import {DietNavigator} from './DietNavigator';
import {RunningScreen} from '@features/running/screens/RunningScreen';
import {FeedScreen} from '@features/sns/screens/FeedScreen';
import {MyPageNavigator} from './MyPageNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}>
      <Tab.Screen name="Diet" component={DietNavigator} options={{tabBarLabel: '식단'}} />
      <Tab.Screen name="Running" component={RunningScreen} options={{tabBarLabel: '러닝'}} />
      <Tab.Screen name="Feed" component={FeedScreen} options={{tabBarLabel: 'SNS'}} />
      <Tab.Screen name="MyPage" component={MyPageNavigator} options={{tabBarLabel: '마이페이지'}} />
    </Tab.Navigator>
  );
};
