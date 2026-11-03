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

export function getTelegramInitData(): string {
  try {
    return WebApp.initData;
  } catch {
    return "";
  }
}

export async function refreshTelegramInitData(): Promise<string> {
  try {
    return WebApp.initData;
  } catch {
    return "";
  }
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
