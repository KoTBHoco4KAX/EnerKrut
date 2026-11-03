import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CasesResponseSchema } from "@enerkrut/shared";
import {
  closeTestContext,
  createTestContext,
  parseBody,
} from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("public cases catalog", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it("returns six active paid cases sorted by order without auth", async () => {
    const response = await request(context.app.server)
      .get("/api/cases")
      .expect(200);
    const body = parseBody(CasesResponseSchema, response);
    expect(body.cases).toHaveLength(6);
    const ids = body.cases.map((seedCase) => seedCase.id);
    expect(ids).not.toContain("vip_import_case");
    expect(ids).not.toContain("safe_case");
    const orders = body.cases.map((seedCase) => seedCase.order);
    expect(orders).toEqual([...orders].sort((left, right) => left - right));
    expect(ids).toEqual([
      "pyaterochka_fridge",
      "tabachka_ip",
      "tokyo_jidohanbai",
      "duty_free_airport",
      "avito_garage_clean",
      "ebay_private_auction",
    ]);
  });

  it("allows CORS preflight for the public catalog", async () => {
    const response = await request(context.app.server)
      .options("/api/cases")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("rate limits the public catalog to 60 requests per minute", async () => {
    let limited = false;
    for (let index = 0; index < 70; index += 1) {
      const response = await request(context.app.server).get("/api/cases");
      if (response.status === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
