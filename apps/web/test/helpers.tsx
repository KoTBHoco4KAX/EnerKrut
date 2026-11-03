import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { vi } from "vitest";
import {
  Condition,
  ContainerType,
  KeyGrade,
  Rarity,
} from "@enerkrut/shared";
import type {
  DropsResponse,
  InventoryResponse,
  MeResponse,
  OpenCaseResponse,
  PublicCase,
} from "@enerkrut/shared";
import { useAuthStore } from "../src/stores/auth";
import { useToastStore } from "../src/stores/toast";

export const CASE_FIXTURES: PublicCase[] = [
  {
    id: "pyaterochka_fridge",
    slug: "pyaterochka_fridge",
    displayName: "Холодильник в «Пятёрочке»",
    description: "Массмаркет",
    priceRub: 100,
    priceStarsAlt: null,
    coverUrl: "/cdn/cases/pyaterochka_fridge.webp",
    order: 1,
    minBpmRequired: 0,
    hasVendingMachine: true,
  },
  {
    id: "tabachka_ip",
    slug: "tabachka_ip",
    displayName: "Табачка у ИП",
    description: "Серый импорт",
    priceRub: 350,
    priceStarsAlt: null,
    coverUrl: "/cdn/cases/tabachka_ip.webp",
    order: 2,
    minBpmRequired: 0,
    hasVendingMachine: true,
  },
  {
    id: "tokyo_jidohanbai",
    slug: "tokyo_jidohanbai",
    displayName: "Токийский Дзидоханбайки",
    description: "Автомат",
    priceRub: 800,
    priceStarsAlt: null,
    coverUrl: "/cdn/cases/tokyo_jidohanbai.webp",
    order: 3,
    minBpmRequired: 0,
    hasVendingMachine: true,
  },
  {
    id: "duty_free_airport",
    slug: "duty_free_airport",
    displayName: "Дьюти-Фри / Аэропорт",
    description: "Премиум",
    priceRub: 1800,
    priceStarsAlt: null,
    coverUrl: "/cdn/cases/duty_free_airport.webp",
    order: 4,
    minBpmRequired: 0,
    hasVendingMachine: false,
  },
  {
    id: "avito_garage_clean",
    slug: "avito_garage_clean",
    displayName: "Лот на Авито / Гараж",
    description: "Архив",
    priceRub: 4500,
    priceStarsAlt: null,
    coverUrl: "/cdn/cases/avito_garage_clean.webp",
    order: 5,
    minBpmRequired: 0,
    hasVendingMachine: false,
  },
  {
    id: "ebay_private_auction",
    slug: "ebay_private_auction",
    displayName: "Аукцион eBay",
    description: "Коллекционный",
    priceRub: 10000,
    priceStarsAlt: null,
    coverUrl: "/cdn/cases/ebay_private_auction.webp",
    order: 6,
    minBpmRequired: 120,
    hasVendingMachine: false,
  },
];

export function meFixture(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    telegramId: "777000123",
    balanceRub: 10_000,
    balanceStars: 0,
    keys: { gray: 0, color: 0, engraved: 0, gold: 0 },
    bpmCurrent: 60,
    tachycardia: { active: false },
    vipTier: 0,
    vipExpiresAt: null,
    ...overrides,
  };
}

export function openFixture(
  overrides: Partial<OpenCaseResponse> = {},
): OpenCaseResponse {
  return {
    status: "opened",
    dropId: "11111111-1111-4111-8111-111111111111",
    item: {
      id: "py_flash_original_1998",
      displayName: "Flash Original 1998",
      rarity: Rarity.Common,
      condition: Condition.Mint,
      containerType: ContainerType.Can,
      imageUrl: "/cdn/items/py_flash_original_1998.webp",
      imageThumbUrl: "/cdn/items/py_flash_original_1998_thumb.webp",
      flavorNotes: "классический энергетический профиль",
    },
    servedPriceRub: 100,
    tachycardia: { active: false },
    ...overrides,
  };
}

export function inventoryPageFixture(
  overrides: Partial<InventoryResponse> = {},
): InventoryResponse {
  return {
    items: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        itemId: "py_flash_original_1998",
        condition: Condition.Mint,
        state: "pending",
        servedPriceRub: 100,
        decision: null,
        decisionAt: null,
        obtainedAt: new Date().toISOString(),
        obtainedFromCase: "pyaterochka_fridge",
        keyGrade: KeyGrade.Gray,
        item: {
          id: "py_flash_original_1998",
          displayName: "Flash Original 1998",
          rarity: Rarity.Common,
          condition: Condition.Mint,
          containerType: ContainerType.Can,
          imageUrl: "/cdn/items/py_flash_original_1998.webp",
          imageThumbUrl: "/cdn/items/py_flash_original_1998_thumb.webp",
          flavorNotes: "классический энергетический профиль",
        },
      },
    ],
    page: 1,
    pageSize: 50,
    ...overrides,
  };
}

export function dropsPageFixture(
  overrides: Partial<DropsResponse> = {},
): DropsResponse {
  return {
    drops: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        userId: "44444444-4444-4444-8444-444444444444",
        caseId: "pyaterochka_fridge",
        itemId: "py_flash_original_1998",
        rarity: Rarity.Common,
        condition: Condition.Mint,
        rollSeed: "0123456789abcdef0123456789abcdef",
        rollValueRarity: 1,
        rollValueItem: 1,
        weightsSnapshot: { version: 1 },
        servedPriceRub: 100,
        decision: null,
        decisionAt: null,
        createdAt: new Date().toISOString(),
        item: {
          id: "py_flash_original_1998",
          displayName: "Flash Original 1998",
          imageThumbUrl: "/cdn/items/py_flash_original_1998_thumb.webp",
          rarity: Rarity.Common,
        },
        case: {
          id: "pyaterochka_fridge",
          displayName: "Холодильник в «Пятёрочке»",
        },
      },
    ],
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function installFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      handler(String(input), init),
    ),
  );
}

export function resetAppState(): void {
  useAuthStore.setState({
    initData: "test-init-data",
    user: null,
    bpm: 60,
    tachycardia: { active: false },
    authExpired: false,
  });
  useToastStore.setState({ toasts: [] });
}

export function renderWithProviders(
  element: ReactElement,
  options: { route?: string; path?: string } = {},
): RenderResult {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const route = options.route ?? "/";
  const path = options.path ?? "*";
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function renderAppRoutes(
  routes: ReactElement,
  route: string,
): RenderResult {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{routes}</MemoryRouter>
    </QueryClientProvider>,
  );
}
