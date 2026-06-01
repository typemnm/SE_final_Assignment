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

# 포트를 사용 중인 프로세스 종료
free_port() {
  local port=$1
  local pid
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    warn "포트 $port 사용 중 → 기존 프로세스($pid) 종료"
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
}

cleanup() {
  echo ""
  log "서버 종료 중..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  log "종료 완료. PostgreSQL 컨테이너는 계속 실행 중입니다."
  log "  중지하려면: docker compose stop postgres"
}
trap cleanup EXIT INT TERM

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  error "Docker를 찾을 수 없습니다. Docker Desktop WSL 통합을 확인하세요."
fi

log "PostgreSQL 시작 중..."
cd "$ROOT_DIR"
docker compose up -d postgres 2>/dev/null

log "PostgreSQL 준비 대기 중..."
for i in $(seq 1 30); do
  if docker exec kelpus-postgres pg_isready -U kelpus &>/dev/null 2>&1; then
    log "PostgreSQL 준비 완료"
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && error "PostgreSQL 시작 시간 초과. 'docker compose logs postgres' 확인"
done

# ── 2. 백엔드 가상환경 및 패키지 ──────────────────────────────────────────────
cd "$BACKEND_DIR"

if [ ! -f .env ]; then
  warn ".env 없음 → .env.example 복사"
  cp .env.example .env
fi

if [ ! -d .venv ]; then
  log "Python 가상환경 생성 중..."
  # pyenv 3.12 우선, 없으면 시스템 python3 사용
  if [ -x "$HOME/.pyenv/versions/3.12.0/bin/python" ]; then
    "$HOME/.pyenv/versions/3.12.0/bin/python" -m venv .venv
  else
    python3 -m venv .venv
  fi
fi

if ! .venv/bin/python -c "import fastapi" &>/dev/null 2>&1; then
  log "백엔드 패키지 설치 중..."
  .venv/bin/pip install -r requirements.txt -q
  .venv/bin/pip install "bcrypt==4.0.1" -q  # passlib 1.7.4 호환
fi

log "시드 계정 확인 중..."
.venv/bin/python -m app.seed 2>/dev/null || true

free_port 8000
log "백엔드 서버 시작 중..."
{ .venv/bin/uvicorn app.main:app --reload --port 8000 2>&1 | sed 's/^/\x1b[36m[backend]\x1b[0m /'; } &
BACKEND_PID=$!

# ── 3. 프론트엔드 ─────────────────────────────────────────────────────────────
cd "$FRONTEND_DIR"

if [ ! -d node_modules ]; then
  log "프론트엔드 패키지 설치 중..."
  npm install --silent
fi

free_port 8080
log "프론트엔드 시작 중..."
{ npm run web 2>&1 | sed 's/^/\x1b[35m[frontend]\x1b[0m /'; } &
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
