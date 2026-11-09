#!/usr/bin/env bash
# =============================================================================
# EnerKrut — деплой на VPS.
#
# Предполагается, что на хосте уже настроены:
#   - Docker + docker compose;
#   - реальный домен, указывающий на сервер;
#   - reverse proxy с TLS (Caddy/Traefik/nginx + Certbot), который проксирует
#     https://домен -> http://127.0.0.1:80 (контейнер web).
#
# Скрипт только обновляет код, пересобирает образы, поднимает контейнеры,
# применяет миграции и (опционально) выполняет seed.
#
# Запуск: bash scripts/deploy-vps.sh
# Переменные: SKIP_GIT_PULL=1 — не делать git pull;
#             SEED_ON_DEPLOY=true — выполнить seed после миграций.
# =============================================================================
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warning]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

if [[ ! -f .env ]]; then
  fail "Нет файла .env. Скопируй .env.example в .env и заполни значения."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:=postgres}"
: "${POSTGRES_DB:=enerkrut}"
: "${WEBAPP_URL:=}"
: "${BOT_TOKEN:=}"

if [[ -z "$WEBAPP_URL" || "$WEBAPP_URL" == "http://localhost" ]]; then
  warn "WEBAPP_URL не задан. Укажи реальный https://домен в .env."
fi
if [[ -z "$BOT_TOKEN" || "$BOT_TOKEN" == "TEST_TOKEN" ]]; then
  warn "BOT_TOKEN не задан — проверка initData будет работать в демо-режиме."
fi

cat > apps/api/.env <<EOF
# Сгенерировано scripts/deploy-vps.sh — не редактируй вручную.
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
BOT_TOKEN=${BOT_TOKEN}
PORT=3000
NODE_ENV=production
EOF

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "Обновляю код из git..."
  git pull --ff-only || warn "git pull не удался — продолжаю с текущим кодом"
fi

log "Собираю образы..."
"${COMPOSE[@]}" build --pull

log "Запускаю контейнеры..."
"${COMPOSE[@]}" up -d --remove-orphans

wait_healthy() {
  local service="$1"
  local container=""
  local status=""
  local attempt
  for attempt in $(seq 1 90); do
    container="$("${COMPOSE[@]}" ps -q "$service" 2>/dev/null || true)"
    if [[ -n "$container" ]]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo starting)"
    else
      status="starting"
    fi
    if [[ "$status" == "healthy" ]]; then
      ok "Сервис ${service}: healthy"
      return 0
    fi
    if [[ "$status" == "unhealthy" ]]; then
      fail "Сервис ${service} unhealthy"
      "${COMPOSE[@]}" logs --tail 80 "$service" || true
      return 1
    fi
    sleep 2
  done
  fail "Сервис ${service} не стал healthy"
  "${COMPOSE[@]}" logs --tail 80 "$service" || true
  return 1
}

wait_healthy postgres
wait_healthy api
wait_healthy web

log "Применяю миграции Prisma..."
"${COMPOSE[@]}" exec -T api npx prisma migrate deploy
ok "Миграции применены"

if [[ "${SEED_ON_DEPLOY:-false}" == "true" ]]; then
  log "Выполняю seed..."
  "${COMPOSE[@]}" exec -T api pnpm run seed
  ok "Seed выполнен"
fi

printf '\n'
printf '============================================================\n'
printf '  EnerKrut развёрнут на VPS\n'
printf '  Публичный URL: %s\n' "${WEBAPP_URL:-http://<IP-сервера>}"
printf '  Контейнер web слушает 0.0.0.0:80\n'
printf '============================================================\n'
