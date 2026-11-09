#!/usr/bin/env bash
# =============================================================================
# EnerKrut — деплой в GitHub Codespaces через Cloudflare Tunnel.
#
# Что делает скрипт:
#   1. Создаёт .env (если нет) и генерирует apps/api/.env;
#   2. Собирает и поднимает docker compose;
#   3. Ждёт healthy PostgreSQL и API;
#   4. Применяет миграции Prisma и выполняет seed;
#   5. Скачивает cloudflared и поднимает туннель на http://localhost:80;
#   6. Вытаскивает публичный https://*.trycloudflare.com URL;
#   7. Прописывает его в .env и настраивает меню Mini App у бота.
#
# Запуск: bash scripts/deploy-codespaces.sh
# =============================================================================
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warning]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

COMPOSE=(docker compose -f docker-compose.yml)
TOOLS_DIR=".tools"
TUNNEL_LOG="${TOOLS_DIR}/cloudflared.log"
TUNNEL_PID_FILE="${TOOLS_DIR}/cloudflared.pid"
TUNNEL_URL_FILE="${TOOLS_DIR}/tunnel-url.txt"
mkdir -p "$TOOLS_DIR"

# -----------------------------------------------------------------------------
# 1. Окружение
# -----------------------------------------------------------------------------
if [[ ! -f .env ]]; then
  cp .env.example .env
  GENERATED_PASSWORD="$(openssl rand -hex 16 2>/dev/null || echo "enerkrut$(date +%s)")"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${GENERATED_PASSWORD}|" .env
  warn "Создан .env из .env.example. Укажи BOT_TOKEN от @BotFather для работы в Telegram."
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:=postgres}"
: "${POSTGRES_DB:=enerkrut}"
: "${WEB_PORT:=80}"
: "${WEBAPP_URL:=http://localhost}"
: "${BOT_TOKEN:=}"

# apps/api/.env нужен для локального запуска (pnpm run dev) без Docker.
cat > apps/api/.env <<EOF
# Сгенерировано scripts/deploy-codespaces.sh — не редактируй вручную.
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
BOT_TOKEN=${BOT_TOKEN}
PORT=3000
NODE_ENV=production
EOF
ok "apps/api/.env обновлён (DATABASE_URL указывает на сервис postgres)"

# -----------------------------------------------------------------------------
# 2. Сборка и запуск контейнеров
# -----------------------------------------------------------------------------
log "Собираю и запускаю контейнеры (postgres, api, web)..."
"${COMPOSE[@]}" up -d --build --remove-orphans

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
      fail "Сервис ${service} перешёл в unhealthy"
      "${COMPOSE[@]}" logs --tail 80 "$service" || true
      return 1
    fi
    sleep 2
  done
  fail "Сервис ${service} не стал healthy за отведённое время"
  "${COMPOSE[@]}" logs --tail 80 "$service" || true
  return 1
}

log "Ожидаю готовности PostgreSQL..."
wait_healthy postgres

log "Ожидаю готовности API..."
wait_healthy api

log "Ожидаю готовности nginx..."
wait_healthy web

# -----------------------------------------------------------------------------
# 3. Миграции + seed
# -----------------------------------------------------------------------------
log "Применяю миграции Prisma..."
"${COMPOSE[@]}" exec -T api npx prisma migrate deploy
ok "Миграции применены"

log "Заполняю базу данными (seed)..."
"${COMPOSE[@]}" exec -T api pnpm run seed
ok "Seed выполнен"

# -----------------------------------------------------------------------------
# 4. Cloudflare Tunnel
# -----------------------------------------------------------------------------
case "$(uname -m)" in
  x86_64 | amd64) CF_ARCH="amd64" ;;
  aarch64 | arm64) CF_ARCH="arm64" ;;
  armv7l) CF_ARCH="arm" ;;
  *)
    fail "Неподдерживаемая архитектура: $(uname -m)"
    exit 1
    ;;
esac

CF_BIN="${TOOLS_DIR}/cloudflared"
if [[ ! -x "$CF_BIN" ]]; then
  log "Скачиваю cloudflared (linux-${CF_ARCH})..."
  curl -fsSL -o "$CF_BIN" \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
  chmod +x "$CF_BIN"
  ok "cloudflared скачан"
else
  ok "cloudflared уже установлен"
fi

if [[ -f "$TUNNEL_PID_FILE" ]] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
  warn "Останавливаю предыдущий туннель (pid $(cat "$TUNNEL_PID_FILE"))"
  kill "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null || true
  sleep 1
fi

rm -f "$TUNNEL_URL_FILE"
: > "$TUNNEL_LOG"

log "Запускаю Cloudflare Tunnel на http://localhost:${WEB_PORT}..."
nohup "$CF_BIN" tunnel --url "http://localhost:${WEB_PORT}" \
  --no-autoupdate --protocol http2 >"$TUNNEL_LOG" 2>&1 &
echo $! >"$TUNNEL_PID_FILE"

TUNNEL_URL=""
for _ in $(seq 1 90); do
  TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1 || true)"
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  fail "Не удалось получить URL туннеля. Лог: ${TUNNEL_LOG}"
  tail -n 40 "$TUNNEL_LOG" >&2 || true
  exit 1
fi

echo "$TUNNEL_URL" >"$TUNNEL_URL_FILE"
ok "Публичный URL туннеля: ${TUNNEL_URL}"

log "Проверяю доступность Mini App через туннель..."
TUNNEL_OK="no"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 10 "${TUNNEL_URL}/healthz" >/dev/null 2>&1; then
    TUNNEL_OK="yes"
    break
  fi
  sleep 1
done
if [[ "$TUNNEL_OK" == "yes" ]]; then
  ok "Mini App отвечает через туннель"
else
  warn "Туннель поднят, но проверка ещё не прошла. Открой URL вручную."
fi

# -----------------------------------------------------------------------------
# 5. Сохраняем URL и настраиваем Telegram
# -----------------------------------------------------------------------------
if grep -q '^WEBAPP_URL=' .env; then
  sed -i "s|^WEBAPP_URL=.*|WEBAPP_URL=${TUNNEL_URL}|" .env
else
  printf '\nWEBAPP_URL=%s\n' "$TUNNEL_URL" >>.env
fi
ok ".env: WEBAPP_URL=${TUNNEL_URL}"

telegram_request() {
  local method="$1"
  local payload="$2"
  curl -sS --max-time 20 -X POST \
    "https://api.telegram.org/bot${BOT_TOKEN}/${method}" \
    -H "Content-Type: application/json" \
    -d "$payload" || true
}

if [[ -z "$BOT_TOKEN" || "$BOT_TOKEN" == "TEST_TOKEN" ]]; then
  warn "BOT_TOKEN не задан (или TEST_TOKEN) — меню бота не настроено автоматически."
  warn "Вставь реальный токен в .env: BOT_TOKEN=123456:AA... и запусти скрипт снова."
else
  log "Проверяю BOT_TOKEN через Telegram API..."
  GET_ME="$(curl -sS --max-time 20 "https://api.telegram.org/bot${BOT_TOKEN}/getMe" || true)"
  if printf '%s' "$GET_ME" | grep -q '"ok":true'; then
    BOT_USERNAME_API="$(printf '%s' "$GET_ME" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')"
    ok "Бот найден: @${BOT_USERNAME_API:-unknown}"

    MENU_PAYLOAD="$(printf '{"menu_button":{"type":"web_app","text":"Играть","web_app":{"url":"%s"}}}' "$TUNNEL_URL")"
    MENU_RESPONSE="$(telegram_request setChatMenuButton "$MENU_PAYLOAD")"
    if printf '%s' "$MENU_RESPONSE" | grep -q '"ok":true'; then
      ok "Кнопка меню Mini App установлена на ${TUNNEL_URL}"
    else
      warn "Не удалось установить меню бота: ${MENU_RESPONSE}"
    fi

    # Дублируем ссылку в описании бота — удобно для проверки вручную.
    DESC_PAYLOAD="$(printf '{"description":"Коллекционер энергетиков. Mini App: %s"}' "$TUNNEL_URL")"
    DESC_RESPONSE="$(telegram_request setMyDescription "$DESC_PAYLOAD")"
    if printf '%s' "$DESC_RESPONSE" | grep -q '"ok":true'; then
      ok "Описание бота обновлено ссылкой на Mini App"
    else
      warn "Не удалось обновить описание бота (не критично)"
    fi
  else
    warn "Telegram отклонил BOT_TOKEN: ${GET_ME}"
    warn "Проверь токен в .env и запусти скрипт снова."
  fi
fi

printf '\n'
printf '============================================================\n'
printf '  EnerKrut развёрнут\n'
printf '  Mini App URL: %s\n' "$TUNNEL_URL"
printf '  Лог туннеля:  %s\n' "$TUNNEL_LOG"
printf '============================================================\n'
