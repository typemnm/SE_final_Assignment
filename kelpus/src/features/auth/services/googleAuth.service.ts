import {GoogleSignin, statusCodes} from 'react-native-google-signin';

export const configureGoogleSignIn = (): void => {
  const webClientId = process.env.GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error('GOOGLE_WEB_CLIENT_ID is not configured');
  }
  GoogleSignin.configure({webClientId});
};

export interface GoogleSignInResult {
  idToken: string;
}

export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const userInfo = await GoogleSignin.signIn();
  // v10+ returns {type, data}, older versions return {idToken, ...} directly
  const idToken: string | null | undefined =
    (userInfo as {data?: {idToken?: string}}).data?.idToken ??
    (userInfo as {idToken?: string}).idToken;
  if (!idToken) throw new Error('Google ID 토큰을 가져오지 못했습니다.');
  return {idToken};
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (err: unknown) {
    const code = (err as {code?: string}).code;
    if (code !== statusCodes.SIGN_IN_REQUIRED) throw err;
  }
};
