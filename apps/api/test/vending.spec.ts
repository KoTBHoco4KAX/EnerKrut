import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  OpenCaseResponseSchema,
  VendingHitResponseSchema,
} from "@enerkrut/shared";
import {
  closeTestContext,
  createTestContext,
  mockCryptoInts,
  parseBody,
  registerTestUser,
} from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("vending machine", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it("resolves a stuck can into a single drop and is idempotent", async () => {
    const user = await registerTestUser(context, { balanceRub: 1000n });
    mockCryptoInts([0, 0, 0, 0, 0, 0]);
    const openResponse = await request(context.app.server)
      .post("/api/cases/pyaterochka_fridge/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, openResponse);
    expect(opened.status).toBe("pending_vending");
    expect(opened.eventId).toBeDefined();
    expect(opened.eventType).toBe("stuck_can_hit");
    const hitResponse = await request(context.app.server)
      .post(`/api/vending/${opened.eventId ?? ""}/hit`)
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const hit = parseBody(VendingHitResponseSchema, hitResponse);
    expect(hit.result).toBe("single");
    expect(hit.drops).toHaveLength(1);
    const repeatResponse = await request(context.app.server)
      .post(`/api/vending/${opened.eventId ?? ""}/hit`)
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const repeated = parseBody(VendingHitResponseSchema, repeatResponse);
    expect(repeated).toEqual(hit);
    const inventoryCount = await context.prisma.userInventory.count({
      where: { userId: user.userId },
    });
    expect(inventoryCount).toBe(1);
    const ledger = await context.prisma.rubLedger.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "asc" },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.deltaRub).toBe(-100n);
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.balanceRub).toBe(900n);
  });

  it("resolves a stuck can into two independent drops", async () => {
    const user = await registerTestUser(context, { balanceRub: 1000n });
    mockCryptoInts([0, 0, 40, 0, 0, 0, 0, 0, 0]);
    const openResponse = await request(context.app.server)
      .post("/api/cases/pyaterochka_fridge/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, openResponse);
    const hitResponse = await request(context.app.server)
      .post(`/api/vending/${opened.eventId ?? ""}/hit`)
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const hit = parseBody(VendingHitResponseSchema, hitResponse);
    expect(hit.result).toBe("double");
    expect(hit.drops).toHaveLength(2);
    const inventoryCount = await context.prisma.userInventory.count({
      where: { userId: user.userId },
    });
    expect(inventoryCount).toBe(2);
    const event = await context.prisma.vendingEvent.findUniqueOrThrow({
      where: { id: opened.eventId ?? "" },
    });
    expect(event.outcome).toMatchObject({ result: "double" });
  });

  it("refunds 50% when the stuck can cannot be recovered", async () => {
    const user = await registerTestUser(context, { balanceRub: 1000n });
    mockCryptoInts([0, 0, 55]);
    const openResponse = await request(context.app.server)
      .post("/api/cases/pyaterochka_fridge/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, openResponse);
    const hitResponse = await request(context.app.server)
      .post(`/api/vending/${opened.eventId ?? ""}/hit`)
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const hit = parseBody(VendingHitResponseSchema, hitResponse);
    expect(hit.result).toBe("fail");
    expect(hit.refundRub).toBe(50);
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.balanceRub).toBe(950n);
    const refund = await context.prisma.rubLedger.findFirstOrThrow({
      where: { userId: user.userId, reason: "vending_refund" },
    });
    expect(refund.deltaRub).toBe(50n);
  });

  it("charges double on machine_ate and does not allow hitting it", async () => {
    const user = await registerTestUser(context, { balanceRub: 1000n });
    mockCryptoInts([0, 75]);
    const openResponse = await request(context.app.server)
      .post("/api/cases/pyaterochka_fridge/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, openResponse);
    expect(opened.status).toBe("machine_ate");
    expect(opened.eventType).toBe("machine_ate_100");
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.balanceRub).toBe(800n);
    const ledger = await context.prisma.rubLedger.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "asc" },
    });
    expect(ledger.map((entry) => entry.deltaRub)).toEqual([-100n, -100n]);
    expect(ledger.map((entry) => entry.reason)).toEqual([
      "case_open",
      "vending_ate",
    ]);
    const hitResponse = await request(context.app.server)
      .post(`/api/vending/${opened.eventId ?? ""}/hit`)
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(400);
    expect(hitResponse.body).toMatchObject({ code: "not_hittable" });
  });
});
