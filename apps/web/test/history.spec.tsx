import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Rarity } from "@enerkrut/shared";
import { HistoryScreen } from "../src/screens/HistoryScreen";
import {
  dropsPageFixture,
  installFetch,
  jsonResponse,
  meFixture,
  renderWithProviders,
  resetAppState,
} from "./helpers";

describe("HistoryScreen", () => {
  it("loads the second page through the infinite-scroll sentinel", async () => {
    resetAppState();
    let callback: IntersectionObserverCallback | null = null;
    class TriggerObserver {
      constructor(observerCallback: IntersectionObserverCallback) {
        callback = observerCallback;
      }
      observe(target: Element): void {
        callback?.(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve(): void {
        return;
      }
      disconnect(): void {
        return;
      }
    }
    vi.stubGlobal("IntersectionObserver", TriggerObserver);

    const firstPage = dropsPageFixture({
      nextCursor: "77777777-7777-4777-8777-777777777777",
    });
    const secondPage = dropsPageFixture({
      drops: [
        {
          ...dropsPageFixture().drops[0]!,
          id: "88888888-8888-4888-8888-888888888888",
          itemId: "duty_monster_java",
          item: {
            id: "duty_monster_java",
            displayName: "Monster Java Kona Blend",
            imageThumbUrl: "/cdn/items/duty_monster_java_thumb.webp",
            rarity: Rarity.Rare,
          },
          case: {
            id: "duty_free_airport",
            displayName: "Дьюти-Фри / Аэропорт",
          },
        },
      ],
    });

    installFetch((url) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture());
      }
      if (url.includes("/me/drops")) {
        return jsonResponse(
          url.includes("cursor=") ? secondPage : firstPage,
        );
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });

    renderWithProviders(<HistoryScreen />, { route: "/history" });
    expect(await screen.findByText("Flash Original 1998")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Monster Java Kona Blend")).toBeInTheDocument();
    });
  });
});
