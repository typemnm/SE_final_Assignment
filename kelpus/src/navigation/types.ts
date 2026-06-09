import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Diet: NavigatorScreenParams<DietStackParamList> | undefined;
  Running: undefined;
  Feed: undefined;
  MyPage: undefined;
};

export type DietStackParamList = {
  DietHome: undefined;
  DietAnalysis: undefined;
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
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type DietNavigationProp = NativeStackNavigationProp<DietStackParamList>;
export type MyPageNavigationProp = NativeStackNavigationProp<MyPageStackParamList>;
