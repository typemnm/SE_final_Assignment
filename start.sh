#!/usr/bin/env bash
# Kelpus 개발 서버 일괄 시작 스크립트
# 사용법: ./start.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/kelpus"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[kelpus]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}   $1"; }
error(){ echo -e "${RED}[error]${NC}  $1"; exit 1; }

BACKEND_PID=""
FRONTEND_PID=""

if docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  error "Docker Compose를 찾을 수 없습니다. 'docker compose' 또는 'docker-compose' 설치를 확인하세요."
fi

# 포트를 사용 중인 프로세스 종료 (lsof 없으면 fuser 사용)
free_port() {
  local port=$1
  local pid=""
  if command -v lsof &>/dev/null; then
    pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  elif command -v fuser &>/dev/null; then
    pid=$(fuser "${port}/tcp" 2>/dev/null | tr -s ' ' '\n' | grep -v '^$' || true)
  fi
  if [ -n "$pid" ]; then
    warn "포트 $port 사용 중 → 기존 프로세스($pid) 종료"
    kill $pid 2>/dev/null || true
    sleep 1
    kill -9 $pid 2>/dev/null || true
  fi
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local pid_to_check="${3:-}"

  for i in $(seq 1 30); do
    if [ -n "$pid_to_check" ] && ! kill -0 "$pid_to_check" 2>/dev/null; then
      error "$name 프로세스가 시작 직후 종료되었습니다. 위 로그를 확인하세요."
    fi

    if .venv/bin/python - "$url" &>/dev/null <<'PY'
import sys
from urllib.request import urlopen

try:
    with urlopen(sys.argv[1], timeout=1) as response:
        if 200 <= response.status < 500:
            raise SystemExit(0)
except Exception:
    pass
raise SystemExit(1)
PY
    then
      log "$name 준비 완료"
      return 0
    fi
    sleep 1
  done

  error "$name 준비 시간 초과: $url"
}

ensure_venv_pip() {
  if .venv/bin/python -m pip --version &>/dev/null; then
    return 0
  fi

  warn "가상환경에 pip가 없어 자동 설치를 시도합니다."
  if .venv/bin/python -m ensurepip --upgrade &>/dev/null; then
    return 0
  fi

  if python3 -m pip --help 2>/dev/null | grep -q -- '--python'; then
    python3 -m pip --python .venv install --upgrade pip setuptools wheel
    return 0
  fi

  error "가상환경에 pip를 설치할 수 없습니다. python3-venv/python3-pip 설치를 확인하세요."
}

# Python 3.11+ 경로 탐색 (pyenv 3.12/3.11 → 시스템 python3.12/python3.11 → python3 순)
find_python() {
  local pyenv_root="${PYENV_ROOT:-$HOME/.pyenv}"
  local py=""

  if [ -d "$pyenv_root/versions" ]; then
    py=$(find "$pyenv_root/versions" -path "*/3.12*/bin/python" -name python 2>/dev/null | sort -V | tail -1 || true)
    if [ -z "$py" ]; then
      py=$(find "$pyenv_root/versions" -path "*/3.11*/bin/python" -name python 2>/dev/null | sort -V | tail -1 || true)
    fi
  fi
  if [ -n "$py" ] && [ -x "$py" ]; then echo "$py"; return 0; fi

  if command -v python3.12 &>/dev/null; then command -v python3.12; return 0; fi
  if command -v python3.11 &>/dev/null; then command -v python3.11; return 0; fi
  if command -v python3    &>/dev/null; then command -v python3; return 0; fi
  error "Python 3.11 이상을 찾을 수 없습니다. Python을 설치해주세요."
}

cleanup() {
  echo ""
  log "서버 종료 중..."
  # 프로세스 그룹 전체 종료 (uvicorn 자식 포함)
  [ -n "$BACKEND_PID" ]  && kill -- -"$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill -- -"$FRONTEND_PID" 2>/dev/null || true
  log "종료 완료. PostgreSQL 컨테이너는 계속 실행 중입니다."
  log "  중지하려면: $COMPOSE_CMD stop postgres"
}
trap cleanup EXIT
trap 'trap - EXIT; cleanup; exit 130' INT
trap 'trap - EXIT; cleanup; exit 143' TERM

# ── 사전 요구사항 확인 ─────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  error "Docker를 찾을 수 없습니다. Docker Desktop WSL 통합을 확인하세요."
fi
if ! command -v npm &>/dev/null; then
  error "npm을 찾을 수 없습니다. Node.js 18 이상을 설치해주세요."
fi
if ! command -v setsid &>/dev/null; then
  error "setsid를 찾을 수 없습니다. (util-linux 패키지) 설치를 확인하세요."
fi

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
log "PostgreSQL 시작 중..."
cd "$ROOT_DIR"
$COMPOSE_CMD up -d postgres

log "PostgreSQL 준비 대기 중..."
for i in $(seq 1 30); do
  if docker exec kelpus-postgres pg_isready -U kelpus &>/dev/null 2>&1; then
    log "PostgreSQL 준비 완료"
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && error "PostgreSQL 시작 시간 초과. '$COMPOSE_CMD logs postgres' 로 확인하세요."
done

# start.sh는 Docker Compose로 띄운 PostgreSQL에 로컬 백엔드를 연결한다.
# backend/.env.example의 user/password 기본값은 compose DB 계정과 달라 인증 실패가 나므로,
# 이 스크립트 실행 중에는 compose 기본 접속 정보를 명시적으로 우선 적용한다.
export DATABASE_URL="${KELPUS_DATABASE_URL:-postgresql+asyncpg://kelpus:kelpus_password@localhost:5432/kelpus}"
export REDIS_URL="${KELPUS_REDIS_URL:-redis://localhost:6379/0}"

# ── 2. 백엔드 가상환경 및 패키지 ──────────────────────────────────────────────
cd "$BACKEND_DIR"

if [ ! -f .env ]; then
  warn ".env 없음 → .env.example 복사 (docker-compose 기본값 적용됨)"
  cp .env.example .env
fi

if [ ! -d .venv ]; then
  log "Python 가상환경 생성 중..."
  PYTHON=$(find_python)
  "$PYTHON" -m venv .venv
fi

ensure_venv_pip

if ! .venv/bin/python -c "import fastapi" &>/dev/null 2>&1; then
  log "백엔드 패키지 설치 중..."
  .venv/bin/python -m pip install -r requirements.txt -q
fi

log "DB 마이그레이션 실행 중..."
if ! PYTHONPATH=. .venv/bin/alembic upgrade head; then
  error "Alembic 마이그레이션 실패. 위 로그를 확인하세요."
fi

log "시드 계정 확인 중..."
if ! .venv/bin/python -m app.seed; then
  warn "시드 실패. DB 연결을 확인하세요 (서버는 계속 시작합니다)."
fi

free_port 8000
log "백엔드 서버 시작 중..."
# process substitution으로 $!에 uvicorn PID가 정확히 잡힘
setsid .venv/bin/uvicorn app.main:app --reload --port 8000 \
  > >(sed 's/^/\x1b[36m[backend]\x1b[0m /') 2>&1 &
BACKEND_PID=$!
wait_for_url "백엔드" "http://127.0.0.1:8000/health" "$BACKEND_PID"

# ── 3. 프론트엔드 ─────────────────────────────────────────────────────────────
cd "$FRONTEND_DIR"

if [ ! -d node_modules ]; then
  log "프론트엔드 패키지 설치 중..."
  npm install --silent
fi

free_port 8080
log "프론트엔드 시작 중..."
setsid npm run web \
  > >(sed 's/^/\x1b[35m[frontend]\x1b[0m /') 2>&1 &
FRONTEND_PID=$!
cd "$BACKEND_DIR"
wait_for_url "프론트엔드" "http://127.0.0.1:8080" "$FRONTEND_PID"

# ── 완료 안내 ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Kelpus 개발 서버 실행 중${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  프론트엔드:  http://localhost:8080"
echo -e "  백엔드 API:  http://localhost:8000"
echo -e "  Swagger UI:  http://localhost:8000/docs"
echo -e "${GREEN}========================================${NC}"
echo -e "  종료: Ctrl+C"
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
