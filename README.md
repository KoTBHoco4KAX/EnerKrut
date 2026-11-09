# EnerKrut — Telegram Mini App «Коллекционер энергетиков»

Modules 1–2 and 4: persistence, seed data, validators, gacha/economy engine, the Fastify API and the Telegram Mini App frontend. Telegram Stars, shop and VIP are not included.

## Stack

- Node.js 20
- pnpm 9 workspaces
- TypeScript 5.4
- Fastify 4
- React 18 + Vite 5 + Tailwind CSS 3
- TanStack Query v5 + Zustand + React Router v6
- PostgreSQL 15
- Prisma 5
- Zod
- Vitest + Supertest + React Testing Library

## Repository layout

```
apps/api                 Fastify API, Prisma schema, migrations, seeds, scripts, tests
apps/web                 React/Vite Telegram Mini App
packages/shared          shared enums, Zod schemas and economy constants
data                     source-of-truth seed JSON files
tests                    Module 1 database and constraint tests
```

## Requirements

- Node.js 20.x
- pnpm 9.x (`npm install -g pnpm@9`)
- PostgreSQL 15 reachable at `localhost:5432`

## Docker: Codespaces и VPS

Проект полностью конфигурируется через корневой `.env` (образец — `.env.example`).
Внутри docker-сети API доступен по адресу `http://api:3000`, PostgreSQL — `postgres:5432`,
наружу смотрит только nginx на порту 80.

### GitHub Codespaces + Cloudflare Tunnel

```bash
cp .env.example .env      # укажи BOT_TOKEN от @BotFather
bash scripts/deploy-codespaces.sh
```

Скрипт собирает образы, ждёт healthy-статусы, применяет миграции, выполняет seed,
поднимает `cloudflared tunnel --url http://localhost:80`, вытаскивает
`https://*.trycloudflare.com` и автоматически вызывает Telegram Bot API
(`setChatMenuButton`), чтобы кнопка Mini App вела на этот URL.

### VPS с реальным доменом

1. Направь A-запись домена на сервер.
2. Настрой TLS-терминацию на хосте (Caddy / Traefik / nginx + Certbot) с проксированием
   на `127.0.0.1:80`.
3. Пропиши в `.env` `WEBAPP_URL=https://твой-домен` и реальный `BOT_TOKEN`.
4. Запусти:

```bash
bash scripts/deploy-vps.sh
```

Скрипт делает `git pull`, `docker compose -f docker-compose.yml -f docker-compose.prod.yml build`,
поднимает контейнеры, применяет миграции и (при `SEED_ON_DEPLOY=true`) выполняет seed.

### Полезное

```bash
docker compose ps                        # статусы и healthcheck
docker compose logs -f api               # логи API
docker compose exec -T api npx prisma migrate deploy
docker compose exec -T api pnpm run seed
```

## Local PostgreSQL

Start the bundled compose service:

```bash
docker compose up -d
```

It exposes PostgreSQL 15 on `localhost:5432` with user `postgres`, password `postgres` and database `enerkrut`.

Create the environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

`apps/api/.env` supports:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/enerkrut?schema=public"
BOT_TOKEN="TEST_TOKEN"
```

`BOT_TOKEN` is used for Telegram `initData` HMAC validation. If it is empty or absent, the development fallback `TEST_TOKEN` is used.

## Install and verify

```bash
pnpm install
pnpm -C apps/api prisma generate
pnpm -C apps/api prisma migrate deploy
pnpm -C apps/api run seed
pnpm -C apps/api run validate-seed
pnpm -C apps/api run test
```

For a completely fresh database use:

```bash
pnpm -C apps/api exec prisma migrate reset --force
```

`migrate reset` applies both migrations and, through the Prisma `seed` hook, runs the transactional seed again.

## Frontend

```bash
pnpm -C apps/api run dev
pnpm -C apps/web run dev
```

The web app is available at `http://localhost:5173` and reads `VITE_API_BASE_URL` from `apps/web/.env`. Without Telegram initData it shows the Telegram gate; Vite development mode also provides a fake-initData bypass for layout work.

The full frontend setup, BotFather instructions, dev bypass details and the manual checklist are in [apps/web/README.md](apps/web/README.md).

The public catalog endpoint is `GET /api/cases` (no auth, 60 requests per minute per IP). All other endpoints require `x-telegram-init-data`.

## Seed contents

- 501 items in `ItemsCatalog`
- 6 cases, three of them with `hasVendingMachine=true`
- 36 case rarity weights, every case sums to `1_000_000`
- 4 condition profiles
- 501 `CaseDropTable` rows
- 15 fictional eBay mythics, including Cheetah Chug, Staminan X, Overdose 90s and C-Can

The eBay case obeys the rule that only epic, legendary and fictional mythic items are allowed. The five rare slots from the source matrix are therefore realized as five additional epic items: 25 epic, 30 legendary and 15 fictional mythic, 70 items total.

## API

All endpoints require the `x-telegram-init-data` header. The auth hook validates the Telegram HMAC-SHA256 signature, rejects `auth_date` older than 24 hours and upserts the user. The BPM recalc hook runs before every handler.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/cases` | public active paid case catalog |
| POST | `/api/cases/:id/open` | open a case, optionally with `useTicket` |
| POST | `/api/drops/:id/sell` | sell a pending drop |
| POST | `/api/drops/:id/drink` | drink a pending drop and emit keys |
| POST | `/api/vending/:eventId/hit` | resolve a stuck-can vending event |
| POST | `/api/lambard/sell` | exchange keys for rubles below 300 ₽ |
| POST | `/api/craft/ticket` | craft a case ticket from keys |
| GET | `/api/me` | profile, balances, keys, BPM and tachycardia |
| GET | `/api/me/inventory` | pending/sold/drank inventory |
| GET | `/api/me/drops` | cursor-paginated drop history |

The open flow records `rollSeed`, `rollValueRarity`, `rollValueItem` and a full `weightsSnapshot` (rarity weights, item weights in selection order, condition weights and condition roll) in every `DropHistory` row, so each drop can be reconstructed from the snapshot.

## Data files

| File | Purpose |
| --- | --- |
| `data/items.seed.json` | item catalog with case placement and intra-rarity weight |
| `data/cases.seed.json` | six case definitions, including vending flags |
| `data/rarity_weights.seed.json` | rarity weights per case |
| `data/condition_profiles.json` | condition multipliers and allowed states |
| `data/drop_table.seed.json` | generated `CaseDropTable` artifact |

Regenerate the item catalog and drop table artifact:

```bash
pnpm -C apps/api exec tsx scripts/generate-items.ts
pnpm -C apps/api run generate-drop-table
```

## API workspace scripts

| Command | Action |
| --- | --- |
| `pnpm -C apps/api run dev` | start Fastify on port 3000 |
| `pnpm -C apps/api prisma <args>` | Prisma CLI |
| `pnpm -C apps/api run seed` | validate and upsert all seed data in one transaction |
| `pnpm -C apps/api run validate-seed` | validate schemas, rules 1–9 and the case/rarity matrix, exit 0/1 |
| `pnpm -C apps/api run generate-drop-table` | build `data/drop_table.seed.json` |
| `pnpm -C apps/api run test` | run Vitest and Supertest suites |
| `pnpm -C apps/api run typecheck` | TypeScript check |

## Tests

- Zod validation of every seed JSON collection
- rarity weight sums for all six cases
- full case × rarity matrix
- seed rules 1–9
- seed idempotency across two runs
- `TelegramPayment.telegramPaymentChargeId` uniqueness (Prisma P2002)
- `KeyLedger.balanceAfter` consistency with `User.keys*`
- price formula unit and property-based tests
- 10,000 seeded rarity rolls within 2% of the configured distribution
- BPM multipliers, decay, tachycardia and both decision branches
- parallel sell/drink races and FOR UPDATE ledger consistency
- every vending branch, idempotent hit and machine_ate charging
- lambard eligibility, key crafting, ticket consumption and drop-snapshot reproduction
- all Module 2 endpoints through Supertest with signed initData
- public case catalog, ordering, CORS and rate limit
- 17 frontend tests for showcase, open/rolling/result, sell/drink, vending, tachycardia, inventory, lambard, history pagination and formatting (`pnpm -C apps/web run test`)

