// 네이티브 패키지 타입 선언 (실제 설치 전 TypeScript 오류 방지)
// 실제 앱 빌드 시에는 각 패키지를 설치해야 합니다:
//   npm install react-native-keychain react-native-google-signin
//   npm install @invertase/react-native-apple-authentication @react-native-kakao/user

declare module 'react-native-keychain' {
  interface Options {
    service?: string;
    accessGroup?: string;
    accessible?: string;
  }
  interface Credentials {
    username: string;
    password: string;
    service: string;
  }
  const Keychain: {
    setGenericPassword(username: string, password: string, options?: Options): Promise<boolean>;
    getGenericPassword(options?: Options): Promise<Credentials | false>;
    resetGenericPassword(options?: Options): Promise<boolean>;
  };
  export default Keychain;
  export const setGenericPassword: typeof Keychain.setGenericPassword;
  export const getGenericPassword: typeof Keychain.getGenericPassword;
  export const resetGenericPassword: typeof Keychain.resetGenericPassword;
}

declare module 'react-native-google-signin' {
  interface UserInfo {
    idToken: string | null;
    user: {id: string; email: string; name: string | null; photo: string | null};
  }
  interface HasPlayServicesOptions {
    showPlayServicesUpdateDialog?: boolean;
  }
  export const GoogleSignin: {
    configure(options?: {webClientId?: string; offlineAccess?: boolean}): void;
    hasPlayServices(options?: HasPlayServicesOptions): Promise<boolean>;
    signIn(): Promise<UserInfo & {data?: UserInfo}>;
    signOut(): Promise<null>;
    isSignedIn(): Promise<boolean>;
    getCurrentUser(): UserInfo | null;
    revokeAccess(): Promise<null>;
  };
  export const statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
    SIGN_IN_REQUIRED: string;
  };
}

declare module '@invertase/react-native-apple-authentication' {
  export enum AppleAuthRequestOperation {
    LOGIN = 1,
    REFRESH = 2,
    LOGOUT = 3,
    IMPLICIT = 4,
  }
  export enum AppleAuthRequestScope {
    EMAIL = 0,
    FULL_NAME = 1,
  }
  export enum AppleAuthCredentialState {
    REVOKED = 1,
    AUTHORIZED = 2,
    NOT_FOUND = 3,
    TRANSFERRED = 4,
  }
  interface AppleRequestResponse {
    identityToken: string | null;
    email: string | null;
    fullName: {givenName?: string | null; familyName?: string | null} | null;
    user: string;
  }
  interface AppleRequestOptions {
    requestedOperation: AppleAuthRequestOperation;
    requestedScopes?: AppleAuthRequestScope[];
  }
  const appleAuth: {
    performRequest(options: AppleRequestOptions): Promise<AppleRequestResponse>;
    getCredentialStateForUser(user: string): Promise<AppleAuthCredentialState>;
    isSupported: boolean;
  };
  export default appleAuth;
}

declare module '@react-native-kakao/user' {
  interface KakaoToken {
    accessToken: string;
    refreshToken?: string;
  }
  const KakaoUser: {
    login(): Promise<KakaoToken>;
    logout(): Promise<void>;
    unlink(): Promise<void>;
    getProfile(): Promise<unknown>;
  };
  export default KakaoUser;
}
