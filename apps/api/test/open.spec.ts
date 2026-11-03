import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  Condition,
  CONDITION_VALUES,
  DropsResponseSchema,
  InventoryResponseSchema,
  OpenCaseResponseSchema,
  Rarity,
} from "@enerkrut/shared";
import type { Prisma } from "@prisma/client";
import {
  closeTestContext,
  createTestContext,
  mockCryptoInts,
  parseBody,
  registerTestUser,
} from "./helpers.js";
import type { TestContext } from "./helpers.js";
import { pickCondition, pickRarity, pickWeighted } from "../src/engine/rolls.js";

function asRecord(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected JSON object");
  }
  return value as Record<string, Prisma.JsonValue>;
}

describe("case opening", () => {
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

  it("opens a case, writes ledgers and returns the drop", async () => {
    const user = await registerTestUser(context, { balanceRub: 100_000n });
    mockCryptoInts([999_999, 0, 0, 0]);
    const response = await request(context.app.server)
      .post("/api/cases/duty_free_airport/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, response);
    expect(opened.status).toBe("opened");
    expect(opened.dropId).toBeDefined();
    expect(opened.item).toBeDefined();
    expect(opened.servedPriceRub).toBeGreaterThan(0);
    const inventory = await context.prisma.userInventory.findUniqueOrThrow({
      where: { id: opened.dropId ?? "" },
    });
    expect(inventory.userId).toBe(user.userId);
    expect(inventory.servedPriceRub).toBe(opened.servedPriceRub);
    expect(inventory.state).toBe("pending");
    expect(inventory.decision).toBeNull();
    const ledger = await context.prisma.rubLedger.findFirstOrThrow({
      where: { userId: user.userId, reason: "case_open" },
    });
    expect(ledger.deltaRub).toBe(-1800n);
    expect(ledger.refId).toBe(opened.dropId ?? "");
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.balanceRub).toBe(98_200n);
  });

  it("rejects opening without enough rubles", async () => {
    const user = await registerTestUser(context);
    const response = await request(context.app.server)
      .post("/api/cases/pyaterochka_fridge/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(400);
    expect(response.body).toMatchObject({ code: "insufficient_balance" });
    const count = await context.prisma.userInventory.count({
      where: { userId: user.userId },
    });
    expect(count).toBe(0);
  });

  it("returns 404 for an unknown case", async () => {
    const user = await registerTestUser(context, { balanceRub: 100n });
    const response = await request(context.app.server)
      .post("/api/cases/not_a_case/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(404);
    expect(response.body).toMatchObject({ code: "case_not_found" });
  });

  it("lists inventory and drops with valid schemas", async () => {
    const user = await registerTestUser(context, { balanceRub: 100_000n });
    mockCryptoInts([999_999, 0, 0, 0]);
    await request(context.app.server)
      .post("/api/cases/duty_free_airport/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const inventoryResponse = await request(context.app.server)
      .get("/api/me/inventory?decision=pending&page=1&pageSize=10")
      .set("x-telegram-init-data", user.initData)
      .expect(200);
    const inventory = parseBody(InventoryResponseSchema, inventoryResponse);
    expect(inventory.items.length).toBeGreaterThanOrEqual(1);
    expect(inventory.items[0]?.decision).toBeNull();
    const dropsResponse = await request(context.app.server)
      .get("/api/me/drops?limit=10")
      .set("x-telegram-init-data", user.initData)
      .expect(200);
    const drops = parseBody(DropsResponseSchema, dropsResponse);
    expect(drops.drops.length).toBe(1);
    expect(drops.nextCursor).toBeUndefined();
  });

  it("triggers tachycardia on an open according to the BPM chance", async () => {
    const user = await registerTestUser(context, {
      balanceRub: 100_000n,
      bpmCurrent: 160,
    });
    mockCryptoInts([0, 0, 0, 0]);
    const response = await request(context.app.server)
      .post("/api/cases/duty_free_airport/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, response);
    expect(opened.tachycardia.active).toBe(true);
    expect(opened.tachycardia.until).toBeDefined();
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.tachycardiaActive).toBe(true);
  });

  it("blocks the ebay case below the BPM requirement", async () => {
    const user = await registerTestUser(context, { balanceRub: 20_000n });
    const response = await request(context.app.server)
      .post("/api/cases/ebay_private_auction/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(403);
    expect(response.body).toMatchObject({ code: "bpm_too_low" });
    const ledger = await context.prisma.rubLedger.count({
      where: { userId: user.userId, reason: "case_open" },
    });
    expect(ledger).toBe(0);
  });

  it("stores a reproducible weights snapshot for every drop", async () => {
    const user = await registerTestUser(context, { balanceRub: 100_000n });
    mockCryptoInts([999_999, 123_456, 7, 3]);
    const response = await request(context.app.server)
      .post("/api/cases/duty_free_airport/open")
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, response);
    const drop = await context.prisma.dropHistory.findUniqueOrThrow({
      where: { id: opened.dropId ?? "" },
    });
    expect(drop.rollSeed).toMatch(/^[0-9a-f]{32}$/);
    const snapshot = asRecord(drop.weightsSnapshot);
    const rarityWeightsRaw = asRecord(snapshot.rarityWeights ?? {});
    const rarityWeights = Object.fromEntries(
      Object.entries(rarityWeightsRaw).map(([key, value]) => [
        key,
        typeof value === "number" ? value : 0,
      ]),
    ) as Record<Rarity, number>;
    expect(pickRarity(rarityWeights, drop.rollValueRarity)).toBe(drop.rarity);
    const itemWeightsRaw = snapshot.itemWeights;
    if (!Array.isArray(itemWeightsRaw)) {
      throw new Error("itemWeights snapshot is missing");
    }
    const itemEntries = itemWeightsRaw.map((entry) => {
      const record = asRecord(entry);
      const itemId = record.itemId;
      const weight = record.weight;
      if (typeof itemId !== "string" || typeof weight !== "number") {
        throw new Error("Malformed item weight");
      }
      return { value: itemId, weight };
    });
    expect(pickWeighted(itemEntries, drop.rollValueItem)).toBe(drop.itemId);
    const conditionWeightsRaw = snapshot.conditionWeights;
    if (!Array.isArray(conditionWeightsRaw)) {
      throw new Error("conditionWeights snapshot is missing");
    }
    const conditionEntries: Array<{ condition: Condition; weight: number }> = [];
    for (const entry of conditionWeightsRaw) {
      const record = asRecord(entry);
      const condition = record.condition;
      const weight = record.weight;
      if (typeof condition !== "string" || typeof weight !== "number") {
        throw new Error("Malformed condition weight");
      }
      if ((CONDITION_VALUES as readonly string[]).includes(condition)) {
        conditionEntries.push({ condition: condition as Condition, weight });
      }
    }
    const conditionRoll = snapshot.conditionRoll;
    if (typeof conditionRoll !== "number") {
      throw new Error("conditionRoll snapshot is missing");
    }
    expect(pickCondition(conditionEntries, conditionRoll)).toBe(drop.condition);
  });
});
