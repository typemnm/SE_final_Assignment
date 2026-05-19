# Kelpus 기여 가이드 (Contributing Guide)

**팀원 모두가 이 문서를 먼저 읽고 개발을 시작해 주세요.**

> 이 프로젝트는 **Windows + Android Studio** 환경을 기준으로 개발합니다.

---

## 목차

1. [개발 환경 설치](#1-개발-환경-설치)
2. [저장소 클론 및 프로젝트 세팅](#2-저장소-클론-및-프로젝트-세팅)
3. [앱 첫 실행 확인](#3-앱-첫-실행-확인)
4. [프로젝트 구조 이해](#4-프로젝트-구조-이해)
5. [내 담당 업무 확인](#5-내-담당-업무-확인)
6. [브랜치 전략](#6-브랜치-전략)
7. [개발 워크플로우](#7-개발-워크플로우)
8. [커밋 메시지 규칙](#8-커밋-메시지-규칙)
9. [PR 규칙](#9-pr-규칙)
10. [코드 스타일](#10-코드-스타일)
11. [자주 쓰는 명령어](#11-자주-쓰는-명령어)

---

## 1. 개발 환경 설치

### 1-1. Node.js 설치

1. https://nodejs.org 에서 **LTS 버전(20.x)** Windows Installer 다운로드
2. 설치 시 "Automatically install the necessary tools" 체크
3. 설치 완료 후 CMD 또는 PowerShell에서 확인:

```powershell
node --version   # v20.x.x 출력되어야 함
npm --version    # 10.x.x 출력되어야 함
```

### 1-2. Git 설치 및 설정

1. https://git-scm.com 에서 Windows 버전 다운로드 및 설치
   - 설치 옵션: "Git from the command line and also from 3rd-party software" 선택
2. 설치 후 Git Bash 또는 PowerShell에서 사용자 정보 설정:

```bash
git config --global user.name "본인이름"
git config --global user.email "GitHub계정이메일"

# 설정 확인
git config --list
```

3. GitHub 계정이 없다면 https://github.com 에서 가입 후 팀장에게 GitHub 아이디 공유

### 1-3. Android Studio 설치

1. https://developer.android.com/studio 에서 최신 버전 다운로드 및 설치
2. 최초 실행 시 Setup Wizard가 시작됨 → **Standard** 설치 선택
3. 설치가 완료되면 **SDK Manager** 열기:
   - `More Actions → SDK Manager` (시작 화면) 또는
   - `Settings → Languages & Frameworks → Android SDK` (프로젝트 열린 상태)

**SDK Platforms 탭:**
- ☑ Android 14.0 (API 34) — **필수**
- ☑ Android 13.0 (API 33) — 권장

**SDK Tools 탭 (Show Package Details 체크 후):**
- ☑ Android SDK Build-Tools 34.x.x — **필수**
- ☑ Android SDK Platform-Tools — **필수**
- ☑ Android Emulator — 에뮬레이터 사용 시 필수
- ☑ Intel x86 Emulator Accelerator (HAXM) — AMD CPU라면 불필요

### 1-4. 환경변수 설정 (Windows)

시작 메뉴 → "시스템 환경 변수 편집" → "환경 변수" 버튼:

**새 시스템 변수 추가:**
```
변수 이름: ANDROID_HOME
변수 값:   C:\Users\<사용자명>\AppData\Local\Android\Sdk
```

**Path 변수 편집 → 새로 만들기로 두 줄 추가:**
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

설정 후 PowerShell을 **새로 열고** 확인:
```powershell
adb --version   # Android Debug Bridge 버전 출력되어야 함
```

### 1-5. JDK 확인

Android Studio 설치 시 JDK 17이 함께 설치됩니다.  
별도로 설치되어 있지 않다면 Android Studio 내장 JDK 경로를 사용:

```
C:\Program Files\Android\Android Studio\jbr
```

### 1-6. Android 에뮬레이터 생성

헬스 데이터(Samsung Health) 테스트는 실기기가 필요하지만, UI 개발은 에뮬레이터로 가능합니다.

1. Android Studio → **Device Manager** (우측 패널 또는 `View → Tool Windows → Device Manager`)
2. **Create Virtual Device** 클릭
3. **Phone → Pixel 8** 선택 → Next
4. **Android 14 (API 34)** 이미지 선택 → Download 후 Next
5. AVD 이름 설정 → Finish

에뮬레이터 실행: Device Manager에서 ▶ 버튼 클릭

> **실기기 연결 방법 (권장):**
> 삼성 기기 → 설정 → 개발자 옵션 → USB 디버깅 ON → USB로 PC 연결  
> `adb devices` 명령어로 기기 인식 확인

---

## 2. 저장소 클론 및 프로젝트 세팅

### 2-1. 저장소 클론

PowerShell 또는 Git Bash에서 실행:

```bash
# 작업 디렉토리로 이동 (예시)
cd C:\Users\<사용자명>\Projects

# 저장소 클론
git clone https://github.com/<org>/SE_final_Assignment.git

# kelpus 프로젝트 폴더로 이동
cd SE_final_Assignment\kelpus
```

> GitHub 저장소 주소는 팀장에게 확인하세요.

### 2-2. 의존성 설치

```bash
npm install
```

설치 중 `react-native-health-connect` 등 네이티브 모듈 관련 경고가 출력될 수 있습니다.  
**경고(warn)는 무시해도 됩니다. 오류(error)가 없으면 정상입니다.**

### 2-3. 환경변수 파일 생성

```bash
# .env.example을 복사해 .env 생성
copy .env.example .env
```

`.env` 파일을 메모장(또는 VS Code)으로 열어 팀장에게 받은 값을 입력합니다:

```env
API_BASE_URL=https://api.kelpus.com
GOOGLE_MAPS_API_KEY=여기에_팀장에게_받은_키_입력
AI_ANALYSIS_API_KEY=여기에_팀장에게_받은_키_입력
INSTAGRAM_API_TOKEN=여기에_팀장에게_받은_키_입력
APP_ENV=development
```

> `.env` 파일은 `.gitignore`에 등록되어 있어 **절대 GitHub에 올라가지 않습니다.**

### 2-4. Google Maps API 키 Android 설정

`react-native-maps`가 Android에서 동작하려면 `AndroidManifest.xml`에 API 키를 등록해야 합니다.

`android/app/src/main/AndroidManifest.xml` 파일에서 `<application>` 태그 안에 추가:

```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="${GOOGLE_MAPS_API_KEY}" />
```

`android/app/build.gradle` 파일 `defaultConfig` 블록에 추가:

```gradle
defaultConfig {
    ...
    manifestPlaceholders = [GOOGLE_MAPS_API_KEY: System.getenv("GOOGLE_MAPS_API_KEY") ?: ""]
}
```

> `android/` 폴더는 `npx react-native init` 실행 후 생성됩니다.  
> 아직 없다면 팀장이 초기화한 브랜치에서 pull 받으세요.

### 2-5. Git hooks 활성화

커밋 시 ESLint가 자동으로 실행되도록 설정합니다:

```bash
npm run prepare
```

### 2-6. develop 브랜치 확인

```bash
# 원격 브랜치 목록 확인
git branch -a

# develop 브랜치로 이동 (없으면 팀장에게 문의)
git checkout develop
git pull origin develop
```

### 2-7. Health Connect 설정 (Samsung Health 연동)

**Android 14 이상 기기:** Health Connect 기본 내장 → 별도 설치 불필요

**Android 9~13 기기:**
1. Galaxy Store 또는 Play Store에서 **"Health Connect"** 앱 설치
2. Samsung Health 앱 → 설정 → 연결된 서비스 → Health Connect → 권한 허용
3. Kelpus 앱 실행 후 헬스 데이터 권한 허용 팝업에서 허용

> 에뮬레이터에서는 Samsung Health 연동이 동작하지 않습니다.  
> 헬스 데이터 기능은 **실제 삼성 기기**에서 테스트하세요.

---

## 3. 앱 첫 실행 확인

### 3-1. Metro 번들러 시작

**새 PowerShell 창**을 열고:

```bash
cd SE_final_Assignment\kelpus
npm start
```

`Metro waiting on exp://...` 메시지가 출력되면 정상입니다.

### 3-2. Android 앱 실행

**기존 PowerShell 창**(Metro 실행 중인 창이 아닌 새 창)에서:

```bash
npm run android
```

에뮬레이터가 켜져 있거나 실기기가 USB로 연결되어 있어야 합니다.

처음 빌드는 **5~15분** 소요될 수 있습니다. 이후 빌드는 빠릅니다.

### 3-3. 정적 분석 (앱 실행 없이 코드 검사)

```bash
# TypeScript 타입 오류 확인
npm run type-check

# 코드 품질 검사
npm run lint
```

---

## 4. 프로젝트 구조 이해

```
kelpus/
├── src/
│   ├── api/            # 서버 API 호출 함수 (Axios)
│   ├── components/     # 공통 UI 컴포넌트 (Button, Input 등)
│   ├── features/       # 기능별 모듈 ← 팀원별 작업 공간
│   │   ├── auth/           → 팀원 A
│   │   ├── profile/        → 팀원 A
│   │   ├── subscription/   → 팀원 A
│   │   ├── diet/           → 팀원 B
│   │   ├── health/         → 팀원 B
│   │   ├── running/        → 팀원 C
│   │   └── sns/            → 팀원 C
│   ├── navigation/     # 화면 전환 설정
│   ├── store/          # Redux 전역 상태 관리
│   ├── theme/          # 색상, 폰트, 간격 디자인 시스템
│   ├── types/          # TypeScript 타입 정의
│   └── utils/          # 공통 유틸리티 함수
├── docs/               # 프로젝트 문서
├── .github/            # GitHub Actions, PR/이슈 템플릿
└── __tests__/          # 테스트 파일
```

### 각 feature 폴더 내부 구조

```
features/[기능명]/
├── screens/        # 화면 컴포넌트 (사용자에게 보이는 UI)
├── components/     # 해당 기능 전용 UI 컴포넌트
├── hooks/          # 커스텀 훅 (비즈니스 로직)
├── store/          # Redux slice (상태 + 액션)
└── index.ts        # 외부에 공개할 항목 export
```

### Path Alias (경로 별칭)

긴 상대경로(`../../../`) 대신 아래 별칭을 사용합니다:

| 별칭 | 실제 경로 |
|------|-----------|
| `@api/` | `src/api/` |
| `@appTypes/` | `src/types/` |
| `@components/` | `src/components/` |
| `@features/` | `src/features/` |
| `@navigation/` | `src/navigation/` |
| `@store/` | `src/store/` |
| `@theme/` | `src/theme/` |
| `@utils/` | `src/utils/` |

```ts
// 잘못된 방법
import {Button} from '../../../components/common/Button';

// 올바른 방법
import {Button} from '@components/common/Button';
```

---

## 5. 내 담당 업무 확인

### 팀원 A — 인증 / 마이페이지 / 구독

**담당 폴더:**
- `src/features/auth/` — 로그인, 회원가입, 소셜 로그인
- `src/features/profile/` — 프로필 조회·수정, 기간별 통계
- `src/features/subscription/` — 플랜 선택, 인앱 결제, 잔여 횟수

**구현해야 할 주요 요구사항:**
- FR-01-1~4: 이메일/소셜 로그인, 토큰 세션 관리, 비인증 접근 차단
- FR-02-1: 나이·성별·목표 등록·수정, 프로필 미완성 시 AI 분석 유도
- FR-02-2: 식단·러닝·활동 데이터 기간별(일/주/월) 통계 차트
- FR-06: 무료↔구독 전환, Google Play 인앱 결제, 잔여 분석 횟수 표시

**시작 파일:**
```
src/features/auth/screens/LoginScreen.tsx         ← 로그인 UI 완성
src/features/auth/store/authSlice.ts              ← 인증 상태 관리
src/features/profile/screens/ProfileScreen.tsx    ← 프로필 조회·수정
src/features/subscription/screens/SubscriptionScreen.tsx  ← 구독 플랜 화면
```

---

### 팀원 B — 식단 분석 / 헬스 데이터

**담당 폴더:**
- `src/features/diet/` — AI 식단 분석, 영양소 차트, 분석 이력
- `src/features/health/` — Samsung Health 동기화 (Android Health Connect)

**구현해야 할 주요 요구사항:**
- FR-04-1: Samsung Health 식단 데이터 동기화 (수동·자동, Health Connect API)
- FR-04-2: AI 분석 요청, 결과(영양소·개선제안) 표시, 이력 저장
- FR-04-2-3~4: 무료(1~2회)/구독(5~10회) 제한, 초과 시 업그레이드 유도
- NFR-04-4: 헬스 어댑터 패턴 (`HealthAdapter` 인터페이스 → 플랫폼 확장 가능)

**시작 파일:**
```
src/features/health/adapters/SamsungHealthAdapter.ts  ← Health Connect 구현체 (Android)
src/features/health/hooks/useHealth.ts                ← 동기화 훅
src/features/diet/screens/DietAnalysisScreen.tsx      ← AI 분석 결과 UI
src/features/diet/components/NutritionChart.tsx       ← 영양소 차트
```

> `AppleHealthAdapter.ts`는 iOS용 스텁입니다. Android 개발에서는 수정하지 않아도 됩니다.

---

### 팀원 C — 러닝 / SNS 피드

**담당 폴더:**
- `src/features/running/` — 러닝 목록, 지도 경로, 리더보드
- `src/features/sns/` — #kelpus 해시태그 피드, 게시물 카드

**구현해야 할 주요 요구사항:**
- FR-05-1: Samsung Health 러닝 데이터 동기화 (GPS 경로 포함)
- FR-05-2: Google Maps로 러닝 경로 시각화, 구간별 페이스 색상 표현
- FR-05-3: 전체/기간별 리더보드, 본인 순위 강조
- FR-03-1~2: #kelpus 해시태그 피드, 캐시 DB 조회, 원본 링크 이동

**시작 파일:**
```
src/features/running/screens/RunningDetailScreen.tsx  ← 지도 경로 완성
src/features/running/components/RunningMapView.tsx    ← Google Maps 연동
src/features/running/screens/LeaderboardScreen.tsx    ← 리더보드 필터
src/features/sns/screens/FeedScreen.tsx               ← 피드 UI
```

> Google Maps API 키를 `.env`와 `AndroidManifest.xml` 양쪽에 설정해야 지도가 동작합니다. (섹션 2-4 참고)

---

## 6. 브랜치 전략

```
main              ← 최종 배포 브랜치 (직접 push 금지)
└── develop       ← 통합 개발 브랜치 (PR 병합 대상)
    ├── feature/member-a/auth-login
    ├── feature/member-a/profile-stats
    ├── feature/member-b/health-sync
    ├── feature/member-b/diet-analysis
    ├── feature/member-c/running-map
    └── feature/member-c/sns-feed
```

### 브랜치 생성 규칙

```bash
# 항상 develop에서 최신 코드를 받은 뒤 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/member-a/auth-login
```

| 접두사 | 용도 |
|--------|------|
| `feature/` | 새 기능 구현 |
| `fix/` | 버그 수정 |
| `refactor/` | 리팩토링 |
| `docs/` | 문서 작업 |

---

## 7. 개발 워크플로우

```
1. develop 최신화  →  git pull origin develop
2. 브랜치 생성     →  git checkout -b feature/나/기능명
3. 코드 작성
4. 정적 검사       →  npm run type-check && npm run lint
5. 커밋            →  git commit -m "feat: 로그인 화면 구현"
                      (커밋 시 ESLint 자동 실행됨)
6. push            →  git push origin feature/나/기능명
7. PR 생성         →  GitHub에서 develop 대상으로 PR 오픈
8. 코드 리뷰       →  최소 1명 승인 후 병합
```

---

## 8. 커밋 메시지 규칙

```
<타입>: <요약> (50자 이내)

[선택] 본문 — 왜 이 변경이 필요한지 설명
```

| 타입 | 설명 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `style` | 포매팅, 세미콜론 등 |
| `test` | 테스트 추가·수정 |
| `docs` | 문서 수정 |
| `chore` | 빌드, 패키지 설정 변경 |

**예시:**
```
feat: 카카오 소셜 로그인 구현
fix: 로그아웃 후 토큰 미삭제 버그 수정
refactor: useAuth 훅 토큰 갱신 로직 분리
docs: CONTRIBUTING.md 초기 세팅 섹션 보완
chore: react-native-health-connect 패키지 추가
```

---

## 9. PR 규칙

- **대상 브랜치**: `develop` (main으로 직접 PR 금지)
- **최소 리뷰어**: 1명 승인 후 병합
- **PR 크기**: 하나의 PR은 하나의 기능 단위로 제한
- **체크리스트**: PR 템플릿의 항목을 모두 완성 후 제출
- **충돌 해결**: PR 작성자가 직접 `develop` rebase 후 해결

### CODEOWNERS 안내

각 폴더에 자동 리뷰어가 지정됩니다:

| 폴더 | 자동 리뷰어 |
|------|------------|
| `src/features/auth/`, `profile/`, `subscription/` | @dev-a |
| `src/features/diet/`, `health/` | @dev-b |
| `src/features/running/`, `sns/` | @dev-c |

---

## 10. 코드 스타일

ESLint + Prettier가 자동으로 적용됩니다. `git commit` 시 lint-staged가 자동 실행됩니다.

### 핵심 규칙

```tsx
// 컴포넌트: named export 사용
export const LoginScreen = () => { ... };

// 훅: use 접두사
export const useAuth = () => { ... };

// 타입: interface 사용
interface UserProfile { age: number; gender: string; }

// 상태 불변성: spread 연산자 사용
return {...state, loading: true};

// console.log 사용 금지 (ESLint warn)
```

### 테마 시스템 사용

```tsx
import {colors, typography, spacing} from '@theme/index';

const styles = StyleSheet.create({
  title: {...typography.h2, color: colors.text.primary},
  container: {padding: spacing.md},
});
```

---

## 11. 자주 쓰는 명령어

```bash
# Metro 번들러 시작 (새 터미널에서)
npm start

# Android 앱 실행
npm run android

# TypeScript 타입 오류 확인
npm run type-check

# 코드 품질 검사 + 자동 수정
npm run lint

# 코드 포매팅
npm run format

# 테스트 실행
npm test

# 캐시 초기화 (빌드 이상 시)
npm start -- --reset-cache
```

---

## 문의 및 주의사항

작업 중 막히거나 공유 모듈 수정이 필요한 경우 팀 채팅에서 상의 후 진행해 주세요.

**공통 영역은 반드시 팀원 전체와 공유 후 PR을 올려주세요:**
- `src/navigation/` — 화면 라우팅
- `src/store/rootReducer.ts` — 전역 상태 구조
- `src/components/common/` — 공통 UI 컴포넌트
- `src/api/index.ts` — API 클라이언트 설정
- `src/types/` — 공유 타입 정의
