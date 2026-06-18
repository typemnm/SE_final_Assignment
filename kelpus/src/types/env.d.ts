declare const process: {
  env: {
    API_BASE_URL?: string;
    APP_ENV?: string;
    GOOGLE_WEB_CLIENT_ID?: string;
  };
};

declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    APP_ENV?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
