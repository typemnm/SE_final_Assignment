# Kelpus 도메인 모델 상세 문서

## 목차
1. [개요](#개요)
2. [사용자 도메인](#사용자-도메인)
3. [식단 도메인](#식단-도메인)
4. [러닝 도메인](#러닝-도메인)
5. [SNS 도메인](#sns-도메인)
6. [구독 도메인](#구독-도메인)
7. [도메인 간 관계](#도메인-간-관계)
8. [어그리게이트 경계](#어그리게이트-경계)
9. [도메인 이벤트](#도메인-이벤트)

## 개요

Kelpus는 DDD(Domain-Driven Design) 원칙에 기반하여 5개의 독립적인 도메인으로 구성됩니다. 각 도메인은 명확한 경계와 책임을 가지며, 이벤트 기반으로 상호작용합니다.

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   User       │      │   Diet       │      │   Running    │
│   Domain     │      │   Domain     │      │   Domain     │
└──────────────┘      └──────────────┘      └──────────────┘
       ↓                     ↓                      ↓
    [Events]             [Events]              [Events]
       ↓                     ↓                      ↓
┌──────────────────────────────────────────────────────────┐
│         Event Bus / Message Queue                        │
└──────────────────────────────────────────────────────────┘
       ↓                     ↓                      ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   SNS        │      │ Subscription │      │   Reporting  │
│   Domain     │      │   Domain     │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
```

## 사용자 도메인

### 엔티티: User (사용자)

사용자 계정과 기본 정보를 관리합니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| user_id | UUID | 고유 식별자 | Primary Key |
| email | String | 로그인 이메일 | Unique, NOT NULL |
| password_hash | String | bcrypt 해싱된 비밀번호 | NOT NULL |
| age | Integer | 사용자 나이 | 0 < age < 150 |
| gender | Enum | 성별 ('MALE' \| 'FEMALE' \| 'OTHER') | Nullable |
| health_goal | String | 건강 목표 (예: "체중감량", "근력증강") | Nullable |
| created_at | DateTime | 가입 일시 | NOT NULL |
| updated_at | DateTime | 수정 일시 | NOT NULL |

#### 메서드

```typescript
// 프로필 수정
updateProfile(age: number, gender: string, healthGoal: string): void

// 통계 조회 (읽기 전용)
getStatistics(): UserStatistics {
  dietCount: number        // 기록된 식단 개수
  runningCount: number     // 기록된 러닝 개수
  totalCalories: number    // 총 칼로리
  averagePace: number      // 평균 페이스
}

// 비밀번호 변경 (보안)
changePassword(oldPassword: string, newPassword: string): void
```

### 엔티티: SubscriptionPlan (구독 플랜)

사용자의 구독 정보 및 AI 분석 횟수 제한을 관리합니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| plan_id | UUID | 고유 식별자 | Primary Key |
| user_id | UUID | 사용자 ID | Foreign Key |
| type | Enum | 플랜 유형 ('FREE' \| 'PREMIUM') | NOT NULL |
| daily_ai_limit | Integer | 일일 AI 분석 제한 횟수 | NOT NULL |
| total_usage | Integer | 누적 사용량 | NOT NULL, Default: 0 |
| renewal_date | Date | 갱신 일자 | NOT NULL |
| created_at | DateTime | 생성 일시 | NOT NULL |

#### 메서드

```typescript
// 잔여 횟수 확인
hasRemainingLimit(): boolean {
  // daily_ai_limit > 0이면 true
  // 구독 타입이 PREMIUM이면 true (무제한)
}

// 사용량 증가
incrementUsage(): void {
  total_usage += 1
  daily_ai_limit -= 1
}

// 일일 제한 갱신 (매일 자정)
resetDailyLimit(): void {
  daily_ai_limit = 10  // 무료: 3회, 프리미엄: 무제한
}
```

#### 플랜 타입별 상세

| 항목 | FREE | PREMIUM |
|------|------|---------|
| 일일 AI 분석 제한 | 3회 | 무제한 |
| 가격 | 무료 | 월 9,900원 |
| 피드 조회 | 제한됨 | 무제한 |
| 러닝 기록 | 무제한 | 무제한 |

---

## 식단 도메인

### 엔티티: DietRecord (식단 기록)

사용자가 섭취한 음식 정보를 기록합니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| record_id | UUID | 고유 식별자 | Primary Key |
| user_id | UUID | 사용자 ID | Foreign Key |
| registered_at | DateTime | 등록 일시 | NOT NULL |
| data_source | Enum | 데이터 출처 ('MANUAL' \| 'OS_HEALTH') | NOT NULL |
| diet_image_url | String | 음식 사진 URL | Nullable |
| nutrition_data | JSON | 영양소 데이터 | NOT NULL |
| created_at | DateTime | 생성 일시 | NOT NULL |

#### 메서드

```typescript
// OS 헬스 데이터 매핑
mapOSHealthData(osHealthData: HealthData): void {
  // OS Health API로부터 받은 데이터를 nutrition_data로 변환
}

// 영양소 데이터 유효성 검증
validateNutritionData(): boolean {
  // calories >= 0
  // protein + carbohydrate + fat > 0
}
```

### 엔티티: DietAnalysisResult (식단 분석 결과)

식단 기록에 대한 AI 분석 결과입니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| analysis_id | UUID | 고유 식별자 | Primary Key |
| record_id | UUID | 식단 기록 ID | Foreign Key |
| user_id | UUID | 사용자 ID | Foreign Key |
| total_calories | Float | 총 칼로리 | NOT NULL |
| protein_ratio | Float | 단백질 비율 (%) | 0 <= x <= 100 |
| carb_ratio | Float | 탄수화물 비율 (%) | 0 <= x <= 100 |
| fat_ratio | Float | 지방 비율 (%) | 0 <= x <= 100 |
| ai_comment | String | AI 코멘트 | Nullable, Max: 500 |
| created_at | DateTime | 분석 일시 | NOT NULL |

#### 메서드

```typescript
// 분석 데이터 시각화
visualize(): VisualizationData {
  return {
    barChart: {
      calories: total_calories,
      labels: ['단백질', '탄수화물', '지방'],
      values: [protein_ratio, carb_ratio, fat_ratio]
    },
    pieChart: {
      ratios: [protein_ratio, carb_ratio, fat_ratio]
    }
  }
}

// 영양 균형 평가
assessBalance(): BalanceScore {
  // 탄단지 비율 평가 (이상적 비율: 50% 탄, 30% 단, 20% 지)
}
```

### Service: AIAnalysisService

식단 분석을 담당하는 비즈니스 로직입니다.

```typescript
class AIAnalysisService {
  // 식단 이미지 분석
  async analyzeDietImage(imageUrl: string): Promise<DietAnalysisResult> {
    // 1. AI 엔진 호출
    // 2. 칼로리/영양소 추출
    // 3. 영양 균형 평가
    // 4. AI 코멘트 생성
  }
  
  // 사용자 맞춤형 식단 추천
  async recommendDiet(userInfo: UserInfo): Promise<DietPlan[]> {
    // 1. 사용자 건강 목표 분석
    // 2. 과거 식단 패턴 분석
    // 3. 맞춤형 식단 추천
    // 4. 영양 정보 포함
  }
}
```

---

## 러닝 도메인

### 엔티티: RunningRecord (러닝 기록)

사용자의 러닝 활동을 기록합니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| record_id | UUID | 고유 식별자 | Primary Key |
| user_id | UUID | 사용자 ID | Foreign Key |
| distance | Float | 이동 거리 (km) | > 0 |
| average_pace | Float | 평균 페이스 (분/km) | > 0 |
| gps_coordinates | JSON | GPS 좌표 데이터 | [[lat, lng], ...] |
| duration | Integer | 러닝 시간 (초) | > 0 |
| calories_burned | Float | 소모 칼로리 | >= 0 |
| started_at | DateTime | 시작 시간 | NOT NULL |
| ended_at | DateTime | 종료 시간 | NOT NULL |
| created_at | DateTime | 생성 일시 | NOT NULL |

#### 메서드

```typescript
// 경로 데이터 등기화
registerPathData(coordinates: Array<[number, number]>): void {
  gps_coordinates = coordinates
  // 유효성 검증: 최소 2개 이상의 좌표
}

// 러닝 통계 계산
calculateStats(): RunningStats {
  return {
    distance: distance,
    pace: average_pace,
    duration: duration,
    caloriesBurned: calories_burned,
    elevation: calculateElevation(gps_coordinates)
  }
}

// 좌표 유효성 검증
validateCoordinates(): boolean {
  // 각 좌표가 유효한 위경도인지 확인
}
```

### 엔티티: Leaderboard (리더보드)

사용자의 러닝 순위 정보입니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| record_id | UUID | 고유 식별자 | Primary Key |
| user_id | UUID | 사용자 ID | Foreign Key |
| overall_rank | Integer | 전체 순위 | >= 1 |
| percentile | Float | 상위 백분율 | 0 <= x <= 100 |
| total_distance | Float | 누적 거리 (km) | >= 0 |
| badges | Array<String> | 획득한 뱃지 | ['첫 5km', '어웨이'] |
| updated_at | DateTime | 업데이트 일시 | NOT NULL |

#### 메서드

```typescript
// 백분율 계산
calculatePercentile(): Float {
  // 사용자 누적 거리 기준 상위 몇 %인지 계산
  // 상위 10% = 90.0, 상위 50% = 50.0
}

// 순위 조회
getOverallRank(): Integer {
  // 누적 거리 기준 전체 순위 조회
}

// 뱃지 획득 여부 확인
hasBadge(badgeName: String): Boolean {
  return badges.contains(badgeName)
}

// 뱃지 획득 로직
awardBadges(): Array<String> {
  newBadges = []
  if (total_distance >= 5) newBadges.add("첫 5km")
  if (total_distance >= 50) newBadges.add("50km 챌린지")
  if (overall_rank <= 100) newBadges.add("상위 100")
  return newBadges
}
```

---

## SNS 도메인

### Service: SNSCrawlerService

SNS 콘텐츠 자동 수집을 담당합니다.

```typescript
class SNSCrawlerService {
  // 해시태그 게시물 수집 (배경 작업)
  async collectHashtagPosts(hashtag: String): Promise<void> {
    // 1. Instagram API 호출
    // 2. #kelpus 게시물 조회
    // 3. 메타데이터 추출
    // 4. DB 저장
    // 주기: 매 1시간마다
  }
  
  // SNS 스토리 동기화
  async syncUserStories(userId: String): Promise<void> {
    // 1. 사용자의 팔로우 중인 계정 스토리 조회
    // 2. 새로운 스토리 저장
    // 3. 기존 스토리 업데이트
  }
}
```

### 엔티티: BlogFeed (브이로그 피드)

SNS에서 수집한 커뮤니티 콘텐츠입니다.

| 속성명 | 타입 | 설명 | 제약사항 |
|--------|------|------|---------|
| feed_id | UUID | 고유 식별자 | Primary Key |
| post_id | String | SNS 게시물 ID | Unique |
| original_url | String | 원본 SNS URL | NOT NULL |
| author_account | String | 작성자 계정 | NOT NULL |
| hashtags | Array<String> | 해시태그 목록 | ['kelpus', ...] |
| likes_count | Integer | 좋아요 수 | >= 0 |
| thumbnail_url | String | 썸네일 이미지 URL | Nullable |
| cached_content | JSON | 캐싱된 콘텐츠 | NOT NULL |
| created_at | DateTime | 수집 일시 | NOT NULL |
| updated_at | DateTime | 갱신 일시 | NOT NULL |

#### 메서드

```typescript
// 피드 정보 표시
displayFeedInfo(): FeedDisplayData {
  return {
    author: author_account,
    thumbnail: thumbnail_url,
    likesCount: likes_count,
    originalUrl: original_url,
    content: cached_content
  }
}

// 좋아요 등록
registerLike(userId: String): void {
  // 1. 사용자-피드 좋아요 기록 저장
  // 2. likes_count 증가
}

// 좋아요 취소
unregisterLike(userId: String): void {
  // 1. 사용자-피드 좋아요 기록 삭제
  // 2. likes_count 감소
}
```

---

## 구독 도메인

### Service: SubscriptionGateService

AI 분석 횟수 제한을 관리합니다.

```typescript
class SubscriptionGateService {
  // 구독 제한 확인
  async checkLimit(userId: String): Promise<Boolean> {
    const plan = await subscriptionRepo.getPlan(userId)
    
    if (plan.type === 'PREMIUM') {
      return true  // 프리미엄은 무제한
    }
    
    if (plan.type === 'FREE') {
      return plan.daily_ai_limit > 0  // 남은 횟수 확인
    }
  }
  
  // 사용량 증가
  async incrementUsage(userId: String): Promise<void> {
    const plan = await subscriptionRepo.getPlan(userId)
    plan.total_usage += 1
    plan.daily_ai_limit -= 1
    await subscriptionRepo.save(plan)
    
    // 이벤트 발행
    this.eventBus.publish(new AIAnalysisUsedEvent(userId, plan.total_usage))
  }
  
  // 일일 제한 갱신 (스케줄 작업)
  async resetDailyLimits(): Promise<void> {
    // 매일 자정에 실행
    // 모든 FREE 플랜의 daily_ai_limit 초기화
  }
}
```

### 엔티티: SubscriptionEvent (구독 이벤트)

구독 변경 이력을 기록합니다.

| 속성명 | 타입 | 설명 |
|--------|------|------|
| event_id | UUID | 고유 식별자 |
| user_id | UUID | 사용자 ID |
| event_type | Enum | 'UPGRADE' \| 'DOWNGRADE' \| 'RENEWAL' |
| old_plan | String | 이전 플랜 |
| new_plan | String | 새 플랜 |
| created_at | DateTime | 발생 일시 |

---

## 도메인 간 관계

### 관계도 (텍스트 표현)

```
User (사용자)
  ├─ has_one → SubscriptionPlan (1:1)
  ├─ creates → DietRecord (1:N)
  │    └─ generates → DietAnalysisResult (1:N)
  ├─ creates → RunningRecord (1:N)
  │    └─ ranks_in → Leaderboard (1:1)
  └─ interacts_with → BlogFeed (N:M, through UserFeedLike)

SubscriptionPlan (구독 플랜)
  └─ checks → AIAnalysisLimit (게이팅)

DietRecord (식단 기록)
  ├─ uses → AIAnalysisService
  └─ produces → Event (DietRecordCreatedEvent)

RunningRecord (러닝 기록)
  ├─ uses → OSHealthAdapter
  └─ uses → MapAdapter

BlogFeed (브이로그 피드)
  ├─ fetched_by → SNSCrawlerService
  └─ interacted_by → User (좋아요)
```

### 관계 상세

#### 1. User - SubscriptionPlan (1:1)
```
- 각 사용자는 정확히 하나의 구독 플랜을 가짐
- 플랜 변경 시 이전 플랜은 보관되지 않음 (SubscriptionEvent로 기록)
- 외래키: SubscriptionPlan.user_id → User.user_id
```

#### 2. DietRecord - DietAnalysisResult (1:N)
```
- 한 식단 기록은 여러 번 분석될 수 있음
- 예: 초기 분석 후 사용자 정보 변경으로 재분석
- 외래키: DietAnalysisResult.record_id → DietRecord.record_id
```

#### 3. RunningRecord - Leaderboard (1:1)
```
- 각 러닝 기록마다 리더보드 순위 정보 유지
- 리더보드는 누적 거리 기준으로 계산
- 외래키: Leaderboard.user_id → User.user_id
```

#### 4. User - BlogFeed (N:M)
```
- 사용자가 여러 피드를 좋아할 수 있음
- 피드는 여러 사용자에게 좋아요 받을 수 있음
- 관계 테이블: UserFeedLike(user_id, feed_id)
```

---

## 어그리게이트 경계

### Aggregate 1: User Aggregate

```
Root: User
  ├─ SubscriptionPlan (child)
  └─ Invariants:
     - 각 User는 정확히 하나의 SubscriptionPlan을 가짐
     - SubscriptionPlan의 user_id = User.user_id
     - daily_ai_limit >= 0
```

**책임**: 사용자 정보 관리, 구독 플랜 게이팅

### Aggregate 2: Diet Aggregate

```
Root: DietRecord
  └─ DietAnalysisResult[] (children)
  └─ Invariants:
     - 각 DietRecord는 최대 1개의 "최신" DietAnalysisResult를 가짐
     - DietAnalysisResult의 record_id = DietRecord.record_id
     - nutrition_data는 유효한 JSON 구조
```

**책임**: 식단 기록 관리, AI 분석 결과 저장

### Aggregate 3: Running Aggregate

```
Root: RunningRecord
  └─ Leaderboard (reference)
  └─ Invariants:
     - distance > 0
     - duration > 0
     - gps_coordinates 최소 2개 이상
     - 계산된 avg_pace = duration / distance
```

**책임**: 러닝 기록 관리, 경로 데이터 유지

### Aggregate 4: Feed Aggregate

```
Root: BlogFeed
  └─ UserFeedLike[] (reference)
  └─ Invariants:
     - feed_id (from SNS API)
     - original_url은 유효한 SNS URL
     - hashtags 배열 유효성
```

**책임**: 커뮤니티 피드 관리, SNS 콘텐츠 캐싱

### Aggregate 5: Subscription Aggregate

```
Root: SubscriptionPlan
  └─ SubscriptionEvent[] (history)
  └─ Invariants:
     - type ∈ {'FREE', 'PREMIUM'}
     - daily_ai_limit >= 0
     - renewal_date > created_at
     - total_usage >= 0
```

**책임**: 구독 플랜 관리, 사용량 게이팅

---

## 도메인 이벤트

도메인 이벤트는 각 도메인 내 중요한 상태 변화를 나타냅니다.

### 1. User Domain Events

#### UserRegisteredEvent
```typescript
{
  eventId: UUID,
  userId: UUID,
  email: String,
  timestamp: DateTime,
  version: 1
}
// 구독자: SubscriptionDomain (초기 플랜 생성)
```

#### UserProfileUpdatedEvent
```typescript
{
  eventId: UUID,
  userId: UUID,
  age: Integer,
  healthGoal: String,
  timestamp: DateTime
}
// 구독자: DietDomain (추천 식단 업데이트)
```

### 2. Diet Domain Events

#### DietRecordCreatedEvent
```typescript
{
  eventId: UUID,
  recordId: UUID,
  userId: UUID,
  timestamp: DateTime,
  imageUrl: String
}
// 구독자: SubscriptionDomain (사용량 게이팅)
```

#### DietAnalysisCompletedEvent
```typescript
{
  eventId: UUID,
  analysisId: UUID,
  recordId: UUID,
  userId: UUID,
  calories: Float,
  timestamp: DateTime
}
// 구독자: UserDomain (통계 업데이트), ReportingDomain
```

### 3. Running Domain Events

#### RunningRecordCreatedEvent
```typescript
{
  eventId: UUID,
  recordId: UUID,
  userId: UUID,
  distance: Float,
  timestamp: DateTime
}
// 구독자: LeaderboardDomain (순위 업데이트)
```

#### RunningRecordCompletedEvent
```typescript
{
  eventId: UUID,
  recordId: UUID,
  userId: UUID,
  distance: Float,
  averagePace: Float,
  caloriesBurned: Float,
  timestamp: DateTime
}
// 구독자: LeaderboardDomain, BadgeAwardDomain
```

### 4. SNS Domain Events

#### BlogFeedCrawledEvent
```typescript
{
  eventId: UUID,
  feedId: UUID,
  postId: String,
  hashtag: String,
  timestamp: DateTime
}
// 구독자: CachingDomain (캐시 갱신)
```

### 5. Subscription Domain Events

#### AIAnalysisUsedEvent
```typescript
{
  eventId: UUID,
  userId: UUID,
  planType: String,  // 'FREE' | 'PREMIUM'
  remainingLimit: Integer,
  timestamp: DateTime
}
// 구독자: AnalyticsDomain (사용량 추적)
```

#### SubscriptionUpgradedEvent
```typescript
{
  eventId: UUID,
  userId: UUID,
  oldPlan: String,
  newPlan: String,
  timestamp: DateTime
}
// 구독자: UserDomain, NotificationDomain
```

#### SubscriptionDowngradedEvent
```typescript
{
  eventId: UUID,
  userId: UUID,
  oldPlan: String,
  newPlan: String,
  timestamp: DateTime
}
// 구독자: UserDomain, NotificationDomain
```

### 이벤트 발행 및 구독 흐름

```
식단 분석 요청
    ↓
[SubscriptionDomain] AI 분석 제한 확인
    ↓
limit OK? 
    ├─ Yes → [DietDomain] AI 분석 실행
    │           ↓
    │      DietAnalysisCompletedEvent 발행
    │           ↓
    │      ┌─────┴──────┬─────────────┐
    │      ↓            ↓             ↓
    │  [UserDomain] [ReportingDomain] [NotificationDomain]
    │   (통계)     (분석 저장)     (알림 발송)
    │      ↓
    │  AIAnalysisUsedEvent 발행
    │      ↓
    │  [SubscriptionDomain] 사용량 증가
    │
    └─ No  → AILimitExceededEvent 발행
                ↓
           [NotificationDomain] 구독 업그레이드 안내
```

---

**문서 버전**: 1.0  
**작성일**: 2024-05-24  
**수정일**: 2024-05-24
