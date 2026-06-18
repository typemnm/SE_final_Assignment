# Kelpus API 홈 서버 배포

이 문서는 Kelpus API 호스트와 Nginx Proxy Manager(NPM)가 **서로 다른 홈 LAN 장비**에
설치된 구성을 대상으로 합니다.

## 네트워크 경계

```text
클라이언트
  │  HTTPS https://1mnhomenetwork.iptime.org:30001
  ▼
Nginx Proxy Manager 장비 (TLS 인증서 및 공개 포트 담당)
  │  private LAN HTTP
  ▼
Kelpus 서버의 <API_BIND_ADDRESS>:<API_UPSTREAM_PORT>
  │
  ├─ FastAPI 컨테이너 :8000
  ├─ PostgreSQL (Docker 내부 전용)
  └─ Redis (Docker 내부 전용)
```

공개 `:30001`과 FastAPI 업스트림 포트는 서로 다른 경계입니다. FastAPI/Uvicorn에
TLS 인증서를 설치하거나 컨테이너 포트를 `30001`로 맞출 필요가 없습니다.

## 1. 운영 환경 파일 준비

`start-server.sh`는 `.envserver`가 없으면 테스트용 기본값이 든 `.envserver.example`을
자동으로 복사합니다. 로컬 테스트에서는 별도의 크리덴셜 설정 없이 바로 실행할 수 있습니다.

```bash
cp .envserver.example .envserver
chmod 600 .envserver
```

외부에 공개하기 전에는 `.envserver`의 테스트용 비밀번호, JWT 키, Gemini 키 및 프록시
주소를 운영자가 직접 교체해야 합니다. 이 파일은 Git에서
제외되며 커밋하면 안 됩니다. `backend/.dockerignore`는 개발용 `backend/.env`가 이미지에
포함되지 않도록 차단합니다. 특히 다음 값을 확인하십시오.

- `API_BIND_ADDRESS`: Kelpus 서버의 고정 LAN IP. 모든 인터페이스가 필요하면
  `0.0.0.0`을 사용할 수 있지만 호스트 방화벽 제한이 더욱 중요합니다.
- `API_UPSTREAM_PORT`: NPM이 접속할 private HTTP 포트. 기본 예시는 `8000`입니다.
- `TRUSTED_PROXY_IPS`: NPM 장비의 LAN IP 또는 신뢰할 CIDR. `*`를 사용하지 마십시오.
- `CORS_ALLOWED_ORIGINS`: 브라우저 클라이언트의 쉼표 구분 origin 목록. React Native
  네이티브 요청에는 CORS가 적용되지 않습니다.
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET_KEY`: 서로 다른 강한 비밀값.
- `DATABASE_URL`, `REDIS_URL`: 위 비밀번호를 URL 인코딩하여 각각 `postgres`,
  `redis`라는 Compose 서비스 호스트를 가리키도록 작성합니다.
- `AUTO_CREATE_TABLES=false`: production 스키마는 Alembic만 변경하도록 유지합니다.
- `GEMINI_API_KEY`: 배포된 식단 분석 기능에서 사용할 실제 키.

NPM 관리자 계정이나 인증서는 `.envserver`에 저장하지 않습니다.

## 2. 서버 시작

필수 조건은 Docker Engine과 Docker Compose v2입니다.

```bash
./start-server.sh
```

스크립트는 다음 순서로 동작합니다.

1. `.envserver`가 없으면 테스트용 예제 파일을 자동 복사 (크리덴셜 유효성은 검사하지 않음)
2. `docker-compose.server.yml` 유효성 검사
3. FastAPI 이미지 빌드 후 PostgreSQL과 Redis 기동
4. PostgreSQL과 Redis 준비 상태 확인
5. 기존 FastAPI 컨테이너를 중지한 뒤 일회성 컨테이너로 `alembic upgrade head` 실행
6. FastAPI 기동 및 `/health` 확인

스크립트는 개발용 시드 계정을 만들지 않고, 볼륨을 삭제하지 않으며, 다른
프로세스를 종료하지 않습니다. 다시 실행해도 기존 Docker 볼륨과 데이터를 유지합니다.

## 3. Nginx Proxy Manager 수동 설정

NPM의 Proxy Host를 다음 경계에 맞게 설정합니다. UI 명칭은 NPM 버전에 따라 다를 수
있습니다.

| 항목 | 값 |
|---|---|
| Domain Names | `1mnhomenetwork.iptime.org` |
| Scheme | `http` |
| Forward Hostname / IP | Kelpus 서버의 LAN IP |
| Forward Port | `.envserver`의 `API_UPSTREAM_PORT` |
| TLS certificate | NPM에서 해당 호스트용으로 관리 |
| Force SSL | 활성화 권장 |

기존 공유기/NPM 구성이 외부 `30001`을 이 Proxy Host의 HTTPS 리스너로 전달해야 최종
주소가 `https://1mnhomenetwork.iptime.org:30001`이 됩니다. 포트 포워딩, DDNS, NPM
인증서 생성은 이 저장소와 `start-server.sh`가 변경하지 않습니다.

NPM 장비에서 먼저 private upstream을 검사합니다.

```bash
curl http://<KELPUS_SERVER_LAN_IP>:<API_UPSTREAM_PORT>/health
```

그 후 외부 또는 별도 네트워크에서 공개 경로를 검사합니다.

```bash
curl https://1mnhomenetwork.iptime.org:30001/health
```

## 4. LAN 접근 제한

운영 Compose는 PostgreSQL과 Redis 포트를 호스트에 게시하지 않습니다. FastAPI
upstream은 NPM이 다른 장비에 있으므로 LAN에서 접근 가능해야 합니다. 가능하면 Kelpus
서버의 호스트 방화벽에서 `API_UPSTREAM_PORT`의 소스 주소를 NPM 장비 IP로 제한하십시오.

방화벽 명령은 OS와 네트워크 정책에 따라 달라 이 저장소에서 자동화하지 않습니다.
NPM 이외의 LAN 장비에서 upstream이 열려 있다는 이유만으로 공개 인터넷에도 열려
있다고 단정하지 말고, 공유기 포트 포워딩 규칙도 별도로 점검하십시오.

## 5. 앱 API 주소

React Native 앱을 빌드하는 환경에서 다음 값을 사용합니다.

```dotenv
API_BASE_URL=https://1mnhomenetwork.iptime.org:30001
```

이 배포 절차는 앱 자체를 빌드하거나 배포하지 않습니다.

## 상태 확인과 문제 해결

운영 Compose 명령에는 항상 같은 환경 파일과 Compose 파일을 지정합니다.

```bash
docker compose --env-file .envserver -f docker-compose.server.yml -p kelpus-server ps
docker compose --env-file .envserver -f docker-compose.server.yml -p kelpus-server logs backend
docker compose --env-file .envserver -f docker-compose.server.yml -p kelpus-server logs postgres redis
```

- 스크립트가 즉시 실패하면 오류에 표시된 **키 이름**을 수정합니다. 비밀값 자체는
  출력되지 않습니다.
- private health check만 실패하면 Kelpus 서버 바인딩 주소, 호스트 방화벽, NPM 장비의
  LAN 경로를 확인합니다.
- private health check는 성공하지만 public health check가 실패하면 NPM Proxy Host,
  인증서, 외부 `30001` 전달 규칙을 확인합니다.
- 마이그레이션이 실패하면 backend 로그와 PostgreSQL 로그를 확인합니다. 볼륨을
  삭제하여 우회하지 마십시오.
