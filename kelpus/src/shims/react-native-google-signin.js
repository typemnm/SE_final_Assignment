// Web stub — Google Sign-In requires native SDK on iOS/Android
export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => {
    throw new Error('Google Sign-In은 웹에서 지원되지 않습니다.');
  },
  signOut: async () => {},
  isSignedIn: async () => false,
  getCurrentUser: () => null,
  revokeAccess: async () => {},
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};
