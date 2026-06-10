import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Diet: undefined;
  Running: undefined;
  Feed: undefined;
  MyPage: undefined;
};

export type RunningStackParamList = {
  RunningList: undefined;
  RunningDetail: {id: string};
  Leaderboard: undefined;
};

export type MyPageStackParamList = {
  ProfileMain: undefined;
  ProfileEdit: undefined;
  Statistics: undefined;
  Settings: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type MyPageNavigationProp = NativeStackNavigationProp<MyPageStackParamList>;
