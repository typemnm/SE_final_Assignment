#!/usr/bin/env bash
# Start the production Kelpus API stack behind Nginx Proxy Manager.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${KELPUS_ENV_FILE:-$ROOT_DIR/.envserver}"
COMPOSE_FILE="${KELPUS_COMPOSE_FILE:-$ROOT_DIR/docker-compose.server.yml}"
DOCKER_BIN="${KELPUS_DOCKER_BIN:-docker}"
WAIT_ATTEMPTS="${KELPUS_WAIT_ATTEMPTS:-30}"
WAIT_INTERVAL_SECONDS="${KELPUS_WAIT_INTERVAL_SECONDS:-2}"

log() { printf '[kelpus-server] %s\n' "$*"; }
warn() { printf '[kelpus-server] WARNING: %s\n' "$*" >&2; }
fail() { printf '[kelpus-server] ERROR: %s\n' "$*" >&2; exit 1; }

required_keys=(
  PUBLIC_API_URL API_BIND_ADDRESS API_UPSTREAM_PORT TRUSTED_PROXY_IPS
  CORS_ALLOWED_ORIGINS POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL
  AUTO_CREATE_TABLES
  REDIS_PASSWORD REDIS_URL JWT_SECRET_KEY JWT_ALGORITHM JWT_EXPIRE_MINUTES
  GEMINI_API_KEY GEMINI_MODEL GEMINI_API_BASE_URL
  FREE_PLAN_DAILY_LIMIT PREMIUM_PLAN_DAILY_LIMIT
)

read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r'
}

validate_environment() {
  [ -r "$ENV_FILE" ] || fail "Required environment file is missing or unreadable: $ENV_FILE (copy .envserver.example and fill it manually)"
  [ -r "$COMPOSE_FILE" ] || fail "Production Compose file is missing or unreadable: $COMPOSE_FILE"

  local key value
  for key in "${required_keys[@]}"; do
    value="$(read_env_value "$key")"
    [ -n "$value" ] || fail "Required setting is missing or empty in .envserver: $key"
    case "$value" in
      *CHANGE_ME*|*change-me*|your-*)
        fail "Required setting still contains a placeholder: $key"
        ;;
    esac
  done

  [ "$(read_env_value PUBLIC_API_URL)" = "https://kelpusapi.duckdns.org" ] \
    || fail "PUBLIC_API_URL must be https://kelpusapi.duckdns.org"
  [ "$(read_env_value AUTO_CREATE_TABLES)" = "false" ] \
    || fail "AUTO_CREATE_TABLES must be false so Alembic remains the production schema authority"

  case "$(read_env_value DATABASE_URL)" in
    postgresql+asyncpg://*@postgres:*) ;;
    *) fail "DATABASE_URL must use the production Compose hostname: postgres" ;;
  esac
  case "$(read_env_value REDIS_URL)" in
    redis://*@redis:*) ;;
    *) fail "REDIS_URL must use the production Compose hostname: redis" ;;
  esac

  local trusted_proxy_ips
  trusted_proxy_ips="$(read_env_value TRUSTED_PROXY_IPS)"
  trusted_proxy_ips="${trusted_proxy_ips//[[:space:]]/}"
  case ",$trusted_proxy_ips," in
    *,\*,*|*,0.0.0.0/0,*|*,::/0,*)
      fail "TRUSTED_PROXY_IPS must identify only the NPM host or a restricted LAN CIDR"
      ;;
  esac

  if command -v stat >/dev/null 2>&1; then
    local mode
    mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || true)"
    [ "$mode" = "600" ] || warn "$ENV_FILE permissions are $mode; chmod 600 is recommended"
  fi
}

wait_for_service() {
  local name="$1"
  shift
  local attempt
  for attempt in $(seq 1 "$WAIT_ATTEMPTS"); do
    if "$@" >/dev/null 2>&1; then
      log "$name is ready"
      return 0
    fi
    sleep "$WAIT_INTERVAL_SECONDS"
  done
  return 1
}

validate_environment
command -v "$DOCKER_BIN" >/dev/null 2>&1 || fail "Docker is not installed or not available in PATH"
"$DOCKER_BIN" compose version >/dev/null 2>&1 || fail "Docker Compose v2 is unavailable"
export KELPUS_RUNTIME_ENV_FILE="$ENV_FILE"

compose=(
  "$DOCKER_BIN" compose
  --env-file "$ENV_FILE"
  -f "$COMPOSE_FILE"
  --project-directory "$ROOT_DIR"
  -p kelpus-server
)

log "Validating production Compose configuration"
"${compose[@]}" config --quiet

log "Building FastAPI image"
"${compose[@]}" build backend

log "Starting PostgreSQL and Redis"
"${compose[@]}" up -d postgres redis

wait_for_service "PostgreSQL" \
  "${compose[@]}" exec -T postgres pg_isready -U "$(read_env_value POSTGRES_USER)" -d "$(read_env_value POSTGRES_DB)" \
  || fail "PostgreSQL did not become ready; inspect: ${compose[*]} logs postgres"

wait_for_service "Redis" \
  "${compose[@]}" exec -T redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping | grep -q PONG' \
  || fail "Redis did not become ready; inspect: ${compose[*]} logs redis"

log "Stopping the previous FastAPI container before migration"
"${compose[@]}" stop backend

log "Applying database migrations"
"${compose[@]}" run --rm --no-deps backend python -m alembic upgrade head

log "Starting FastAPI"
"${compose[@]}" up -d backend

wait_for_service "FastAPI" \
  "${compose[@]}" exec -T backend python -c \
  "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" \
  || fail "FastAPI health check failed; inspect: ${compose[*]} logs backend"

log "Deployment ready: $(read_env_value PUBLIC_API_URL)"
log "Private NPM upstream port: $(read_env_value API_UPSTREAM_PORT)"
