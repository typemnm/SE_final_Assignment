// Web stub — Kakao Sign-In requires native SDK on iOS/Android
const KakaoUser = {
  login: async () => {
    throw new Error('카카오 로그인은 웹에서 지원되지 않습니다.');
  },
  logout: async () => {},
  unlink: async () => {},
  getProfile: async () => null,
};

export default KakaoUser;
