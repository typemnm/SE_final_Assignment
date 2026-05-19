import {combineReducers} from '@reduxjs/toolkit';
import {authReducer} from '@features/auth/store/authSlice';
import {profileReducer} from '@features/profile/store/profileSlice';
import {subscriptionReducer} from '@features/subscription/store/subscriptionSlice';
import {dietReducer} from '@features/diet/store/dietSlice';
import {runningReducer} from '@features/running/store/runningSlice';
import {snsReducer} from '@features/sns/store/snsSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  subscription: subscriptionReducer,
  diet: dietReducer,
  running: runningReducer,
  sns: snsReducer,
});
