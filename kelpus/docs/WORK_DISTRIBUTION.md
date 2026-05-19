# 업무 분담 명세서

> 프로젝트: Kelpus  
> 팀 구성: 3인  
> 최종 수정일: 2026-05-19

---

## 팀 구성 및 역할 개요

| 구분 | 담당 기능 요구사항 | 담당 폴더 |
|------|-------------------|-----------|
| 팀원A | FR-01 (인증/로그인), FR-02 (마이페이지/통계), FR-06 (구독/결제) | `src/features/auth/`, `src/features/profile/`, `src/features/subscription/` |
| 팀원B | FR-04 (식단분석/AI), 헬스데이터 동기화 | `src/features/diet/`, `src/features/health/` |
| 팀원C | FR-03 (SNS연동/피드), FR-05 (러닝관리/지도) | `src/features/running/`, `src/features/sns/` |
| 팀장 (공통) | 네비게이션, 상태관리, 공통 컴포넌트, API 레이어 | `src/navigation/`, `src/store/`, `src/components/common/`, `src/api/` |

---

## 팀원A 상세 업무

### 담당 기능 요구사항
- **FR-01**: 인증 및 로그인
- **FR-02**: 마이페이지 및 통계
- **FR-06**: 구독 및 결제

### 담당 폴더
```
src/features/auth/
src/features/profile/
src/features/subscription/
```

### 주요 구현 항목

#### FR-01 인증/로그인
- [ ] 소셜 로그인 (Google, Apple, Kakao)
- [ ] JWT 액세스 토큰 및 리프레시 토큰 관리
- [ ] 자동 로그인 (토큰 갱신 로직)
- [ ] 로그아웃 및 회원 탈퇴
- [ ] 로그인 상태 Redux 슬라이스 (`authSlice`)

#### FR-02 마이페이지/통계
- [ ] 프로필 조회 및 수정 (CRUD)
- [ ] 활동 통계 대시보드 (주간/월간)
- [ ] 목표 설정 및 달성률 표시
- [ ] 알림 설정 관리

#### FR-06 구독/결제
- [ ] 구독 플랜 조회 (무료/프리미엄/프로)
- [ ] 인앱 결제 연동 (iOS: StoreKit, Android: Google Play Billing)
- [ ] 구독 상태 관리 및 만료 처리
- [ ] 결제 내역 조회

### 기술 포인트
- `react-native-google-signin`, `@invertase/react-native-apple-authentication` 사용
- 토큰 저장: `react-native-keychain` (보안 저장소)
- 인앱결제: `react-native-iap` 라이브러리

---

## 팀원B 상세 업무

### 담당 기능 요구사항
- **FR-04**: 식단 분석 및 AI 추천
- **헬스데이터 동기화**: Samsung Health / Apple HealthKit 연동

### 담당 폴더
```
src/features/diet/
src/features/health/
```

### 주요 구현 항목

#### FR-04 식단분석/AI
- [ ] 음식 사진 촬영 및 갤러리 선택
- [ ] AI 분석 API 호출 및 결과 표시
- [ ] 영양소 정보 차트 (칼로리, 단백질, 탄수화물, 지방)
- [ ] 식단 기록 저장 및 이력 조회
- [ ] 일일 영양 목표 달성률 표시
- [ ] AI 식단 추천 기능

#### 헬스데이터 동기화
- [ ] 헬스 어댑터 패턴 구현 (플랫폼 분기)
  - iOS: Apple HealthKit (`react-native-health`)
  - Android: Samsung Health SDK
- [ ] 걸음수, 소모 칼로리, 심박수 동기화
- [ ] 수면 데이터 조회
- [ ] 헬스 데이터 권한 요청 플로우

### 기술 포인트
- 헬스 어댑터 인터페이스로 플랫폼 독립적 코드 유지
- AI 분석 서버: `AI_ANALYSIS_BASE_URL` 환경변수 사용
- `react-native-vision-camera` 또는 `react-native-image-picker`

---

## 팀원C 상세 업무

### 담당 기능 요구사항
- **FR-03**: SNS 연동 및 피드
- **FR-05**: 러닝 관리 및 지도

### 담당 폴더
```
src/features/running/
src/features/sns/
```

### 주요 구현 항목

#### FR-03 SNS연동/피드
- [ ] Instagram 해시태그 기반 피드 크롤링
- [ ] 피드 목록 표시 (무한 스크롤)
- [ ] 게시물 상세 보기
- [ ] 팔로우/좋아요 상호작용
- [ ] SNS 계정 연동 설정

#### FR-05 러닝관리/지도
- [ ] GPS 기반 러닝 경로 실시간 추적
- [ ] Google Maps 연동 경로 시각화
- [ ] 러닝 기록 저장 (거리, 시간, 평균 페이스)
- [ ] 러닝 이력 목록 및 상세 보기
- [ ] 리더보드 (거리/횟수 기준 랭킹)
- [ ] 러닝 코스 추천

### 기술 포인트
- Google Maps: `react-native-maps` + `GOOGLE_MAPS_API_KEY`
- 위치 추적: `react-native-geolocation-service`
- Instagram API: `INSTAGRAM_API_TOKEN` 환경변수

---

## 공통 작업 (팀장 주도)

### 담당 폴더
```
src/navigation/
src/store/
src/components/common/
src/api/
```

### 주요 구현 항목
- [ ] React Navigation 스택/탭 구조 설계
- [ ] Redux Toolkit 스토어 설정 및 루트 리듀서
- [ ] Axios 인스턴스 및 인터셉터 (토큰 자동 첨부, 에러 핸들링)
- [ ] 공통 UI 컴포넌트 (Button, Input, Card, Modal, Loading)
- [ ] 테마 및 디자인 시스템 (색상, 폰트, 간격)
- [ ] 에러 바운더리 및 글로벌 에러 처리
- [ ] 환경변수 설정 (`react-native-dotenv`)

---

## 브랜치 전략

### 브랜치 구조
```
main          ← 배포 브랜치 (태그 기반 릴리스)
  └── develop ← 통합 브랜치 (모든 기능 merge 대상)
        ├── feature/dev-a/auth-social-login
        ├── feature/dev-a/subscription-payment
        ├── feature/dev-b/diet-ai-analysis
        ├── feature/dev-b/health-adapter
        ├── feature/dev-c/running-gps-tracking
        └── feature/dev-c/sns-instagram-feed
```

### 브랜치 명명 규칙
```
feature/<팀원명>/<기능명>   예: feature/dev-a/auth-social-login
fix/<팀원명>/<버그명>       예: fix/dev-b/diet-nutrition-calc
docs/<내용>                 예: docs/api-spec-update
```

---

## PR 규칙

1. **타겟 브랜치**: 항상 `develop`으로 PR 생성 (절대 `main`으로 직접 PR 금지)
2. **PR 크기**: 하나의 PR에 하나의 기능 (500줄 이하 권장)
3. **리뷰어**: 최소 1명의 팀원 리뷰 승인 필요
4. **CI 통과**: TypeScript 체크, ESLint, 테스트 모두 통과 후 merge
5. **PR 템플릿**: `.github/PULL_REQUEST_TEMPLATE.md` 작성 필수

---

## 코드 리뷰 절차

1. PR 생성 시 자동으로 CODEOWNERS에 등록된 담당자에게 리뷰 요청
2. 리뷰어는 48시간 이내 리뷰 완료
3. `Approve` 후 PR 작성자가 직접 Squash merge
4. merge 후 feature 브랜치 삭제
5. Conflict 발생 시 PR 작성자가 `develop` rebase 후 해결

---

## 커밋 메시지 규칙

### 형식
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 타입 목록
| 타입 | 설명 |
|------|------|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| refactor | 코드 리팩터링 |
| docs | 문서 수정 |
| test | 테스트 추가/수정 |
| chore | 빌드, 패키지 관련 |
| perf | 성능 개선 |
| ci | CI/CD 설정 변경 |

### 예시
```
feat(auth): Google 소셜 로그인 구현

- GoogleSignin 라이브러리 연동
- JWT 토큰 저장 로직 추가
- authSlice 상태 업데이트

Closes #12
```

---

## 마일스톤 계획

| 마일스톤 | 기간 | 목표 |
|---------|------|------|
| M1 | 1~2주차 | 프로젝트 세팅, 공통 컴포넌트, 인증 기능 |
| M2 | 3~4주차 | 핵심 기능 구현 (식단, 러닝, SNS) |
| M3 | 5~6주차 | 구독/결제, 헬스 동기화, 통계 대시보드 |
| M4 | 7~8주차 | 통합 테스트, 버그 수정, 배포 준비 |
