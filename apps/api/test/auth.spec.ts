import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MeResponseSchema } from "@enerkrut/shared";
import {
  authHeader,
  buildInitData,
  closeTestContext,
  createTestContext,
  nextTelegramId,
  parseBody,
} from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("telegram auth", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it("rejects a request without init data", async () => {
    const response = await request(context.app.server).get("/api/me");
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "unauthorized" });
  });

  it("rejects a tampered signature", async () => {
    const initData = buildInitData(nextTelegramId());
    const tampered = initData.replace(/hash=[0-9a-f]+/, `hash=${"0".repeat(64)}`);
    const response = await request(context.app.server)
      .get("/api/me")
      .set(authHeader(tampered));
    expect(response.status).toBe(401);
  });

  it("rejects init data older than 24 hours", async () => {
    const initData = buildInitData(
      nextTelegramId(),
      "TEST_TOKEN",
      Math.floor(Date.now() / 1000) - 90_000,
    );
    const response = await request(context.app.server)
      .get("/api/me")
      .set(authHeader(initData));
    expect(response.status).toBe(401);
  });

  it("accepts valid init data and returns the user profile", async () => {
    const telegramId = nextTelegramId();
    const initData = buildInitData(telegramId);
    const response = await request(context.app.server)
      .get("/api/me")
      .set(authHeader(initData))
      .expect(200);
    const me = parseBody(MeResponseSchema, response);
    expect(me.telegramId).toBe(telegramId.toString());
    expect(me.balanceRub).toBe(0);
    expect(me.bpmCurrent).toBe(60);
  });
});
