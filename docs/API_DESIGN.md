# Kelpus REST API 설계 문서

## 목차
1. [API 개요](#api-개요)
2. [인증](#인증)
3. [인증 API](#인증-api)
4. [피드 API](#피드-api)
5. [식단 API](#식단-api)
6. [러닝 API](#러닝-api)
7. [구독 API](#구독-api)
8. [에러 처리](#에러-처리)
9. [응답 형식](#응답-형식)

## API 개요

### Base URL
```
https://api.kelpus.com/api/v1
```

### API 버전
- 현재 버전: v1
- 모든 엔드포인트는 `/api/v1/` 접두사 사용

### 통신 프로토콜
- HTTPS 필수 (모든 통신 암호화)
- Content-Type: `application/json`
- 모든 요청/응답은 UTF-8 인코딩

### 공통 헤더

#### 요청 헤더
```http
Content-Type: application/json
Authorization: Bearer <access_token>
X-Client-Version: 1.0.0
X-Device-ID: <device_uuid>
```

#### 응답 헤더
```http
Content-Type: application/json
X-Request-ID: <request_uuid>
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1677123456
```

---

## 인증

### 인증 방식: JWT Bearer Token

모든 API 요청은 Authorization 헤더에 JWT 토큰을 포함해야 합니다.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 토큰 정보

| 항목 | 값 |
|------|-----|
| 알고리즘 | HS256 |
| Access Token 만료 시간 | 1시간 |
| Refresh Token 만료 시간 | 7일 |
| 서명 키 | 서버 환경변수 (SECRET_KEY) |

### 토큰 갱신 흐름

```
사용자 요청
    ↓
Access Token 유효성 확인
    ├─ 유효 → 요청 처리
    └─ 만료 → Refresh Token으로 재발급
              ├─ Refresh Token 유효 → 새 Access Token 발급
              └─ Refresh Token 만료 → 재로그인 필요
```

---

## 인증 API

### 1. 회원가입

#### 요청
```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "age": 28,
  "gender": "MALE",
  "health_goal": "체중감량"
}
```

#### 응답 (201 Created)
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "age": 28,
    "gender": "MALE",
    "health_goal": "체중감량",
    "created_at": "2024-05-24T10:30:00Z"
  },
  "message": "회원가입이 완료되었습니다."
}
```

#### 에러 응답 (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "유효하지 않은 이메일 형식입니다."
  }
}
```

---

### 2. 로그인

#### 요청
```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  },
  "message": "로그인에 성공했습니다."
}
```

#### 에러 응답 (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다."
  }
}
```

---

### 3. 토큰 갱신

#### 요청
```http
POST /auth/refresh
Content-Type: application/json
Authorization: Bearer <refresh_token>
```

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  },
  "message": "토큰이 갱신되었습니다."
}
```

---

### 4. 로그아웃

#### 요청
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

---

## 피드 API

### 1. 메인 피드 조회

#### 요청
```http
GET /feed?limit=20&offset=0
Authorization: Bearer <access_token>
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 설명 | 기본값 |
|---------|------|------|--------|
| limit | Integer | 조회 개수 | 20 |
| offset | Integer | 페이징 오프셋 | 0 |
| order_by | String | 정렬 기준 ('latest' \| 'popular') | latest |

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "feeds": [
      {
        "feed_id": "550e8400-e29b-41d4-a716-446655440001",
        "post_id": "insta_12345",
        "author_account": "healthlover_kim",
        "original_url": "https://instagram.com/p/ABC123XYZ/",
        "thumbnail_url": "https://cdn.kelpus.com/feed/thumb_123.jpg",
        "likes_count": 234,
        "hashtags": ["#kelpus", "#건강", "#러닝"],
        "created_at": "2024-05-24T10:30:00Z"
      },
      {
        "feed_id": "550e8400-e29b-41d4-a716-446655440002",
        "post_id": "insta_12346",
        "author_account": "fitness_park",
        "original_url": "https://instagram.com/p/ABC123XYZ/",
        "thumbnail_url": "https://cdn.kelpus.com/feed/thumb_124.jpg",
        "likes_count": 512,
        "hashtags": ["#kelpus", "#헬스", "#운동"],
        "created_at": "2024-05-24T09:15:00Z"
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 20,
      "offset": 0,
      "has_next": true
    }
  },
  "message": "피드를 조회했습니다."
}
```

---

### 2. 피드 좋아요 등록

#### 요청
```http
POST /feed/{feed_id}/like
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "feed_id": "550e8400-e29b-41d4-a716-446655440001",
    "likes_count": 235,
    "user_liked": true
  },
  "message": "좋아요가 등록되었습니다."
}
```

---

### 3. 피드 좋아요 취소

#### 요청
```http
DELETE /feed/{feed_id}/like
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "feed_id": "550e8400-e29b-41d4-a716-446655440001",
    "likes_count": 234,
    "user_liked": false
  },
  "message": "좋아요가 취소되었습니다."
}
```

---

## 식단 API

### 1. 식단 동기화 (OS Health)

#### 요청
```http
POST /diet/sync
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "start_date": "2024-05-01",
  "end_date": "2024-05-24"
}
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "synced_count": 15,
    "records": [
      {
        "record_id": "550e8400-e29b-41d4-a716-446655440003",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "registered_at": "2024-05-24T12:30:00Z",
        "data_source": "OS_HEALTH",
        "nutrition_data": {
          "calories": 650,
          "protein": 25,
          "carbohydrate": 80,
          "fat": 18
        }
      }
    ]
  },
  "message": "식단 데이터가 동기화되었습니다."
}
```

---

### 2. 식단 AI 분석

#### 요청
```http
POST /diet/analyze
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "diet_image_url": "https://cdn.kelpus.com/diet/meal_001.jpg",
  "record_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "analysis_id": "550e8400-e29b-41d4-a716-446655440010",
    "record_id": "550e8400-e29b-41d4-a716-446655440003",
    "total_calories": 650,
    "protein_ratio": 15.4,
    "carb_ratio": 49.2,
    "fat_ratio": 24.9,
    "ai_comment": "탄수화물과 단백질 비율이 좋습니다. 좀 더 섬유질을 추가하면 더 좋을 것 같습니다.",
    "nutrition_details": {
      "protein": 25,
      "carbohydrate": 80,
      "fat": 18,
      "fiber": 4,
      "sugar": 15
    },
    "analysis_image_url": "https://cdn.kelpus.com/analysis/chart_001.png"
  },
  "message": "식단 분석이 완료되었습니다."
}
```

#### 에러 응답 (402 Payment Required - 구독 제한)
```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_LIMIT_EXCEEDED",
    "message": "일일 AI 분석 횟수를 초과했습니다.",
    "data": {
      "remaining_limit": 0,
      "daily_limit": 3,
      "plan_type": "FREE",
      "upgrade_url": "https://kelpus.com/upgrade"
    }
  }
}
```

---

### 3. 식단 기록 조회

#### 요청
```http
GET /diet?start_date=2024-05-01&end_date=2024-05-31&limit=20
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "record_id": "550e8400-e29b-41d4-a716-446655440003",
        "registered_at": "2024-05-24T12:30:00Z",
        "data_source": "MANUAL",
        "diet_image_url": "https://cdn.kelpus.com/diet/meal_001.jpg",
        "nutrition_data": {
          "calories": 650,
          "protein": 25,
          "carbohydrate": 80,
          "fat": 18
        },
        "analysis": {
          "analysis_id": "550e8400-e29b-41d4-a716-446655440010",
          "total_calories": 650,
          "ai_comment": "탄수화물과 단백질 비율이 좋습니다."
        }
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "has_next": true
    }
  }
}
```

---

## 러닝 API

### 1. 러닝 데이터 동기화

#### 요청
```http
POST /running/sync
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "start_date": "2024-05-01",
  "end_date": "2024-05-24"
}
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "synced_count": 8,
    "records": [
      {
        "record_id": "550e8400-e29b-41d4-a716-446655440020",
        "distance": 5.2,
        "average_pace": 5.5,
        "duration": 1716,
        "calories_burned": 520,
        "started_at": "2024-05-24T06:30:00Z",
        "ended_at": "2024-05-24T07:00:00Z",
        "gps_coordinates": [
          [37.7749, -122.4194],
          [37.7750, -122.4195],
          [37.7751, -122.4196]
        ]
      }
    ]
  },
  "message": "러닝 데이터가 동기화되었습니다."
}
```

---

### 2. 러닝 레코드 저장 및 순위 조회

#### 요청
```http
POST /running/record
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "distance": 5.2,
  "average_pace": 5.5,
  "duration": 1716,
  "calories_burned": 520,
  "started_at": "2024-05-24T06:30:00Z",
  "ended_at": "2024-05-24T07:00:00Z",
  "gps_coordinates": [
    [37.7749, -122.4194],
    [37.7750, -122.4195],
    [37.7751, -122.4196]
  ]
}
```

#### 응답 (201 Created)
```json
{
  "success": true,
  "data": {
    "record_id": "550e8400-e29b-41d4-a716-446655440020",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "distance": 5.2,
    "average_pace": 5.5,
    "duration": 1716,
    "calories_burned": 520,
    "leaderboard": {
      "overall_rank": 234,
      "percentile": 78.5,
      "total_distance": 145.8,
      "badges": ["첫 5km", "50km 챌린지"]
    }
  },
  "message": "러닝 기록이 저장되었습니다."
}
```

---

### 3. 리더보드 조회

#### 요청
```http
GET /running/leaderboard?limit=50&offset=0&period=monthly
Authorization: Bearer <access_token>
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 설명 | 기본값 |
|---------|------|------|--------|
| limit | Integer | 조회 개수 | 50 |
| offset | Integer | 페이징 오프셋 | 0 |
| period | String | 기간 ('weekly' \| 'monthly' \| 'all') | all |

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "user_name": "김철수",
        "total_distance": 285.5,
        "running_count": 42,
        "average_pace": 5.2,
        "percentile": 99.8,
        "badges": ["첫 5km", "50km 챌린지", "상위 100"]
      },
      {
        "rank": 2,
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "user_name": "이영희",
        "total_distance": 275.3,
        "running_count": 38,
        "average_pace": 5.3,
        "percentile": 99.6,
        "badges": ["첫 5km", "50km 챌린지"]
      }
    ],
    "user_rank": {
      "rank": 234,
      "percentile": 78.5,
      "total_distance": 145.8
    },
    "pagination": {
      "total": 5000,
      "limit": 50,
      "offset": 0,
      "has_next": true
    }
  }
}
```

---

### 4. 러닝 경로 지도 렌더링

#### 요청
```http
GET /running/map/{record_id}
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "record_id": "550e8400-e29b-41d4-a716-446655440020",
    "map_image_url": "https://cdn.kelpus.com/maps/route_001.png",
    "map_url": "https://maps.kelpus.com/route/550e8400-e29b-41d4-a716-446655440020",
    "route_stats": {
      "distance": 5.2,
      "elevation_gain": 45,
      "elevation_loss": 42,
      "average_pace": 5.5,
      "max_speed": 12.3
    }
  }
}
```

---

## 구독 API

### 1. 구독 플랜 조회

#### 요청
```http
GET /subscription/plan
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "current_plan": {
      "plan_id": "550e8400-e29b-41d4-a716-446655440050",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "FREE",
      "daily_ai_limit": 3,
      "total_usage": 45,
      "renewal_date": "2024-06-24",
      "created_at": "2024-05-24T10:30:00Z"
    },
    "available_plans": [
      {
        "type": "FREE",
        "daily_ai_limit": 3,
        "features": ["식단 기록", "러닝 추적", "피드 조회"],
        "price": 0
      },
      {
        "type": "PREMIUM",
        "daily_ai_limit": -1,
        "features": ["식단 기록", "러닝 추적", "피드 조회", "무제한 AI 분석"],
        "price": 9900,
        "billing_cycle": "monthly"
      }
    ]
  }
}
```

---

### 2. 구독 사용량 조회

#### 요청
```http
GET /subscription/limit
Authorization: Bearer <access_token>
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "plan_type": "FREE",
    "daily_limit": 3,
    "remaining_limit": 1,
    "total_usage": 2,
    "reset_time": "2024-05-25T00:00:00Z",
    "usage_history": [
      {
        "date": "2024-05-24",
        "count": 2,
        "timestamp": ["2024-05-24T10:30:00Z", "2024-05-24T15:45:00Z"]
      },
      {
        "date": "2024-05-23",
        "count": 3,
        "timestamp": ["2024-05-23T08:00:00Z", "2024-05-23T12:30:00Z", "2024-05-23T18:15:00Z"]
      }
    ]
  }
}
```

---

### 3. 구독 업그레이드

#### 요청
```http
POST /subscription/upgrade
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "plan_type": "PREMIUM",
  "payment_token": "tok_visa_4242424242424242"
}
```

#### 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "plan_id": "550e8400-e29b-41d4-a716-446655440051",
    "type": "PREMIUM",
    "daily_ai_limit": -1,
    "renewal_date": "2024-06-24",
    "price": 9900,
    "billing_cycle": "monthly"
  },
  "message": "프리미엄으로 업그레이드되었습니다."
}
```

---

## 에러 처리

### 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적 메시지",
    "details": {
      "field": "구체적 정보"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-05-24T10:30:00Z"
}
```

### HTTP 상태 코드

| 상태 코드 | 설명 | 예시 |
|----------|------|------|
| 400 | Bad Request | 잘못된 요청 형식 |
| 401 | Unauthorized | 인증 필요 / 토큰 만료 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복된 데이터 |
| 429 | Too Many Requests | 레이트 제한 초과 |
| 402 | Payment Required | 구독 제한 초과 |
| 500 | Internal Server Error | 서버 에러 |
| 503 | Service Unavailable | 서비스 점검 중 |

### 에러 코드 테이블

| 에러 코드 | HTTP 상태 | 설명 | 해결 방법 |
|----------|----------|------|----------|
| INVALID_EMAIL | 400 | 유효하지 않은 이메일 | 이메일 형식 확인 |
| INVALID_PASSWORD | 400 | 약한 비밀번호 | 최소 8자, 대문자, 숫자 포함 |
| INVALID_CREDENTIALS | 401 | 잘못된 인증 정보 | 이메일/비밀번호 확인 |
| TOKEN_EXPIRED | 401 | 토큰 만료 | 토큰 갱신 (/auth/refresh) |
| TOKEN_INVALID | 401 | 유효하지 않은 토큰 | 재로그인 필요 |
| UNAUTHORIZED | 403 | 권한 없음 | 관리자 문의 |
| NOT_FOUND | 404 | 리소스 없음 | 리소스 ID 확인 |
| DUPLICATE_EMAIL | 409 | 중복된 이메일 | 다른 이메일 사용 |
| SUBSCRIPTION_LIMIT_EXCEEDED | 402 | AI 분석 횟수 초과 | 구독 업그레이드 필요 |
| RATE_LIMIT_EXCEEDED | 429 | 요청 초과 | 잠시 후 재시도 |
| INVALID_IMAGE | 400 | 유효하지 않은 이미지 | 이미지 형식 확인 (JPG, PNG) |
| NETWORK_ERROR | 503 | 외부 API 오류 | 잠시 후 재시도 |
| INTERNAL_SERVER_ERROR | 500 | 서버 에러 | support@kelpus.com 문의 |

### 에러 응답 예시

#### 401 Unauthorized (Token Expired)
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "인증 토큰이 만료되었습니다."
  }
}
```

#### 402 Payment Required (Subscription Limit)
```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_LIMIT_EXCEEDED",
    "message": "일일 AI 분석 횟수를 초과했습니다.",
    "data": {
      "remaining_limit": 0,
      "daily_limit": 3,
      "plan_type": "FREE",
      "upgrade_url": "https://kelpus.com/upgrade"
    }
  }
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "너무 많은 요청입니다. 잠시 후 다시 시도해주세요."
  },
  "retry_after": 60
}
```

---

## 응답 형식

### 성공 응답 형식

모든 성공 응답은 다음 형식을 따릅니다:

```json
{
  "success": true,
  "data": {
    // 엔드포인트별 응답 데이터
  },
  "message": "작업 완료 메시지",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-05-24T10:30:00Z"
}
```

### 페이지네이션

```json
{
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_next": true,
    "has_prev": false,
    "pages": 5
  }
}
```

### 데이터 타입

#### DateTime 형식
- ISO 8601 형식: `2024-05-24T10:30:00Z`
- 모든 시간은 UTC 기준

#### UUID 형식
- RFC 4122 v4 형식: `550e8400-e29b-41d4-a716-446655440000`

#### Float 형식
- 소수점 이하 최대 2자리: `5.50`, `145.80`

---

## 레이트 제한

### 요청 한계

| 사용자 타입 | 분당 요청 수 | 시간당 요청 수 | 일일 요청 수 |
|-----------|----------|----------|-----------|
| 무인증 | 20 | 500 | 5,000 |
| 인증(FREE) | 100 | 3,000 | 50,000 |
| 인증(PREMIUM) | 200 | 10,000 | 200,000 |

### 레이트 제한 헤더

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1677123456
```

---

**문서 버전**: 1.0  
**작성일**: 2024-05-24  
**마지막 수정**: 2024-05-24
