import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { VendingEventType } from "@enerkrut/shared";
import { ToastHost } from "../src/components/ToastHost";
import { OpenCaseScreen } from "../src/screens/OpenCaseScreen";
import {
  CASE_FIXTURES,
  installFetch,
  jsonResponse,
  meFixture,
  openFixture,
  renderAppRoutes,
  renderWithProviders,
  resetAppState,
} from "./helpers";

const VENDING_EVENT_ID = "55555555-5555-4555-8555-555555555555";

function baseHandler(
  openResponse: ReturnType<typeof openFixture>,
): (url: string, init?: RequestInit) => Response {
  return (url, init) => {
    if (url.endsWith("/api/me")) {
      return jsonResponse(meFixture({ balanceRub: 10_000 }));
    }
    if (url.includes("/api/cases?isActive=true")) {
      return jsonResponse({ cases: CASE_FIXTURES });
    }
    if (url.includes("/cases/pyaterochka_fridge/open") && init?.method === "POST") {
      return jsonResponse(openResponse);
    }
    return jsonResponse({ code: "not_found", message: "not found" }, 404);
  };
}

describe("OpenCaseScreen", () => {
  it("opens a case and shows the result after the rolling animation", async () => {
    resetAppState();
    installFetch(baseHandler(openFixture()));
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <OpenCaseScreen />
        <ToastHost />
      </>,
      { route: "/open/pyaterochka_fridge", path: "/open/:caseId" },
    );

    await user.click(
      await screen.findByRole("button", { name: "Открыть за 100 ₽" }),
    );
    expect(screen.getByText("Крутим…")).toBeInTheDocument();
    expect(
      await screen.findByRole(
        "heading",
        { name: "Flash Original 1998" },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Продать за 100 ₽")).toBeInTheDocument();
  });

  it("keeps idle and shows a toast when balance is insufficient", async () => {
    resetAppState();
    installFetch((url) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture({ balanceRub: 0 }));
      }
      if (url.includes("/api/cases?isActive=true")) {
        return jsonResponse({ cases: CASE_FIXTURES });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <OpenCaseScreen />
        <ToastHost />
      </>,
      { route: "/open/pyaterochka_fridge", path: "/open/:caseId" },
    );
    await user.click(
      await screen.findByRole("button", { name: "Открыть за 100 ₽" }),
    );
    expect(await screen.findByText("Недостаточно ₽")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Открыть за 100 ₽" }),
    ).toBeInTheDocument();
  });

  it("blocks the ebay case when BPM is below the requirement", async () => {
    resetAppState();
    installFetch((url) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture({ bpmCurrent: 60 }));
      }
      if (url.includes("/api/cases?isActive=true")) {
        return jsonResponse({ cases: CASE_FIXTURES });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    renderWithProviders(<OpenCaseScreen />, {
      route: "/open/ebay_private_auction",
      path: "/open/:caseId",
    });
    expect(
      await screen.findByText("Нужен пульс ≥ 120, у тебя 60."),
    ).toBeInTheDocument();
  });

  it("sells a drop and navigates to inventory", async () => {
    resetAppState();
    installFetch((url, init) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture());
      }
      if (url.includes("/api/cases?isActive=true")) {
        return jsonResponse({ cases: CASE_FIXTURES });
      }
      if (url.includes("/cases/pyaterochka_fridge/open") && init?.method === "POST") {
        return jsonResponse(openFixture());
      }
      if (url.includes("/drops/") && url.endsWith("/sell")) {
        return jsonResponse({
          dropId: "11111111-1111-4111-8111-111111111111",
          priceRub: 100,
          balanceRub: 10_100,
        });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    const user = userEvent.setup();
    renderAppRoutes(
      <>
        <Routes>
          <Route path="/open/:caseId" element={<OpenCaseScreen />} />
          <Route path="/inventory" element={<div>INVENTORY_PROBE</div>} />
        </Routes>
        <ToastHost />
      </>,
      "/open/pyaterochka_fridge",
    );
    await user.click(
      await screen.findByRole("button", { name: "Открыть за 100 ₽" }),
    );
    await user.click(
      await screen.findByRole(
        "button",
        { name: "Продать за 100 ₽" },
        { timeout: 4000 },
      ),
    );
    expect(await screen.findByText("INVENTORY_PROBE")).toBeInTheDocument();
    expect(screen.getByText("+100 ₽")).toBeInTheDocument();
  });

  it("drinks a drop and shows the emitted key", async () => {
    resetAppState();
    installFetch((url, init) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture());
      }
      if (url.includes("/api/cases?isActive=true")) {
        return jsonResponse({ cases: CASE_FIXTURES });
      }
      if (url.includes("/cases/pyaterochka_fridge/open") && init?.method === "POST") {
        return jsonResponse(openFixture());
      }
      if (url.includes("/drops/") && url.endsWith("/drink")) {
        return jsonResponse({
          dropId: "11111111-1111-4111-8111-111111111111",
          keyGrade: "gray",
          keyCount: 1,
          bpmCurrent: 65,
          keyBalanceAfter: 1,
        });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    const user = userEvent.setup();
    renderAppRoutes(
      <>
        <Routes>
          <Route path="/open/:caseId" element={<OpenCaseScreen />} />
          <Route path="/inventory" element={<div>INVENTORY_PROBE</div>} />
        </Routes>
        <ToastHost />
      </>,
      "/open/pyaterochka_fridge",
    );
    await user.click(
      await screen.findByRole("button", { name: "Открыть за 100 ₽" }),
    );
    await user.click(
      await screen.findByRole(
        "button",
        { name: "Открыть и выпить" },
        { timeout: 4000 },
      ),
    );
    expect(await screen.findByText("+1 Серый ключ")).toBeInTheDocument();
  });

  it("resolves a stuck vending can into a drop", async () => {
    resetAppState();
    const item = openFixture().item;
    if (item === undefined) {
      throw new Error("Drop fixture item is missing");
    }
    installFetch((url, init) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(meFixture());
      }
      if (url.includes("/api/cases?isActive=true")) {
        return jsonResponse({ cases: CASE_FIXTURES });
      }
      if (url.includes("/cases/pyaterochka_fridge/open") && init?.method === "POST") {
        return jsonResponse(
          openFixture({
            status: "pending_vending",
            dropId: undefined,
            item: undefined,
            servedPriceRub: undefined,
            eventId: VENDING_EVENT_ID,
            eventType: VendingEventType.StuckCanHit,
            caseId: "pyaterochka_fridge",
            priceRub: 100,
          }),
        );
      }
      if (url.includes(`/vending/${VENDING_EVENT_ID}/hit`)) {
        return jsonResponse({
          result: "single",
          drops: [
            {
              id: "66666666-6666-4666-8666-666666666666",
              item,
              servedPriceRub: 100,
            },
          ],
        });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <OpenCaseScreen />
        <ToastHost />
      </>,
      { route: "/open/pyaterochka_fridge", path: "/open/:caseId" },
    );
    await user.click(
      await screen.findByRole("button", { name: "Открыть за 100 ₽" }),
    );
    expect(
      await screen.findByText("Банка застряла на пружине", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ебнуть по корпусу" }));
    expect(
      await screen.findByRole("heading", { name: "Flash Original 1998" }),
    ).toBeInTheDocument();
  });

  it("shows the tachycardia badge from the profile", async () => {
    resetAppState();
    installFetch((url) => {
      if (url.endsWith("/api/me")) {
        return jsonResponse(
          meFixture({
            bpmCurrent: 130,
            tachycardia: {
              active: true,
              until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            },
          }),
        );
      }
      if (url.includes("/api/cases?isActive=true")) {
        return jsonResponse({ cases: CASE_FIXTURES });
      }
      return jsonResponse({ code: "not_found", message: "not found" }, 404);
    });
    renderWithProviders(<OpenCaseScreen />, {
      route: "/open/pyaterochka_fridge",
      path: "/open/:caseId",
    });
    expect(
      (await screen.findAllByText(/ТАХИКАРДИЯ ×2/)).length,
    ).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
    });
  });
});
