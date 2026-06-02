import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AppDispatch, RootState} from '@store/index';
import {initAuthThunk} from '@features/auth/store/authSlice';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {AuthNavigator} from './AuthNavigator';
import {MainTabNavigator} from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {isAuthenticated, isInitialized} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(initAuthThunk());
  }, [dispatch]);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
