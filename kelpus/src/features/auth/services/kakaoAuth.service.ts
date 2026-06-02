import KakaoUser from '@react-native-kakao/user';

export interface KakaoSignInResult {
  accessToken: string;
}

export const signInWithKakao = async (): Promise<KakaoSignInResult> => {
  const token = await KakaoUser.login();
  const accessToken: string | undefined =
    (token as {accessToken?: string}).accessToken;
  if (!accessToken) throw new Error('카카오 액세스 토큰을 가져오지 못했습니다.');
  return {accessToken};
};

export const signOutKakao = async (): Promise<void> => {
  await KakaoUser.logout();
};
