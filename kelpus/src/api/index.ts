// API 클라이언트 재내보내기 (기존 파일 하위 호환성 유지)
// auth.api, diet.api, health.api, running.api, sns.api 는 './index'에서 apiClient를 직접 import
export {apiClient} from './client';

// 구독 API 내보내기 (subscription.api는 './client'에서 직접 import하므로 순환 의존 없음)
export * from './subscription.api';
