import {
  ApiErrorSchema,
  CasesResponseSchema,
  CraftTicketResponseSchema,
  DrinkDropResponseSchema,
  DropsResponseSchema,
  InventoryResponseSchema,
  LambardSellResponseSchema,
  MeResponseSchema,
  OpenCaseResponseSchema,
  SellDropResponseSchema,
  VendingHitResponseSchema,
} from "@enerkrut/shared";
import type {
  CraftTicketBody,
  CraftTicketResponse,
  DrinkDropResponse,
  DropsResponse,
  InventoryResponse,
  LambardSellBody,
  LambardSellResponse,
  MeResponse,
  OpenCaseResponse,
  SellDropResponse,
  VendingHitResponse,
} from "@enerkrut/shared";
import type { CasesResponse, InventoryQuery } from "@enerkrut/shared";
import { refreshTelegramInitData } from "./telegram";
import { useAuthStore } from "../stores/auth";
import { showToast } from "../stores/toast";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

interface ResponseSchema<T> {
  parse: (value: unknown) => T;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  schema: ResponseSchema<T>,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const store = useAuthStore.getState();
  const headers = new Headers(init.headers);
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (store.initData.length > 0) {
    headers.set("x-telegram-init-data", store.initData);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    showToast("Сервер недоступен, повторите", "error");
    throw new ApiError(0, "network_error", "Сервер недоступен, повторите");
  }
  if (response.status === 401) {
    if (!retried) {
      const nextInitData = await refreshTelegramInitData();
      if (nextInitData.length > 0) {
        useAuthStore.getState().setInitData(nextInitData);
        return request(path, schema, init, true);
      }
    }
    useAuthStore.getState().setAuthExpired(true);
    throw new ApiError(401, "unauthorized", "Переоткрой мини-апп");
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(payload);
    const code = parsedError.success ? parsedError.data.code : "request_failed";
    const message = parsedError.success
      ? parsedError.data.message
      : "Не удалось выполнить запрос";
    if (response.status >= 500) {
      showToast("Сервер недоступен, повторите", "error");
    }
    if (response.status === 429) {
      showToast("Слишком много запросов, подожди", "warning");
    }
    throw new ApiError(response.status, code, message);
  }
  try {
    return schema.parse(payload);
  } catch (error) {
    showToast("Некорректный ответ сервера", "error");
    throw error;
  }
}

export const api = {
  getMe(): Promise<MeResponse> {
    return request("/me", MeResponseSchema);
  },
  getCases(): Promise<CasesResponse> {
    return request("/cases?isActive=true", CasesResponseSchema);
  },
  getInventory(decision?: InventoryQuery["decision"]): Promise<InventoryResponse> {
    const query =
      decision === undefined
        ? ""
        : `?decision=${encodeURIComponent(decision)}&pageSize=50`;
    return request(`/me/inventory${query}`, InventoryResponseSchema);
  },
  getDrops(cursor?: string): Promise<DropsResponse> {
    const params = new URLSearchParams({ limit: "30" });
    if (cursor !== undefined) {
      params.set("cursor", cursor);
    }
    return request(`/me/drops?${params.toString()}`, DropsResponseSchema);
  },
  openCase(caseId: string): Promise<OpenCaseResponse> {
    return request(
      `/cases/${encodeURIComponent(caseId)}/open`,
      OpenCaseResponseSchema,
      { method: "POST", body: JSON.stringify({}) },
    );
  },
  sellDrop(dropId: string): Promise<SellDropResponse> {
    return request(
      `/drops/${encodeURIComponent(dropId)}/sell`,
      SellDropResponseSchema,
      { method: "POST", body: JSON.stringify({}) },
    );
  },
  drinkDrop(dropId: string): Promise<DrinkDropResponse> {
    return request(
      `/drops/${encodeURIComponent(dropId)}/drink`,
      DrinkDropResponseSchema,
      { method: "POST", body: JSON.stringify({}) },
    );
  },
  vendingHit(eventId: string): Promise<VendingHitResponse> {
    return request(
      `/vending/${encodeURIComponent(eventId)}/hit`,
      VendingHitResponseSchema,
      { method: "POST", body: JSON.stringify({}) },
    );
  },
  lambardSell(body: LambardSellBody): Promise<LambardSellResponse> {
    return request("/lambard/sell", LambardSellResponseSchema, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  craftTicket(body: CraftTicketBody): Promise<CraftTicketResponse> {
    return request("/craft/ticket", CraftTicketResponseSchema, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
