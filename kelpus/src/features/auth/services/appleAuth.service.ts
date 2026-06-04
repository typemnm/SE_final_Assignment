import appleAuth, {
  AppleAuthRequestOperation,
  AppleAuthRequestScope,
} from '@invertase/react-native-apple-authentication';

export interface AppleSignInResult {
  identityToken: string;
  email: string | null;
}

export const signInWithApple = async (): Promise<AppleSignInResult> => {
  const response = await appleAuth.performRequest({
    requestedOperation: AppleAuthRequestOperation.LOGIN,
    requestedScopes: [AppleAuthRequestScope.EMAIL, AppleAuthRequestScope.FULL_NAME],
  });

  if (!response.identityToken) throw new Error('Apple 인증 토큰을 가져오지 못했습니다.');

  return {
    identityToken: response.identityToken,
    email: response.email ?? null,
  };
};
