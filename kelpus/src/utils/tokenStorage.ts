import Keychain from 'react-native-keychain';

const ACCESS_TOKEN_SERVICE = 'kelpus_access_token';
const REFRESH_TOKEN_SERVICE = 'kelpus_refresh_token';

type KeychainResult = {username: string; password: string; service: string} | false;

export const saveTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  await Promise.all([
    Keychain.setGenericPassword('token', accessToken, {service: ACCESS_TOKEN_SERVICE}),
    Keychain.setGenericPassword('token', refreshToken, {service: REFRESH_TOKEN_SERVICE}),
  ]);
};

export const updateAccessToken = async (accessToken: string): Promise<void> => {
  await Keychain.setGenericPassword('token', accessToken, {service: ACCESS_TOKEN_SERVICE});
};

export const getAccessToken = async (): Promise<string | null> => {
  const result = (await Keychain.getGenericPassword({service: ACCESS_TOKEN_SERVICE})) as KeychainResult;
  return result ? result.password : null;
};

export const getRefreshToken = async (): Promise<string | null> => {
  const result = (await Keychain.getGenericPassword({service: REFRESH_TOKEN_SERVICE})) as KeychainResult;
  return result ? result.password : null;
};

export const clearTokens = async (): Promise<void> => {
  await Promise.all([
    Keychain.resetGenericPassword({service: ACCESS_TOKEN_SERVICE}),
    Keychain.resetGenericPassword({service: REFRESH_TOKEN_SERVICE}),
  ]);
};
