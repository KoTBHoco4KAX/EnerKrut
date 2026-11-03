import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastHost } from "../src/components/ToastHost";
import { InventoryScreen } from "../src/screens/InventoryScreen";
import {
  installFetch,
  inventoryPageFixture,
  jsonResponse,
  meFixture,
  renderWithProviders,
  resetAppState,
} from "./helpers";

describe("InventoryScreen", () => {
  it("shows the pending empty state and the lambard panel below 300 rubles", async () => {
    resetAppState();
    installFetch((url) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(
          meFixture({ balanceRub: 100, keys: { gray: 2, color: 0, engraved: 0, gold: 0 } }),
        );
      }
      if (url.includes("/me/inventory")) {
        return jsonResponse(inventoryPageFixture({ items: [] }));
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    renderWithProviders(
      <>
        <InventoryScreen />
        <ToastHost />
      </>,
      { route: "/inventory" },
    );
    expect(
      await screen.findByText("Пока пусто. Открой кейс, чтобы начать"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ты на мели")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Сдать" })).toHaveLength(4);
  });

  it("sells a single key to the lambard", async () => {
    resetAppState();
    installFetch((url, init) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(
          meFixture({ balanceRub: 100, keys: { gray: 2, color: 0, engraved: 0, gold: 0 } }),
        );
      }
      if (url.includes("/me/inventory")) {
        return jsonResponse(inventoryPageFixture({ items: [] }));
      }
      if (url.endsWith("/api/lambard/sell") && init?.method === "POST") {
        return jsonResponse({ rubsAdded: 15, balanceRub: 115, keyBalanceAfter: 1 });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <InventoryScreen />
        <ToastHost />
      </>,
      { route: "/inventory" },
    );
    await screen.findByText("Ты на мели");
    await user.click(screen.getAllByRole("button", { name: "Сдать" })[0] as HTMLElement);
    expect(await screen.findByText("+15 ₽")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/lambard/sell"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("expands a pending item and sells it", async () => {
    resetAppState();
    installFetch((url, init) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture({ balanceRub: 100 }));
      }
      if (url.includes("/me/inventory")) {
        return jsonResponse(inventoryPageFixture());
      }
      if (url.includes("/drops/") && url.endsWith("/sell") && init?.method === "POST") {
        return jsonResponse({
          dropId: "22222222-2222-4222-8222-222222222222",
          priceRub: 100,
          balanceRub: 200,
        });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <InventoryScreen />
        <ToastHost />
      </>,
      { route: "/inventory" },
    );
    expect(await screen.findByText("Flash Original 1998")).toBeInTheDocument();
    await user.click(screen.getByText("Flash Original 1998"));
    await user.click(screen.getByRole("button", { name: "Продать" }));
    await waitFor(() => {
      expect(screen.getByText("+100 ₽")).toBeInTheDocument();
    });
  });
});
