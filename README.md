# Kelpus — 헬스 관리 모바일 앱

소프트웨어 공학 최종 프로젝트: **Kelpus** 헬스 관리 모바일 앱

> React Native 프론트엔드 + FastAPI 백엔드로 구성된 **모노레포(monorepo)** 구조입니다.

---

## 📁 프로젝트 구조

```
SE_final_Assignment/          ← Git 저장소 루트
├── kelpus/                   # React Native 앱 (프론트엔드)
│   ├── src/
│   │   ├── api/              # Axios 클라이언트 + API 함수
│   │   ├── features/         # 도메인별 기능 (diet, running, sns, subscription)
│   │   ├── navigation/       # React Navigation 설정
│   │   └── types/            # TypeScript 타입 정의
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # FastAPI 서버 (백엔드)
│   ├── app/
│   │   ├── domains/          # 도메인 모델 (user, diet, running, sns, subscription)
│   │   ├── infrastructure/   # 어댑터, 크롤러
│   │   └── main.py
│   ├── migrations/           # Alembic 마이그레이션
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── docs/                     # 아키텍처 문서
│   ├── ARCHITECTURE.md
│   ├── DOMAIN_MODEL.md
│   ├── API_DESIGN.md
│   └── SEQUENCE_FLOWS.md
├── diagram/                  # 설계 다이어그램 (클래스, 시퀀스)
├── docker-compose.yml        # PostgreSQL + Redis + 백엔드 통합 실행
├── 요구사항명세서.md
└── README.md
```

> **모노레포 구조**: `kelpus/`는 독립적인 React Native 프로젝트이지만, 백엔드(`backend/`)와 함께 하나의 Git 저장소에서 관리됩니다. 이는 프론트엔드·백엔드 변경을 원자적으로 커밋·리뷰할 수 있는 의도된 설계입니다.

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React Native 0.75, TypeScript, Redux Toolkit, React Navigation |
| 백엔드 | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| 데이터베이스 | PostgreSQL 16 (asyncpg 드라이버) |
| 캐시/큐 | Redis 7 |
| 마이그레이션 | Alembic |
| 컨테이너 | Docker, docker-compose |
| 인증 | JWT (python-jose) |

---

## 🚀 빠른 시작

### 사전 요구사항

- **Docker** 및 **docker-compose** (백엔드 실행)
- **Node.js 18+** 및 **npm** (프론트엔드)
- **Python 3.11+** (백엔드 로컬 개발 시)
- **React Native 개발 환경** (Android Studio 또는 Xcode)

---

### 1. 저장소 클론

```bash
git clone <repository-url>
cd SE_final_Assignment
```

---

### 2. 백엔드 환경 변수 설정

```bash
cp backend/.env.example backend/.env
# backend/.env 파일을 열어 DATABASE_URL, JWT_SECRET_KEY 등을 설정
```

---

### 3. Docker로 백엔드 실행

```bash
# PostgreSQL + Redis + FastAPI 서버 일괄 시작
docker-compose up -d

# DB 마이그레이션 실행
docker-compose exec backend alembic upgrade head

# 서버 상태 확인
# http://localhost:8000/docs  ← Swagger UI
# http://localhost:8000/health
```

---

### 4. 프론트엔드 설정

```bash
cd kelpus
npm install
```

#### React Native 네이티브 디렉토리 설정

이 저장소는 React Native **bare workflow** 프로젝트입니다.  
`android/`와 `ios/` 네이티브 디렉토리는 각 개발자 환경에서 생성해야 합니다:

```bash
# kelpus/ 디렉토리 안에서 실행
cd kelpus

# 네이티브 디렉토리 생성 (최초 1회)
npx react-native init KelpusNative --skip-git-init
# 생성된 KelpusNative/android/ 와 KelpusNative/ios/ 를 현재 디렉토리로 이동
mv KelpusNative/android ./android
mv KelpusNative/ios ./ios
rm -rf KelpusNative
```

또는 **Expo bare workflow** 절차에 따라 `npx expo prebuild`를 사용합니다.

#### Android 실행

```bash
cd kelpus
npm run android
```

#### iOS 실행 (macOS 전용)

```bash
cd kelpus
cd ios && pod install && cd ..
npm run ios
```

---

## ⚙️ 환경 변수

`backend/.env.example` 파일을 참고하여 `backend/.env`를 작성합니다:

| 변수 | 설명 | 예시 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL | `postgresql+asyncpg://kelpus:kelpus_password@postgres:5432/kelpus` |
| `JWT_SECRET_KEY` | JWT 서명 키 | `your-secret-key-here` |
| `AI_ANALYSIS_API_KEY` | AI 식단 분석 API 키 | — |
| `INSTAGRAM_API_TOKEN` | Instagram 크롤링 토큰 | — |
| `MAP_API_KEY` | 지도 API 키 | — |
| `REDIS_URL` | Redis 연결 URL | `redis://redis:6379` |

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 전체 시스템 아키텍처, 기술 스택, 폴더 구조 |
| [DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) | 5개 도메인 엔티티 및 관계, 도메인 이벤트 |
| [API_DESIGN.md](docs/API_DESIGN.md) | REST API 엔드포인트 명세 (요청/응답 스키마) |
| [SEQUENCE_FLOWS.md](docs/SEQUENCE_FLOWS.md) | 주요 시나리오별 시퀀스 흐름 (Mermaid 다이어그램) |
| [SERVER_DEPLOYMENT.md](docs/SERVER_DEPLOYMENT.md) | Nginx Proxy Manager 기반 홈 서버 API 배포 |

---

## 🏗 아키텍처 요약

```
React Native App (kelpus/)
        │  HTTP (Axios)
        ▼
FastAPI Server (backend/)
        │
   ┌────┴────┐
   │         │
Domains   Infrastructure
user      IHealthAdapter
diet      ├─ AppleHealthAdapter
running   └─ SamsungHealthAdapter
sns       IMapAdapter
subscription  SNSCrawlerService
        │         AIAnalyzerService
        ▼
PostgreSQL + Redis
```

**구독 기반 AI 분석 제한**: `SubscriptionPlan.check_remaining_count()` → 초과 시 HTTP 402

---

## 🧪 개발 워크플로우

```bash
# 백엔드 로컬 개발 (Docker 없이)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 새 마이그레이션 생성
alembic revision --autogenerate -m "add new field"
alembic upgrade head
```

---

*소프트웨어 공학 최종 프로젝트 — 창원대학교*
