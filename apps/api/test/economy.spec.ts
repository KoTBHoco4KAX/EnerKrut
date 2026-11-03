import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  CraftTicketResponseSchema,
  DrinkDropResponseSchema,
  LambardSellResponseSchema,
  MeResponseSchema,
  OpenCaseResponseSchema,
  SellDropResponseSchema,
} from "@enerkrut/shared";
import {
  closeTestContext,
  createTestContext,
  mockCryptoInts,
  parseBody,
  registerTestUser,
} from "./helpers.js";
import type { TestContext } from "./helpers.js";

async function createInventory(
  context: TestContext,
  userId: string,
  itemId: string,
  servedPriceRub = 100,
): Promise<string> {
  const id = randomUUID();
  await context.prisma.userInventory.create({
    data: {
      id,
      userId,
      itemId,
      condition: "mint",
      state: "pending",
      servedPriceRub,
    },
  });
  return id;
}

describe("economy endpoints", () => {
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

  it("doubles the sell price once when tachycardia is active", async () => {
    const user = await registerTestUser(context, {
      balanceRub: 1000n,
      tachycardiaActive: true,
      tachycardiaUntil: new Date(Date.now() + 10 * 60 * 1000),
    });
    const item = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "common", isAlcoholic: false },
    });
    const dropId = await createInventory(context, user.userId, item.id, 100);
    const response = await request(context.app.server)
      .post(`/api/drops/${dropId}/sell`)
      .set("x-telegram-init-data", user.initData)
      .send({})
      .expect(200);
    const sold = parseBody(SellDropResponseSchema, response);
    expect(sold.priceRub).toBe(200);
    expect(sold.balanceRub).toBe(1200);
    const inventory = await context.prisma.userInventory.findUniqueOrThrow({
      where: { id: dropId },
    });
    expect(inventory.decision).toBe("sold");
    expect(inventory.state).toBe("sold");
    const updatedUser = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updatedUser.tachycardiaActive).toBe(false);
    expect(updatedUser.tachycardiaUntil).toBeNull();
    expect(updatedUser.bpmCurrent).toBe(62);
  });

  it("allows only one of two parallel sells for the same inventory", async () => {
    const user = await registerTestUser(context);
    const item = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "common", isAlcoholic: false },
    });
    const dropId = await createInventory(context, user.userId, item.id, 100);
    const [first, second] = await Promise.all([
      request(context.app.server)
        .post(`/api/drops/${dropId}/sell`)
        .set("x-telegram-init-data", user.initData)
        .send({}),
      request(context.app.server)
        .post(`/api/drops/${dropId}/sell`)
        .set("x-telegram-init-data", user.initData)
        .send({}),
    ]);
    const statuses = [first.status, second.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 409]);
    const ledger = await context.prisma.rubLedger.findMany({
      where: { userId: user.userId, reason: "sell_can" },
    });
    expect(ledger).toHaveLength(1);
    const updatedUser = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updatedUser.balanceRub).toBe(100n);
  });

  it("allows only one of parallel sell and drink for the same inventory", async () => {
    const user = await registerTestUser(context);
    const item = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "common", isAlcoholic: false },
    });
    const dropId = await createInventory(context, user.userId, item.id, 100);
    const [first, second] = await Promise.all([
      request(context.app.server)
        .post(`/api/drops/${dropId}/sell`)
        .set("x-telegram-init-data", user.initData)
        .send({}),
      request(context.app.server)
        .post(`/api/drops/${dropId}/drink`)
        .set("x-telegram-init-data", user.initData)
        .send({}),
    ]);
    const statuses = [first.status, second.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 409]);
    const inventory = await context.prisma.userInventory.findUniqueOrThrow({
      where: { id: dropId },
    });
    expect(inventory.decision).not.toBeNull();
    const decisionLedgers = await Promise.all([
      context.prisma.rubLedger.count({
        where: { userId: user.userId, reason: "sell_can" },
      }),
      context.prisma.keyLedger.count({
        where: { userId: user.userId, reason: "drink_can" },
      }),
    ]);
    expect(decisionLedgers[0] + decisionLedgers[1]).toBe(1);
  });

  it("emits the correct key grade and count for every rarity", async () => {
    const user = await registerTestUser(context);
    const common = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "common", isAlcoholic: false },
    });
    const rare = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "rare", isAlcoholic: false },
    });
    const rareAlcoholic = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "rare", isAlcoholic: true },
    });
    const epicAlcoholic = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "epic", isAlcoholic: true },
    });
    const legendary = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "legendary" },
    });
    const mythic = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "fictional_mythic" },
    });
    const fixtures = [
      { item: common, grade: "gray", count: 1 },
      { item: rare, grade: "color", count: 1 },
      { item: rareAlcoholic, grade: "color", count: 1 },
      { item: epicAlcoholic, grade: "engraved", count: 1 },
      { item: legendary, grade: "gold", count: 1 },
      { item: mythic, grade: "gold", count: 2 },
    ];
    for (const fixture of fixtures) {
      const dropId = await createInventory(
        context,
        user.userId,
        fixture.item.id,
        100,
      );
      const response = await request(context.app.server)
        .post(`/api/drops/${dropId}/drink`)
        .set("x-telegram-init-data", user.initData)
        .send({})
        .expect(200);
      const drank = parseBody(DrinkDropResponseSchema, response);
      expect(drank.keyGrade).toBe(fixture.grade);
      expect(drank.keyCount).toBe(fixture.count);
    }
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.keysGray).toBe(1);
    expect(updated.keysColor).toBe(2);
    expect(updated.keysEngraved).toBe(1);
    expect(updated.keysGold).toBe(3);
    expect(updated.bpmCurrent).toBe(90);
  });

  it("decays BPM by two points per elapsed hour", async () => {
    const user = await registerTestUser(context);
    await context.prisma.user.update({
      where: { id: user.userId },
      data: {
        bpmCurrent: 100,
        bpmUpdatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    });
    const response = await request(context.app.server)
      .get("/api/me")
      .set("x-telegram-init-data", user.initData)
      .expect(200);
    const me = parseBody(MeResponseSchema, response);
    expect(me.bpmCurrent).toBe(94);
  });

  it("sells keys to the lambard only below 300 rubles", async () => {
    const user = await registerTestUser(context, {
      balanceRub: 200n,
      keysGray: 10,
    });
    const response = await request(context.app.server)
      .post("/api/lambard/sell")
      .set("x-telegram-init-data", user.initData)
      .send({ grade: "gray", count: 10 })
      .expect(200);
    const sold = parseBody(LambardSellResponseSchema, response);
    expect(sold.rubsAdded).toBe(150);
    expect(sold.balanceRub).toBe(350);
    expect(sold.keyBalanceAfter).toBe(0);
    const blocked = await request(context.app.server)
      .post("/api/lambard/sell")
      .set("x-telegram-init-data", user.initData)
      .send({ grade: "gray", count: 1 })
      .expect(409);
    expect(blocked.body).toMatchObject({ code: "lambard_blocked" });
    const keyLedger = await context.prisma.keyLedger.findFirstOrThrow({
      where: { userId: user.userId, reason: "lambard_sell" },
    });
    expect(keyLedger.delta).toBe(-10);
    expect(keyLedger.balanceAfter).toBe(0);
  });

  it("rejects lambard sales with insufficient keys", async () => {
    const user = await registerTestUser(context, { balanceRub: 0n, keysGray: 1 });
    const response = await request(context.app.server)
      .post("/api/lambard/sell")
      .set("x-telegram-init-data", user.initData)
      .send({ grade: "gray", count: 5 })
      .expect(400);
    expect(response.body).toMatchObject({ code: "insufficient_keys" });
  });

  it("crafts a ticket and opens the case without charging rubles", async () => {
    const user = await registerTestUser(context, { keysGold: 5, bpmCurrent: 120 });
    const craftResponse = await request(context.app.server)
      .post("/api/craft/ticket")
      .set("x-telegram-init-data", user.initData)
      .send({ caseId: "ebay_private_auction" })
      .expect(201);
    const ticket = parseBody(CraftTicketResponseSchema, craftResponse);
    expect(ticket.caseId).toBe("ebay_private_auction");
    mockCryptoInts([999_999, 0, 0, 0]);
    const openResponse = await request(context.app.server)
      .post("/api/cases/ebay_private_auction/open")
      .set("x-telegram-init-data", user.initData)
      .send({ useTicket: true })
      .expect(200);
    const opened = parseBody(OpenCaseResponseSchema, openResponse);
    expect(opened.status).toBe("opened");
    expect(opened.dropId).toBeDefined();
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.balanceRub).toBe(0n);
    expect(updated.keysGold).toBe(0);
    const consumed = await context.prisma.caseTicket.findUniqueOrThrow({
      where: { id: ticket.ticketId },
    });
    expect(consumed.consumedAt).not.toBeNull();
    const caseOpenLedger = await context.prisma.rubLedger.count({
      where: { userId: user.userId, reason: "case_open" },
    });
    expect(caseOpenLedger).toBe(0);
    const missing = await request(context.app.server)
      .post("/api/cases/ebay_private_auction/open")
      .set("x-telegram-init-data", user.initData)
      .send({ useTicket: true })
      .expect(404);
    expect(missing.body).toMatchObject({ code: "ticket_not_found" });
  });

  it("rejects crafting when keys are insufficient", async () => {
    const user = await registerTestUser(context, { keysGold: 1 });
    const response = await request(context.app.server)
      .post("/api/craft/ticket")
      .set("x-telegram-init-data", user.initData)
      .send({ caseId: "ebay_private_auction" })
      .expect(400);
    expect(response.body).toMatchObject({ code: "insufficient_keys" });
  });

  it("keeps rub ledger balanceAfter correct under parallel credits", async () => {
    const user = await registerTestUser(context);
    const item = await context.prisma.itemsCatalog.findFirstOrThrow({
      where: { rarity: "common", isAlcoholic: false },
    });
    const firstDrop = await createInventory(context, user.userId, item.id, 100);
    const secondDrop = await createInventory(context, user.userId, item.id, 100);
    const responses = await Promise.all([
      request(context.app.server)
        .post(`/api/drops/${firstDrop}/sell`)
        .set("x-telegram-init-data", user.initData)
        .send({}),
      request(context.app.server)
        .post(`/api/drops/${secondDrop}/sell`)
        .set("x-telegram-init-data", user.initData)
        .send({}),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const updated = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    expect(updated.balanceRub).toBe(200n);
    const ledger = await context.prisma.rubLedger.findMany({
      where: { userId: user.userId, reason: "sell_can" },
      orderBy: { balanceAfter: "asc" },
    });
    expect(ledger.map((entry) => entry.balanceAfter)).toEqual([100n, 200n]);
  });
});
