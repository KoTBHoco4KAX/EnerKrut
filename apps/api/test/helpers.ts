import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import type { Response } from "supertest";
import { vi } from "vitest";
import { buildApp } from "../src/app.js";
import { cryptoRandomSource } from "../src/lib/random.js";
import { loadSeedData } from "../src/seed/load.js";
import { seedDatabase } from "../prisma/seed.js";

export interface TestContext {
  prisma: PrismaClient;
  app: FastifyInstance;
}

let sequence = 0;

export function nextTelegramId(): bigint {
  sequence += 1;
  return (
    BigInt(Date.now()) * 1000n +
    BigInt(Math.floor(Math.random() * 900) + 100) +
    BigInt(sequence)
  );
}

export function buildInitData(
  telegramId: bigint,
  token = "TEST_TOKEN",
  authDate = Math.floor(Date.now() / 1000),
): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: `AAH-${telegramId.toString()}`,
    user: JSON.stringify({
      id: Number(telegramId),
      first_name: "Test",
      username: "tester",
    }),
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
}

export async function createTestContext(): Promise<TestContext> {
  const prisma = new PrismaClient();
  const data = await loadSeedData();
  await seedDatabase(prisma, data);
  const app = buildApp({ prisma, botToken: "TEST_TOKEN" });
  await app.ready();
  return { prisma, app };
}

export async function closeTestContext(context: TestContext): Promise<void> {
  await context.app.close();
  await context.prisma.$disconnect();
}

export function authHeader(initData: string): {
  "x-telegram-init-data": string;
} {
  return { "x-telegram-init-data": initData };
}

export async function registerTestUser(
  context: TestContext,
  updates: {
    balanceRub?: bigint;
    keysGray?: number;
    keysColor?: number;
    keysEngraved?: number;
    keysGold?: number;
    bpmCurrent?: number;
    tachycardiaActive?: boolean;
    tachycardiaUntil?: Date | null;
  } = {},
): Promise<{ telegramId: bigint; initData: string; userId: string }> {
  const telegramId = nextTelegramId();
  const initData = buildInitData(telegramId);
  await request(context.app.server)
    .get("/api/me")
    .set(authHeader(initData))
    .expect(200);
  const user = await context.prisma.user.findUniqueOrThrow({
    where: { telegramId },
  });
  if (Object.keys(updates).length > 0) {
    await context.prisma.user.update({
      where: { id: user.id },
      data: updates,
    });
  }
  return { telegramId, initData, userId: user.id };
}

export function parseBody<T>(
  schema: { parse: (value: unknown) => T },
  response: Response,
): T {
  return schema.parse(response.body as unknown);
}

export function mockCryptoInts(
  values: ReadonlyArray<number>,
  fallback: "max" | number = "max",
) {
  const queue = [...values];
  return vi
    .spyOn(cryptoRandomSource, "int")
    .mockImplementation((minInclusive, maxExclusive) => {
      const next = queue.shift();
      const raw =
        next === undefined
          ? fallback === "max"
            ? maxExclusive - 1
            : fallback
          : next;
      return Math.max(minInclusive, Math.min(maxExclusive - 1, raw));
    });
}
