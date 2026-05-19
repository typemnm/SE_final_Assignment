# SE Final Assignment — Kelpus

소프트웨어 공학 최종 프로젝트: **Kelpus** 헬스 관리 모바일 앱

## 프로젝트 구조

```
SE_final_Assignment/
├── kelpus/            # React Native 앱 소스코드
└── 요구사항명세서.md   # 소프트웨어 요구사항 명세서
```

## Kelpus 앱 개요

헬스 데이터 동기화, AI 식단 분석, 러닝 기록 관리, SNS 연동을 통합한 건강 관리 모바일 앱입니다.

- **기술 스택**: React Native 0.75 · TypeScript · Redux Toolkit · React Navigation
- **지원 플랫폼**: iOS 15+ / Android 10+

## 시작하기

```bash
cd kelpus
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## 팀 구성 및 역할

| 팀원 | 담당 기능 |
|------|-----------|
| 팀원 A | 인증/로그인, 마이페이지, 구독·결제 |
| 팀원 B | AI 식단 분석, 헬스 데이터 동기화 |
| 팀원 C | 러닝 관리·지도, SNS 피드 |

자세한 업무 분담은 [`kelpus/docs/WORK_DISTRIBUTION.md`](kelpus/docs/WORK_DISTRIBUTION.md)를 참고하세요.
