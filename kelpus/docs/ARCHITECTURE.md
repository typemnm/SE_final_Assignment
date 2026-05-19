# 아키텍처 문서

> 프로젝트: Kelpus  
> 최종 수정일: 2026-05-19

---

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React Native | 0.75 |
| 언어 | TypeScript | 5.x |
| 상태 관리 | Redux Toolkit | 2.x |
| 네비게이션 | React Navigation | 6.x |
| HTTP 클라이언트 | Axios | 1.x |
| 테스트 | Jest + React Native Testing Library | - |
| 린터 | ESLint + Prettier | - |
| 빌드 | Metro Bundler | - |

---

## 폴더 구조

```
kelpus/
├── src/
│   ├── api/                        # API 레이어
│   │   ├── client.ts               # Axios 인스턴스 및 인터셉터
│   │   ├── auth.api.ts
│   │   ├── diet.api.ts
│   │   ├── health.api.ts
│   │   ├── running.api.ts
│   │   ├── sns.api.ts
│   │   └── subscription.api.ts
│   │
│   ├── components/
│   │   └── common/                 # 공통 UI 컴포넌트
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       ├── Loading.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── features/                   # 기능 모듈 (Feature-based 구조)
│   │   ├── auth/                   # 인증 (팀원A)
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── auth.slice.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── profile/                # 마이페이지/통계 (팀원A)
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── profile.slice.ts
│   │   │   └── profile.types.ts
│   │   │
│   │   ├── subscription/           # 구독/결제 (팀원A)
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── subscription.slice.ts
│   │   │   └── subscription.types.ts
│   │   │
│   │   ├── diet/                   # 식단분석/AI (팀원B)
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── diet.slice.ts
│   │   │   └── diet.types.ts
│   │   │
│   │   ├── health/                 # 헬스데이터 동기화 (팀원B)
│   │   │   ├── adapters/
│   │   │   │   ├── HealthAdapter.interface.ts
│   │   │   │   ├── AppleHealthAdapter.ts
│   │   │   │   └── SamsungHealthAdapter.ts
│   │   │   ├── screens/
│   │   │   ├── health.slice.ts
│   │   │   └── health.types.ts
│   │   │
│   │   ├── running/                # 러닝관리/지도 (팀원C)
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── running.slice.ts
│   │   │   └── running.types.ts
│   │   │
│   │   └── sns/                    # SNS연동/피드 (팀원C)
│   │       ├── screens/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── sns.slice.ts
│   │       └── sns.types.ts
│   │
│   ├── navigation/                 # 네비게이션 구조 (공통)
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   └── types.ts
│   │
│   ├── store/                      # Redux 스토어 (공통)
│   │   ├── index.ts
│   │   ├── rootReducer.ts
│   │   └── hooks.ts
│   │
│   ├── theme/                      # 디자인 시스템
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   │
│   └── utils/                      # 유틸리티
│       ├── storage.ts
│       ├── format.ts
│       └── validation.ts
│
├── __tests__/                      # 테스트 파일
├── android/
├── ios/
├── docs/
├── .github/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── babel.config.js
```

---

## 데이터 플로우

### 기본 흐름

```
화면(Screen)
    │
    ├─[사용자 액션]─▶ Redux Action (dispatch)
    │                      │
    │                Redux Thunk (비동기)
    │                      │
    │                API 호출 (Axios)
    │                      │
    │               서버 응답 처리
    │                      │
    │                Redux State 업데이트
    │                      │
    └─[re-render]◀── useSelector (상태 구독)
```

### 상세 예시 (식단 분석)

```
DietAnalysisScreen
    │
    ├─ dispatch(analyzeDiet(imageUri))    ← Redux Thunk action
    │
    ├─ dietApi.analyze(imageUri)          ← Axios POST /api/diet/analyze
    │       │
    │       └─ AI 분석 서버 응답
    │               { calories, nutrients, recommendations }
    │
    ├─ dispatch(setAnalysisResult(data))  ← 결과를 Redux에 저장
    │
    └─ useSelector(state => state.diet.analysisResult)  ← 화면 업데이트
```

---

## 헬스 어댑터 패턴

플랫폼(iOS/Android)에 따라 다른 헬스 SDK를 사용하지만, 앱 코드는 동일한 인터페이스로 접근합니다.

### 인터페이스 정의

```typescript
// src/features/health/adapters/HealthAdapter.interface.ts
export interface HealthData {
  steps: number;
  caloriesBurned: number;
  heartRate: number | null;
  sleepHours: number | null;
}

export interface IHealthAdapter {
  requestPermission(): Promise<boolean>;
  getTodayData(): Promise<HealthData>;
  getWeeklyData(days: number): Promise<HealthData[]>;
}
```

### 플랫폼 분기

```typescript
// src/features/health/adapters/index.ts
import { Platform } from 'react-native';
import { AppleHealthAdapter } from './AppleHealthAdapter';
import { SamsungHealthAdapter } from './SamsungHealthAdapter';
import type { IHealthAdapter } from './HealthAdapter.interface';

export const createHealthAdapter = (): IHealthAdapter => {
  if (Platform.OS === 'ios') {
    return new AppleHealthAdapter();    // Apple HealthKit
  } else {
    return new SamsungHealthAdapter(); // Samsung Health SDK
  }
};
```

---

## 구독 플랜별 기능 제한 설계

### 플랜 구조

| 기능 | 무료 | 프리미엄 | 프로 |
|------|------|---------|------|
| 식단 분석 | 하루 3회 | 무제한 | 무제한 |
| AI 추천 | ❌ | ✅ | ✅ |
| 헬스 동기화 | ❌ | ✅ | ✅ |
| 러닝 경로 저장 | 10개 | 무제한 | 무제한 |
| 리더보드 참여 | ❌ | ✅ | ✅ |
| 상세 통계 | ❌ | ✅ | ✅ |
| SNS 피드 | ✅ | ✅ | ✅ |

### 구현 방식

```typescript
// 기능 접근 시 구독 상태 확인
const { plan } = useSelector(state => state.subscription);

if (plan === 'free' && analysisCount >= 3) {
  // 업그레이드 프롬프트 표시
  navigation.navigate('SubscriptionScreen');
  return;
}
```

---

## 외부 API 연동 목록

| 서비스 | 용도 | 환경변수 | 담당 |
|--------|------|---------|------|
| Kelpus API 서버 | 메인 백엔드 | `API_BASE_URL` | 공통 |
| Google Maps API | 러닝 경로 지도 시각화 | `GOOGLE_MAPS_API_KEY` | 팀원C |
| Samsung Health SDK | Android 헬스 데이터 동기화 | - (SDK) | 팀원B |
| Apple HealthKit | iOS 헬스 데이터 동기화 | - (SDK) | 팀원B |
| AI 식단 분석 서버 | 음식 사진 분석 및 영양소 추출 | `AI_ANALYSIS_API_KEY`, `AI_ANALYSIS_BASE_URL` | 팀원B |
| Instagram API | 해시태그 기반 SNS 피드 | `INSTAGRAM_API_TOKEN` | 팀원C |

---

## API 레이어 설계

### Axios 클라이언트 설정

```typescript
// src/api/client.ts
const client = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
});

// 요청 인터셉터: 액세스 토큰 자동 첨부
client.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 토큰 만료 시 자동 갱신
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshAccessToken();
      return client.request(error.config); // 재시도
    }
    return Promise.reject(error);
  }
);
```

---

## 상태 관리 구조

```
Redux Store
├── auth        { user, token, isAuthenticated }
├── profile     { data, stats, isLoading }
├── subscription{ plan, expiresAt, isLoading }
├── diet        { records, analysisResult, dailyGoal }
├── health      { todayData, weeklyData, syncStatus }
├── running     { sessions, currentSession, leaderboard }
└── sns         { feed, following, isLoading }
```

---

## 네비게이션 구조

```
RootNavigator
├── AuthNavigator (비로그인 상태)
│   ├── LoginScreen
│   └── OnboardingScreen
│
└── MainTabNavigator (로그인 상태)
    ├── HomeTab
    │   └── HomeScreen
    ├── DietTab
    │   ├── DietScreen
    │   └── DietAnalysisScreen
    ├── RunningTab
    │   ├── RunningScreen
    │   └── RunningDetailScreen
    ├── SnsTab
    │   └── SnsScreen
    └── ProfileTab
        ├── ProfileScreen
        ├── StatsScreen
        └── SubscriptionScreen
```
