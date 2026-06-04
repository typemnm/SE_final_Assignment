// Web stub — Apple Sign-In requires native SDK on iOS
const appleAuth = {
  performRequest: async () => {
    throw new Error('Apple Sign-In은 웹에서 지원되지 않습니다.');
  },
  getCredentialStateForUser: async () => AppleAuthCredentialState.NOT_FOUND,
  onCredentialRevoked: () => () => {},
  isSupported: false,
};

export const AppleAuthRequestOperation = {
  LOGIN: 1,
  REFRESH: 2,
  LOGOUT: 3,
  IMPLICIT: 4,
};

export const AppleAuthRequestScope = {
  EMAIL: 0,
  FULL_NAME: 1,
};

export const AppleAuthCredentialState = {
  REVOKED: 1,
  AUTHORIZED: 2,
  NOT_FOUND: 3,
  TRANSFERRED: 4,
};

export default appleAuth;
