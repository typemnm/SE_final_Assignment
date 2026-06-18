import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {MainTabParamList} from './types';
import {DietNavigator} from './DietNavigator';
import {RunningScreen} from '@features/running/screens/RunningScreen';
import {FeedScreen} from '@features/sns/screens/FeedScreen';
import {MyPageNavigator} from './MyPageNavigator';
import {useThemeContext} from '@theme/ThemeContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabName = keyof MainTabParamList;

const TAB_CONFIG: Record<TabName, {icon: string; label: string}> = {
  Diet:    {icon: '🥗', label: '식단'},
  Running: {icon: '🏃', label: '러닝'},
  Feed:    {icon: '💬', label: 'SNS'},
  MyPage:  {icon: '👤', label: '마이페이지'},
};

const TabIcon = ({name, focused}: {name: TabName; focused: boolean; color: string}) => (
  <View style={[s.iconWrap, focused && s.iconWrapActive]}>
    <Text style={[s.iconEmoji, !focused && s.iconEmojiDim]}>{TAB_CONFIG[name].icon}</Text>
  </View>
);

export const MainTabNavigator = () => {
  const {isDark, tc} = useThemeContext();

  const tabBarBg  = isDark ? 'rgba(10, 24, 16, 0.97)' : 'rgba(255, 255, 255, 0.82)';
  const tabBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(140, 195, 185, 0.40)';
  const activeColor   = tc.emerald;
  const inactiveColor = isDark ? 'rgba(187,202,192,0.45)' : 'rgba(70,95,85,0.42)';

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor:   activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor:  tabBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'PlusJakartaSans',
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({focused, color}) => (
          <TabIcon name={route.name as TabName} focused={focused} color={color} />
        ),
      })}>
      <Tab.Screen name="Diet"    component={DietNavigator}   options={{tabBarLabel: '식단'}}       />
      <Tab.Screen name="Running" component={RunningScreen}   options={{tabBarLabel: '러닝'}}       />
      <Tab.Screen name="Feed"    component={FeedScreen}      options={{tabBarLabel: 'SNS'}}        />
      <Tab.Screen name="MyPage"  component={MyPageNavigator} options={{tabBarLabel: '마이페이지'}} />
    </Tab.Navigator>
  );
};

const s = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
  },
  iconEmoji: {fontSize: 20},
  iconEmojiDim: {opacity: 0.45},
});
