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
# .env 파일을 편집하여 DATABASE_URL, JWT_SECRET_KEY, GEMINI_API_KEY 등을 설정

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 서버 실행
uvicorn app.main:app --reload --port 8000

# 4. API 문서 확인
# http://localhost:8000/docs
```

홈 서버 운영 배포는 개발용 명령 대신 저장소 루트의 `start-server.sh`와
`docker-compose.server.yml`을 사용합니다. Nginx Proxy Manager 연동과 `.envserver`
준비 절차는 [`docs/SERVER_DEPLOYMENT.md`](../docs/SERVER_DEPLOYMENT.md)를 참고하세요.

## Gemini 식단 이미지 분석 설정

`POST /api/v1/diet/analyze`는 Gemini REST API로 식단 이미지를 분석합니다. Google SDK는 사용하지 않고 서버가 검증된 이미지 URL을 다운로드한 뒤 기존 `httpx` 의존성으로 Gemini `generateContent`에 inline image data를 전송합니다.

`.env`에 다음 값을 설정하세요. 실제 API 키는 커밋하지 말고 로컬 `.env` 또는 배포 secret으로만 관리합니다.

| 변수 | 설명 | 기본값/예시 |
|------|------|-------------|
| `GEMINI_API_KEY` | Gemini API 키. 빈 값, `dummy-key`, `your-ai-api-key`, `your-gemini-api-key`는 미설정으로 처리 | `your-gemini-api-key` |
| `GEMINI_MODEL` | 이미지 입력을 지원하는 Gemini 모델 | `gemini-2.5-flash` |
| `GEMINI_API_BASE_URL` | Gemini REST API base URL | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_REQUEST_TIMEOUT_SECONDS` | Gemini/image HTTP 요청 timeout | `20` |
| `GEMINI_IMAGE_MAX_BYTES` | inline image data 최대 바이트 수 | `10485760` |

지원 이미지 MIME 타입은 `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`입니다. SSRF 방지를 위해 HTTPS URL만 허용하고 localhost/private/link-local/metadata 등 내부 네트워크 대상 및 리다이렉트는 거부합니다. DNS 검증 후 실제 이미지 다운로드는 검증된 IP에 연결하고 원본 hostname은 TLS SNI/Host에만 사용해 DNS 리바인딩 TOCTOU를 줄입니다. 분석 결과는 AI 추정치이며 의학적/영양학적 확정값이 아닙니다.

### 식단 분석 요청 예시

```http
POST /api/v1/diet/analyze
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "image_url": "https://cdn.kelpus.com/diet/meal_001.jpg",
  "diet_record_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

`diet_record_id`는 선택값이며 생략하면 이미지 URL로 새 식단 기록을 생성합니다. Gemini 설정 누락은 503, 이미지 URL/MIME/크기/내부 네트워크/리다이렉트 문제는 422, Gemini provider 오류는 502, timeout은 504로 처리됩니다. 실패 시 mock 분석값을 반환하지 않으며 사용량도 증가하지 않습니다.

## 구독 플랜

| 플랜 | 일일 AI 분석 한도 |
|------|-----------------|
| Free | 3회 |
| Premium | 10회 |

일일 한도 초과 시 `402 Payment Required` 반환.

## 개발용 시드 계정

| 계정 | 이메일 | 비밀번호 | 플랜 | 일일 AI 분석 |
|------|--------|---------|------|-------------|
| 어드민 | `admin@kelpus.com` | `Admin1234!` | Premium | 10회 |
| 게스트 | `guest@kelpus.com` | `Guest1234!` | Free | 3회 |

**시드 실행** (DB가 실행 중인 상태에서):

```bash
cd backend
.venv/bin/python -m app.seed
```

**계정 확인** (Swagger UI):
```
http://localhost:8000/docs → POST /api/v1/auth/login
```

**psql로 직접 조회**:
```bash
docker exec -it kelpus-postgres psql -U kelpus -d kelpus
SELECT u.email, s.type, s.daily_ai_limit
  FROM users u JOIN subscription_plans s ON s.user_id = u.id;
\q
```

---

## DB 관리

```bash
# 컨테이너 시작 / 중지
docker compose up -d postgres
docker compose down

# psql 접속
docker exec -it kelpus-postgres psql -U kelpus -d kelpus

# 유용한 psql 명령
\dt                  -- 테이블 목록
\d users             -- users 테이블 스키마
SELECT * FROM users; -- 전체 사용자 조회

# 볼륨 포함 전체 초기화 (데이터 삭제 주의)
docker compose down -v
```

---

## 테스트

프로젝트 기본 의존성만 설치된 환경에서는 표준 라이브러리 `unittest`로 백엔드 오프라인 테스트를 실행할 수 있습니다.

```bash
cd backend
python -m unittest tests.test_ai_analyzer tests.test_diet_service_ai_errors
python -c "from app.main import app; print(app.title)"
```

Gemini 테스트는 `httpx.MockTransport`와 이미지 fetcher 주입을 사용하므로 실제 API 키, 외부 이미지 URL, live Gemini 호출이 필요하지 않습니다.

---

## 아키텍처 원칙

- **도메인 분리**: user / diet / running / sns 독립 모듈
- **어댑터 패턴**: IHealthAdapter 인터페이스로 Apple/Samsung Health 추상화
- **구독 게이팅**: AI 분석 전 잔여 횟수 확인 (check_remaining_count)
- **캐시 우선**: 피드 조회 시 Redis 캐시 우선 사용
- **불변성**: 도메인 객체 메서드는 새 인스턴스 반환
