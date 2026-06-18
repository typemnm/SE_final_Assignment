# Kelpus

헬스 데이터 동기화, AI 식단 분석, 러닝 기록 관리, SNS 연동을 통합한 건강 관리 모바일 앱입니다.

[![CI](https://github.com/<org>/SE_final_Assignment/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/SE_final_Assignment/actions)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 인증 | 이메일 로그인 + 카카오·구글·애플 소셜 로그인 |
| AI 식단 분석 | Samsung Health / Apple HealthKit 식단 동기화 후 AI 맞춤 분석 |
| 러닝 관리 | 러닝 기록 조회, GPS 경로 지도 시각화, 리더보드 |
| SNS 피드 | #kelpus 해시태그 게시물 피드 |
| 마이페이지 | 프로필 관리, 기간별 통계, 구독 플랜 관리 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React Native 0.75 |
| 언어 | TypeScript (strict) |
| 상태 관리 | Redux Toolkit |
| 네비게이션 | React Navigation 6 |
| HTTP 클라이언트 | Axios |
| 지도 | react-native-maps |
| 헬스 연동 | react-native-health (HealthKit / Samsung Health) |
| 차트 | react-native-chart-kit |
| 로컬 저장소 | AsyncStorage |

---

## 빠른 시작

### 요구사항

- Node.js 20.x
- Watchman (macOS: `brew install watchman`)
- Xcode 15+ (iOS)
- Android Studio + JDK 17 (Android)

### 설치 및 실행

```bash
# 1. 이 디렉토리로 이동
cd kelpus

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력

# 4. iOS CocoaPods 설치 (Mac 전용)
cd ios && pod install && cd ..

# 5. Metro 번들러 시작
npm start

# 6-A. iOS 실행
npm run ios

# 6-B. Android 실행
npm run android
```

---

## 프로젝트 구조

```
src/
├── api/              # Axios API 클라이언트
│   ├── index.ts      # 인스턴스 (interceptor, 토큰 자동 첨부)
│   ├── auth.api.ts
│   ├── diet.api.ts
│   ├── health.api.ts
│   ├── running.api.ts
│   └── sns.api.ts
│
├── components/common/ # 공통 컴포넌트
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
│
├── features/          # 기능 모듈 (팀원별 담당)
│   ├── auth/          → 팀원 A (로그인, 회원가입)
│   ├── profile/       → 팀원 A (프로필, 통계)
│   ├── subscription/  → 팀원 A (구독, 결제)
│   ├── diet/          → 팀원 B (AI 식단 분석)
│   ├── health/        → 팀원 B (헬스 데이터 동기화)
│   ├── running/       → 팀원 C (러닝, 지도, 리더보드)
│   └── sns/           → 팀원 C (SNS 피드)
│
├── navigation/        # 앱 네비게이션 구조
│   ├── AppNavigator.tsx    # 인증 상태 분기
│   ├── AuthNavigator.tsx   # 로그인/회원가입 스택
│   └── MainTabNavigator.tsx # 하단 탭 (식단·러닝·SNS·마이페이지)
│
├── store/             # Redux store
│   ├── index.ts       # configureStore
│   └── rootReducer.ts # 전체 리듀서 조합
│
├── theme/             # 디자인 시스템
│   ├── colors.ts
│   ├── typography.ts
│   └── spacing.ts
│
├── types/             # TypeScript 타입 정의
└── utils/             # 공통 유틸리티
```

---

## 팀 구성 및 담당

| 팀원 | 담당 기능 | 요구사항 |
|------|-----------|----------|
| **팀원 A** | 인증, 마이페이지, 구독·결제 | FR-01, FR-02, FR-06 |
| **팀원 B** | AI 식단 분석, 헬스 데이터 동기화 | FR-04 |
| **팀원 C** | 러닝 관리·지도, SNS 피드 | FR-03, FR-05 |

자세한 업무 분담 → [`docs/WORK_DISTRIBUTION.md`](docs/WORK_DISTRIBUTION.md)

---

## 개발 참여

기여 방법, 브랜치 전략, 커밋 메시지 규칙, PR 규칙 →  **[`CONTRIBUTING.md`](CONTRIBUTING.md)**

---

## 사용 가능한 스크립트

```bash
npm start          # Metro 번들러 시작
npm run ios        # iOS 시뮬레이터 실행
npm run android    # Android 에뮬레이터 실행
npm test           # Jest 테스트 실행
npm run lint       # ESLint 검사
npm run type-check # TypeScript 타입 검사
npm run format     # Prettier 포매팅
```

---

## 환경변수

`.env.example`을 복사해 `.env`를 생성하고 값을 입력합니다.

| 변수 | 설명 |
|------|------|
| `API_BASE_URL` | 앱 빌드에 포함할 백엔드 서버 주소 (예: `https://kelpusapi.duckdns.org`) |
| `APP_ENV` | 환경 식별용 메타데이터. API 주소 선택에는 사용하지 않음 |
| `GOOGLE_MAPS_API_KEY` | 러닝 경로 지도 표시 |
| `AI_ANALYSIS_API_KEY` | AI 식단 분석 서버 |
| `INSTAGRAM_API_TOKEN` | SNS 피드 크롤링 |

> `.env` 파일은 `.gitignore`에 등록되어 있어 절대 커밋되지 않습니다.
> 네이티브 앱은 `react-native-config`로 `.env`를 빌드 시점에 읽습니다. 값을 바꾼 뒤에는
> Metro 재시작만 하지 말고 앱을 다시 빌드하세요. 다른 파일을 쓸 때는
> `ENVFILE=.env.production npm run android`처럼 `ENVFILE`을 지정합니다.
> `.env` 값은 앱 바이너리에서 추출할 수 있으므로 서버 비밀번호나 비밀 키는 넣지 마세요.

---

## 문서

| 문서 | 설명 |
|------|------|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 개발 환경 세팅, 워크플로우, 코드 스타일 |
| [`docs/WORK_DISTRIBUTION.md`](docs/WORK_DISTRIBUTION.md) | 3인 업무 분담 상세 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 아키텍처, 데이터 플로우, 외부 API |
