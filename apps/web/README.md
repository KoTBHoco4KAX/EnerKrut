# EnerKrut Web — Telegram Mini App

React 18 + Vite 5 + TypeScript 5.4 frontend for the «Коллекционер энергетиков» Mini App.

## Stack

- React 18
- Vite 5
- TypeScript 5.4
- Tailwind CSS 3
- Zustand
- TanStack Query v5
- React Router v6
- Framer Motion
- Lucide React
- `@twa-dev/sdk`
- Vitest + React Testing Library

## Environment

`apps/web/.env`:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

Copy `apps/web/.env.example` for a fresh checkout.

The API client sends `x-telegram-init-data` to every protected request. A 401 triggers one initData refresh and retry; a second 401 shows the «Переоткрой мини-апп» screen.

## Local development

Start the backend:

```bash
pnpm -C apps/api run dev
```

Start the frontend in another terminal:

```bash
pnpm -C apps/web run dev
```

Open `http://localhost:5173`.

Without Telegram initData the app shows the Telegram gate. In Vite development mode it also shows the button «Попробовать в браузере с фейк-initData». The button signs a development payload with `TEST_TOKEN`; the backend must use the same fallback token, which it does when `BOT_TOKEN` is empty or equal to `TEST_TOKEN`.

In a production build the same button appears only when the bundle is built with `VITE_ALLOW_DEV_AUTH=true` (Docker build arg / `.env`). Keep it `false` for a real release. If the app is opened inside Telegram but `initData` is missing, the gate explains the problem and offers a reload.

Telegram Web may deliver `tgWebAppData` in the URL hash; the client reads it as a fallback when `WebApp.initData` is empty and retries for ~3 seconds after load.

## Telegram setup

1. Create a bot with `@BotFather`.
2. Create a Mini App with `/newapp` or configure the menu button with `/setmenubutton`.
3. Use an HTTPS URL. For local work expose Vite with a tunnel, for example:

```bash
ngrok http 5173
```

4. Set the resulting `https://...` URL as the Mini App URL.
5. Put the real bot token into `apps/api/.env` as `BOT_TOKEN` and restart the API.

The frontend calls `ready()`, `expand()`, sets the fixed dark header color and disables vertical swipes on load.

## Build and test

```bash
pnpm -C apps/web run build
pnpm -C apps/web run test
```

`build` runs `tsc --noEmit` and `vite build`.

## Screens and routes

| Route | Screen |
| --- | --- |
| `/` | Cases showcase |
| `/inventory` | Pending / Sold / Drank inventory |
| `/history` | Infinite-scroll drop history |
| `/open/:caseId` | Case opening, vending and result flow |

The fixed bottom navigation contains Cases, Inventory and History. The open screen registers the Telegram BackButton and calls `history.back()`.

## Manual checklist

- Showcase displays six active paid cases and no Stars-only cases.
- Open `pyaterochka_fridge`, get a result, sell it, and verify the balance grows.
- Open a case, drink the drop, and verify a key is credited.
- With a balance below 300 ₽ open Inventory and verify the lambard panel is visible.
- eBay is blocked below 120 BPM and opens at 120+ BPM.
- For `pyaterochka_fridge`, `tabachka_ip` and `tokyo_jidohanbai` the vending machine can trigger with an 8% chance; the «Ебнуть по корпусу» action must resolve the event.
- Tachycardia shows the red ×2 badge and a ticking `mm:ss` timer.
- History loads the next page when the sentinel reaches the viewport.

## Layout

```
src/components   reusable UI primitives
src/screens      four routed screens
src/hooks        TanStack Query queries and mutations
src/lib          API client, Telegram SDK wrapper, formatting, dev auth
src/stores       Zustand auth and toast stores
test             Vitest + React Testing Library suites
```
