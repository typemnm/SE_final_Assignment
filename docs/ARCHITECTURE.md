# Kelpus 건강관리 앱 - 전체 시스템 아키텍처

## 목차
1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [레이어드 아키텍처](#레이어드-아키텍처)
4. [도메인 분리 원칙](#도메인-분리-원칙)
5. [폴더 구조](#폴더-구조)
6. [외부 API 어댑터 패턴](#외부-api-어댑터-패턴)
7. [구독 게이팅 아키텍처](#구독-게이팅-아키텍처)
8. [보안 고려사항](#보안-고려사항)

## 시스템 개요

Kelpus는 사용자의 건강 관리를 돕는 종합 모바일 애플리케이션입니다. 다음 핵심 기능을 제공합니다:

- **식단 관리**: 음식 사진 인식 기반 영양소 분석
- **러닝 추적**: GPS 기반 러닝 기록 및 리더보드 순위
- **SNS 연동**: #kelpus 해시태그 기반 커뮤니티 피드
- **구독 서비스**: AI 분석 횟수 제한을 통한 프리미에 구독 모델

### 주요 특징
- 사용자 중심의 건강 데이터 통합
- OS 헬스 API(iOS/Android) 네이티브 연동
- 소셜 미디어 콘텐츠 자동 크롤링
- AI 기반 맞춤형 건강 분석

## 기술 스택

### Frontend (클라이언트)
```
프레임워크: React Native 0.75
언어: TypeScript
상태관리: Redux Toolkit
네비게이션: React Navigation
```

### Backend (서버)
```
프레임워크: FastAPI (Python)
인증: JWT Bearer Token
요청/응답: JSON
```

### Database
```
주 데이터베이스: PostgreSQL
캐시: Redis (피드 데이터 캐싱)
```

### 외부 서비스
```
OS 헬스 API: Samsung Health, Apple HealthKit
SNS API: Instagram API
AI 분석: 커스텀 AI 엔진
지도 API: MapAPI
```

## 레이어드 아키텍처

```
┌─────────────────────────────────────────────────────┐
│           Presentation Layer (UI)                    │
│    React Native Mobile App (iOS / Android)          │
│  ┌───────────────────────────────────────────────┐ │
│  │ Redux Store  │ React Navigation  │ Components│ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│           API Gateway / Auth Layer                   │
│    FastAPI Routes + JWT Authentication             │
│  ┌───────────────────────────────────────────────┐ │
│  │ /api/v1/auth      │ /api/v1/feed              │ │
│  │ /api/v1/diet      │ /api/v1/running           │ │
│  │ /api/v1/subscription                          │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│        Business Logic Layer (Services)               │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Auth       │  │ Diet         │  │ Running    │ │
│  │ Service    │  │ Service      │  │ Service    │ │
│  └────────────┘  └──────────────┘  └────────────┘ │
│  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ SNS Crawler  │  │ Subscription Gate Service  │ │
│  │ Service      │  │                            │ │
│  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│         Data Access Layer (Repository)               │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ │
│  │ User    │ │ Diet   │ │ Running  │ │ Feed     │ │
│  │ Repo    │ │ Repo   │ │ Repo     │ │ Repo     │ │
│  └─────────┘ └────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│           Data Storage & Integration                 │
│  ┌──────────────┐          ┌────────────────────┐  │
│  │  PostgreSQL  │          │   OS Health API    │  │
│  │  Database    │          │   SNS API (IG)     │  │
│  │              │          │   Map API          │  │
│  │  Redis Cache │          │   AI Engine        │  │
│  └──────────────┘          └────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 도메인 분리 원칙

Kelpus는 5개의 독립적인 도메인으로 구성됩니다:

### 1. 사용자 도메인 (User Domain)
- 사용자 인증 및 프로필 관리
- 구독 플랜 관리 및 사용량 추적
- 책임: 사용자 정보 유지보수, 권한 관리

### 2. 식단 도메인 (Diet Domain)
- 식단 기록 저장 및 관리
- AI 분석을 통한 영양소 계산
- 책임: 식단 데이터 정확성, 영양 분석 결과

### 3. 러닝 도메인 (Running Domain)
- 러닝 기록 저장 및 GPS 경로 관리
- 사용자 순위 및 리더보드 관리
- 책임: 거리/속도 데이터 정확성, 순위 계산

### 4. SNS 도메인 (SNS Domain)
- 커뮤니티 피드 관리
- 소셜 미디어 콘텐츠 크롤링
- 책임: 피드 데이터 관리, SNS 동기화

### 5. 구독 도메인 (Subscription Domain)
- AI 분석 횟수 제한
- 플랜별 사용량 관리
- 책임: 사용량 추적, 게이팅 로직 적용

## 폴더 구조

### Backend 구조
```
backend/
├── main.py                          # FastAPI 앱 진입점
├── config/
│   ├── settings.py                 # 환경설정
│   └── database.py                 # DB 연결설정
├── domain/
│   ├── user/
│   │   ├── models.py               # User, SubscriptionPlan 엔티티
│   │   ├── service.py              # 사용자 비즈니스 로직
│   │   └── repository.py           # DB 쿼리
│   ├── diet/
│   │   ├── models.py               # DietRecord, DietAnalysis 엔티티
│   │   ├── service.py              # 식단 분석 로직
│   │   └── repository.py           # DB 쿼리
│   ├── running/
│   │   ├── models.py               # RunningRecord, Leaderboard 엔티티
│   │   ├── service.py              # 러닝 로직 및 순위 계산
│   │   └── repository.py           # DB 쿼리
│   ├── sns/
│   │   ├── models.py               # BlogFeed 엔티티
│   │   ├── service.py              # SNS 크롤링 및 피드 관리
│   │   └── repository.py           # DB 쿼리
│   └── subscription/
│       ├── models.py               # 구독 관련 엔티티
│       ├── service.py              # 사용량 게이팅 로직
│       └── repository.py           # DB 쿼리
├── api/
│   ├── v1/
│   │   ├── auth.py                 # 인증 엔드포인트
│   │   ├── diet.py                 # 식단 엔드포인트
│   │   ├── running.py              # 러닝 엔드포인트
│   │   ├── feed.py                 # SNS 피드 엔드포인트
│   │   └── subscription.py         # 구독 엔드포인트
│   └── dependencies.py             # 인증 미들웨어
├── adapters/
│   ├── os_health_adapter.py        # OS Health API 어댑터
│   ├── sns_adapter.py              # Instagram API 어댑터
│   ├── ai_adapter.py               # AI 분석 엔진 어댑터
│   └── map_adapter.py              # Map API 어댑터
├── schemas/
│   ├── user_schema.py              # 요청/응답 스키마
│   ├── diet_schema.py
│   ├── running_schema.py
│   ├── feed_schema.py
│   └── subscription_schema.py
├── utils/
│   ├── auth.py                     # JWT 생성/검증
│   ├── validators.py               # 입력 검증
│   └── exceptions.py               # 커스텀 예외
└── migrations/                      # Alembic DB 마이그레이션
    └── versions/
```

### Frontend 구조
```
frontend/
├── app.tsx                          # 앱 진입점
├── navigation/
│   ├── RootNavigator.tsx           # 라우팅 구조
│   └── TabNavigator.tsx            # 하단 탭 내비게이션
├── screens/
│   ├── Auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── Feed/
│   │   └── FeedScreen.tsx
│   ├── Diet/
│   │   ├── DietListScreen.tsx
│   │   ├── DietAnalysisScreen.tsx
│   │   └── DietSyncScreen.tsx
│   ├── Running/
│   │   ├── RunningListScreen.tsx
│   │   ├── LeaderboardScreen.tsx
│   │   └── RunningMapScreen.tsx
│   └── Profile/
│       └── ProfileScreen.tsx
├── store/
│   ├── rootReducer.ts
│   ├── slices/
│   │   ├── authSlice.ts            # 인증 상태
│   │   ├── userSlice.ts            # 사용자 정보
│   │   ├── dietSlice.ts            # 식단 데이터
│   │   ├── runningSlice.ts         # 러닝 데이터
│   │   ├── feedSlice.ts            # SNS 피드
│   │   └── subscriptionSlice.ts    # 구독 정보
│   └── hooks.ts
├── services/
│   ├── api.ts                      # REST 클라이언트
│   ├── authService.ts
│   ├── dietService.ts
│   ├── runningService.ts
│   ├── feedService.ts
│   └── subscriptionService.ts
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Card.tsx
│   │   └── Button.tsx
│   ├── diet/
│   │   └── DietCard.tsx
│   ├── running/
│   │   └── LeaderboardCard.tsx
│   └── feed/
│       └── FeedCard.tsx
├── utils/
│   ├── storage.ts                  # AsyncStorage 관리
│   ├── validators.ts
│   └── formatters.ts
└── types/
    └── index.ts                    # TypeScript 타입 정의
```

## 외부 API 어댑터 패턴

외부 서비스와의 통신은 어댑터 패턴을 사용하여 느슨한 결합을 유지합니다.

### OS Health Adapter
```python
# adapters/os_health_adapter.py
class OSHealthAdapter:
    """OS Health API와의 통신을 추상화"""
    
    async def fetch_health_data(self, user_id: str, data_type: str) -> HealthData:
        """
        사용자의 건강 데이터 조회
        
        Args:
            user_id: 사용자 ID
            data_type: 'diet' | 'running' | 'sleep'
        
        Returns:
            HealthData: 건강 데이터
        """
        pass
```

### SNS Adapter
```python
# adapters/sns_adapter.py
class SNSAdapter:
    """Instagram API와의 통신을 추상화"""
    
    async def fetch_hashtag_posts(self, hashtag: str, limit: int = 50) -> List[Post]:
        """
        해시태그 기반 게시물 조회
        
        Args:
            hashtag: 검색 해시태그 (#kelpus)
            limit: 조회 개수
        
        Returns:
            List[Post]: 게시물 목록
        """
        pass
    
    async def sync_story(self, user_id: str) -> List[Story]:
        """사용자 스토리 동기화"""
        pass
```

### AI Adapter
```python
# adapters/ai_adapter.py
class AIAdapter:
    """AI 분석 엔진과의 통신을 추상화"""
    
    async def analyze_diet_image(self, image_url: str) -> DietAnalysisResult:
        """
        식단 사진 분석
        
        Returns:
            DietAnalysisResult: 칼로리, 탄단지, 영양소 정보
        """
        pass
    
    async def recommend_diet(self, user_info: UserInfo) -> List[DietPlan]:
        """사용자 맞춤형 식단 추천"""
        pass
```

### Map Adapter
```python
# adapters/map_adapter.py
class MapAdapter:
    """Map API와의 통신을 추상화"""
    
    async def render_route(self, coordinates: List[Tuple[float, float]]) -> MapImage:
        """
        GPS 경로를 지도 이미지로 변환
        
        Args:
            coordinates: [(위도, 경도), ...] 좌표 리스트
        
        Returns:
            MapImage: 지도 이미지 URL
        """
        pass
```

## 구독 게이팅 아키텍처

### 게이팅 플로우

```
사용자 AI 분석 요청
         ↓
[구독 플랜 조회] → 무료/프리미엄 확인
         ↓
[잔여 횟수 확인]
         ├─ 잔여 > 0 ──→ [AI 분석 실행] ──→ [사용량 증가] ──→ [결과 반환]
         └─ 잔여 = 0 ──→ [구독 업그레이드 안내] ──→ [분석 거부]
```

### SubscriptionPlan 엔티티

| 필드 | 타입 | 설명 |
|------|------|------|
| plan_id | UUID | 플랜 고유 ID |
| user_id | UUID | 사용자 ID |
| type | Enum | 'FREE' \| 'PREMIUM' |
| daily_ai_limit | Integer | 하루 AI 분석 횟수 제한 |
| total_usage | Integer | 누적 사용량 |
| renewal_date | Date | 갱신 일자 |

### 게이팅 로직

```python
async def check_subscription_limit(user_id: str) -> bool:
    """
    사용자의 구독 제한 확인
    
    Returns:
        True: 분석 가능
        False: 제한 도달, 업그레이드 필요
    """
    plan = await subscription_repo.get_plan(user_id)
    
    if plan.type == PlanType.FREE:
        if plan.daily_ai_limit <= 0:
            return False
    
    if plan.type == PlanType.PREMIUM:
        # 프리미엄은 제한 없음
        return True
    
    return True
```

## 보안 고려사항

### 인증 & 인가
- **JWT Bearer Token**: 모든 API 요청에 필수
- **토큰 만료**: Access Token 1시간, Refresh Token 7일
- **비밀번호**: bcrypt 해싱 저장
- **HTTPS**: 모든 통신 암호화

### 데이터 보안
- **개인정보 보호**: 사용자 건강 데이터는 암호화 저장
- **API 키 관리**: 환경변수로 분리 저장
- **입력 검증**: SQL Injection 방지를 위한 파라미터화된 쿼리

### 레이트 제한
```python
# FastAPI 미들웨어
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    """
    IP당 분당 100회 요청 제한
    """
    pass
```

### 에러 처리
- 민감한 정보 노출 방지
- 일반적인 에러 메시지 반환
- 상세 로그는 서버 측에만 저장

### 세션 관리
- CORS 설정으로 도메인 제한
- CSRF 토큰 검증
- 다중 기기 동시 접속 제한

---

**문서 버전**: 1.0  
**작성일**: 2024-05-24  
**수정일**: 2024-05-24
