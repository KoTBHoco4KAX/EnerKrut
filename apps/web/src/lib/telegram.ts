import { useEffect } from "react";
import WebApp from "@twa-dev/sdk";

export type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type NotificationStyle = "error" | "success" | "warning";

type HexColor = `#${string}`;

function rgbToHex(color: string): HexColor | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match === null) {
    return null;
  }
  const [, red, green, blue] = match;
  if (red === undefined || green === undefined || blue === undefined) {
    return null;
  }
  return `#${[red, green, blue]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}` as HexColor;
}

function themeBackground(): HexColor | null {
  const probe = document.createElement("div");
  probe.className = "bg-bg-base";
  probe.style.position = "fixed";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const color = window.getComputedStyle(probe).backgroundColor;
  probe.remove();
  return rgbToHex(color);
}

export function initTelegram(): void {
  try {
    WebApp.ready();
    WebApp.expand();
    const background = themeBackground();
    if (background !== null) {
      WebApp.setHeaderColor(background);
      WebApp.setBackgroundColor(background);
    }
    WebApp.disableVerticalSwipes();
  } catch {
    return;
  }
}

type TelegramWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: { user?: unknown };
    };
  };
};

/** initData может прийти в hash — так делает Telegram Web (браузер). */
function initDataFromHash(): string {
  const rawHash = window.location.hash.replace(/^#/, "");
  if (rawHash.length === 0) {
    return "";
  }
  const value = new URLSearchParams(rawHash).get("tgWebAppData");
  return value ?? "";
}

/** true, если страница открыта внутри Telegram (или в Telegram Web). */
export function isTelegramEnvironment(): boolean {
  const telegram = (window as unknown as TelegramWindow).Telegram;
  if (telegram?.WebApp !== undefined) {
    return true;
  }
  return window.location.hash.includes("tgWebAppData");
}

export function getTelegramInitData(): string {
  try {
    const initData = WebApp.initData;
    if (initData.length > 0) {
      return initData;
    }
  } catch {
    // SDK недоступен (браузер вне Telegram) — пробуем hash.
  }
  return initDataFromHash();
}

export async function refreshTelegramInitData(): Promise<string> {
  return getTelegramInitData();
}

export function haptic(kind: "impact", style: ImpactStyle): void;
export function haptic(kind: "notification", style: NotificationStyle): void;
export function haptic(
  kind: "impact" | "notification",
  style: ImpactStyle | NotificationStyle,
): void {
  try {
    if (kind === "impact") {
      WebApp.HapticFeedback.impactOccurred(style as ImpactStyle);
      return;
    }
    WebApp.HapticFeedback.notificationOccurred(style as NotificationStyle);
  } catch {
    return;
  }
}

export function telegramBackButton(onBack: () => void, enabled = true): () => void {
  if (!enabled) {
    return () => undefined;
  }
  try {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(onBack);
    return () => {
      WebApp.BackButton.offClick(onBack);
      WebApp.BackButton.hide();
    };
  } catch {
    return () => undefined;
  }
}

export function useTelegramBack(onBack: () => void, enabled = true): void {
  useEffect(() => telegramBackButton(onBack, enabled), [onBack, enabled]);
}
