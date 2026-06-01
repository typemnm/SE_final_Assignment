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
  fi
}

# Python 3.12 경로 탐색 (pyenv 3.12.x → 시스템 python3.12 → python3 순)
find_python() {
  local pyenv_root="${PYENV_ROOT:-$HOME/.pyenv}"
  local py
  py=$(find "$pyenv_root/versions" -name "python" -path "*/3.12*/bin/python" 2>/dev/null | sort -V | tail -1)
  if [ -x "$py" ]; then echo "$py"; return; fi
  command -v python3.12 2>/dev/null && return
  command -v python3    2>/dev/null && return
  error "Python 3.12 이상을 찾을 수 없습니다. Python을 설치해주세요."
}

cleanup() {
  echo ""
  log "서버 종료 중..."
  # 프로세스 그룹 전체 종료 (uvicorn 자식 포함)
  [ -n "$BACKEND_PID" ]  && kill -- -"$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill -- -"$FRONTEND_PID" 2>/dev/null || true
  log "종료 완료. PostgreSQL 컨테이너는 계속 실행 중입니다."
  log "  중지하려면: docker compose stop postgres"
}
trap cleanup EXIT INT TERM

# ── 사전 요구사항 확인 ─────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  error "Docker를 찾을 수 없습니다. Docker Desktop WSL 통합을 확인하세요."
fi
if ! command -v npm &>/dev/null; then
  error "npm을 찾을 수 없습니다. Node.js 18 이상을 설치해주세요."
fi

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
log "PostgreSQL 시작 중..."
cd "$ROOT_DIR"
docker compose up -d postgres

log "PostgreSQL 준비 대기 중..."
for i in $(seq 1 30); do
  if docker exec kelpus-postgres pg_isready -U kelpus &>/dev/null 2>&1; then
    log "PostgreSQL 준비 완료"
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && error "PostgreSQL 시작 시간 초과. 'docker compose logs postgres' 로 확인하세요."
done

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

if ! .venv/bin/python -c "import fastapi" &>/dev/null 2>&1; then
  log "백엔드 패키지 설치 중..."
  .venv/bin/pip install -r requirements.txt -q
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

# ── 완료 안내 ─────────────────────────────────────────────────────────────────
sleep 2
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
