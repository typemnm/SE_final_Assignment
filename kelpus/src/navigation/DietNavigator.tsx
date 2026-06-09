import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {DietStackParamList} from './types';
import {DietScreen} from '@features/diet/screens/DietScreen';
import {DietAnalysisScreen} from '@features/diet/screens/DietAnalysisScreen';
import {colors} from '@theme/index';

const Stack = createNativeStackNavigator<DietStackParamList>();

export const DietNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="DietHome" component={DietScreen} />
      <Stack.Screen
        name="DietAnalysis"
        component={DietAnalysisScreen}
        options={{
          headerShown: true,
          title: 'AI 식단 분석 결과',
          headerTintColor: colors.text.primary,
          headerStyle: {backgroundColor: colors.background},
        }}
      />
    </Stack.Navigator>
  );
};
