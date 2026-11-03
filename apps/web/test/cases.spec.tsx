import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import {
  CASE_FIXTURES,
  installFetch,
  jsonResponse,
  meFixture,
  renderWithProviders,
  resetAppState,
} from "./helpers";
import { CasesShowcaseScreen } from "../src/screens/CasesShowcaseScreen";

describe("CasesShowcaseScreen", () => {
  it("renders six cases and disables the ebay case below 120 BPM", async () => {
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
    renderWithProviders(<CasesShowcaseScreen />);

    expect(
      await screen.findByText("Холодильник в «Пятёрочке»"),
    ).toBeInTheDocument();
    expect(screen.getByText("Аукцион eBay")).toBeInTheDocument();
    expect(screen.getByText("BPM ≥ 120")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Открыть Аукцион eBay" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Открыть Холодильник в «Пятёрочке»" }),
    ).not.toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: /^Открыть / }),
    ).toHaveLength(6);
  });
});
