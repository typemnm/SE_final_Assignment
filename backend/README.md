# Kelpus Backend

Kelpus 헬스케어 플랫폼의 FastAPI 백엔드 서버.

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (async) |
| DB | PostgreSQL (asyncpg) |
| 인증 | JWT (python-jose) |
| 비밀번호 | passlib[bcrypt] |
| 유효성 검사 | Pydantic v2 |
| 캐싱 | Redis |

## 프로젝트 구조

```
backend/
├── app/
│   ├── main.py              # FastAPI 앱, lifespan, CORS, 라우터 등록
│   ├── config.py            # pydantic-settings 환경 변수
│   ├── database.py          # SQLAlchemy async 엔진/세션
│   ├── dependencies.py      # get_db, get_current_user, check_subscription
│   ├── domains/
│   │   ├── user/            # 사용자, 인증, 구독 플랜
│   │   ├── diet/            # 식단 기록, AI 분석
│   │   ├── running/         # 러닝 기록, 리더보드
│   │   └── sns/             # 브이로그 피드
│   └── infrastructure/
│       ├── adapters/        # 헬스 어댑터, AI 분석, 지도 API
│       └── crawlers/        # SNS 크롤러 백그라운드 서비스
├── requirements.txt
├── .env.example
└── README.md
```

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 (JWT 발급) |
| GET | `/api/v1/users/me` | 내 프로필 조회 |
| PATCH | `/api/v1/users/me` | 내 프로필 수정 |
| GET | `/api/v1/subscription/plan` | 구독 플랜 조회 |
| GET | `/api/v1/subscription/limit` | 잔여 AI 분석 횟수 조회 |
| POST | `/api/v1/diet/sync` | OS 헬스 식단 동기화 |
| POST | `/api/v1/diet/analyze` | 식단 이미지 AI 분석 |
| POST | `/api/v1/running/sync` | 러닝 기록 동기화 |
| GET | `/api/v1/running/leaderboard` | 리더보드 조회 |
| GET | `/api/v1/feed` | 브이로그 피드 조회 |
| GET | `/health` | 서버 상태 확인 |

## 빠른 시작

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 DATABASE_URL, JWT_SECRET_KEY 등을 설정

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 서버 실행
uvicorn app.main:app --reload --port 8000

# 4. API 문서 확인
# http://localhost:8000/docs
```

## 구독 플랜

| 플랜 | 일일 AI 분석 한도 |
|------|-----------------|
| Free | 3회 |
| Premium | 10회 |

일일 한도 초과 시 `402 Payment Required` 반환.

## 아키텍처 원칙

- **도메인 분리**: user / diet / running / sns 독립 모듈
- **어댑터 패턴**: IHealthAdapter 인터페이스로 Apple/Samsung Health 추상화
- **구독 게이팅**: AI 분석 전 잔여 횟수 확인 (check_remaining_count)
- **캐시 우선**: 피드 조회 시 Redis 캐시 우선 사용
- **불변성**: 도메인 객체 메서드는 새 인스턴스 반환
