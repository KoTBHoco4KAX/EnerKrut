import { KeyGrade, PaymentPurpose, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadSeedData } from "../apps/api/src/seed/load";
import { seedDatabase } from "../apps/api/prisma/seed";

const prisma = new PrismaClient();

describe("database seed", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("is idempotent across two consecutive runs", async () => {
    const data = await loadSeedData();
    const first = await seedDatabase(prisma, data);
    const second = await seedDatabase(prisma, data);

    expect(second).toEqual(first);
    expect(second.items).toBeGreaterThanOrEqual(500);
    expect(second.cases).toBe(6);
    expect(second.rarityWeights).toBe(36);
    expect(second.conditionProfiles).toBe(4);
    expect(second.dropTableRows).toBe(second.items);
    expect(second.dropTableRows).toBeGreaterThanOrEqual(500);

    const duplicateItems = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT id FROM "ItemsCatalog" GROUP BY id HAVING COUNT(*) > 1
      ) AS duplicates
    `;
    expect(duplicateItems[0]?.count ?? 0n).toBe(0n);
  });

  it("rejects a duplicate telegram payment charge id with P2002", async () => {
    const telegramId = 990_000_000n + BigInt(Date.now() % 1_000_000);
    let userId: string | undefined;
    try {
      const user = await prisma.user.create({
        data: { telegramId, firstName: "Payment test" },
      });
      userId = user.id;
      const chargeId = `test-charge-${telegramId.toString()}`;
      await prisma.telegramPayment.create({
        data: {
          userId: user.id,
          purpose: PaymentPurpose.rub_pack_small,
          amountStars: 100,
          invoiceLink: "https://t.me/invoice/test",
          telegramPaymentChargeId: chargeId,
          payload: { source: "test" },
        },
      });
      await expect(
        prisma.telegramPayment.create({
          data: {
            userId: user.id,
            purpose: PaymentPurpose.rub_pack_small,
            amountStars: 100,
            invoiceLink: "https://t.me/invoice/test",
            telegramPaymentChargeId: chargeId,
            payload: { source: "test" },
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    } finally {
      if (userId !== undefined) {
        await prisma.telegramPayment.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
    }
  });

  it("keeps key ledger balanceAfter consistent with user key balances", async () => {
    const telegramId = 990_100_000n + BigInt(Date.now() % 1_000_000);
    let userId: string | undefined;
    try {
      const user = await prisma.user.create({
        data: { telegramId, firstName: "Key ledger test" },
      });
      userId = user.id;

      const gray = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { keysGray: { increment: 2 } },
        });
        await tx.keyLedger.create({
          data: {
            userId: user.id,
            grade: KeyGrade.gray,
            delta: 2,
            reason: "drink_can",
            balanceAfter: updated.keysGray,
          },
        });
        return updated;
      });
      expect(gray.keysGray).toBe(2);

      const color = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { keysColor: { increment: 1 } },
        });
        await tx.keyLedger.create({
          data: {
            userId: user.id,
            grade: KeyGrade.color,
            delta: 1,
            reason: "craft_case_ticket",
            balanceAfter: updated.keysColor,
          },
        });
        return updated;
      });
      expect(color.keysColor).toBe(1);

      const engraved = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { keysEngraved: { increment: 3 } },
        });
        await tx.keyLedger.create({
          data: {
            userId: user.id,
            grade: KeyGrade.engraved,
            delta: 3,
            reason: "drink_can",
            balanceAfter: updated.keysEngraved,
          },
        });
        return updated;
      });
      expect(engraved.keysEngraved).toBe(3);

      const gold = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { keysGold: { increment: 1 } },
        });
        await tx.keyLedger.create({
          data: {
            userId: user.id,
            grade: KeyGrade.gold,
            delta: 1,
            reason: "drink_can",
            balanceAfter: updated.keysGold,
          },
        });
        return updated;
      });
      expect(gold.keysGold).toBe(1);

      const [finalUser, ledger] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
        prisma.keyLedger.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      expect(ledger).toHaveLength(4);
      const expected: ReadonlyArray<{
        grade: KeyGrade;
        balance: number;
        field: "keysGray" | "keysColor" | "keysEngraved" | "keysGold";
        reason: string;
      }> = [
        { grade: KeyGrade.gray, balance: 2, field: "keysGray", reason: "drink_can" },
        {
          grade: KeyGrade.color,
          balance: 1,
          field: "keysColor",
          reason: "craft_case_ticket",
        },
        {
          grade: KeyGrade.engraved,
          balance: 3,
          field: "keysEngraved",
          reason: "drink_can",
        },
        { grade: KeyGrade.gold, balance: 1, field: "keysGold", reason: "drink_can" },
      ];
      for (const entry of expected) {
        const gradeRows = ledger.filter((row) => row.grade === entry.grade);
        expect(gradeRows).toHaveLength(1);
        const row = gradeRows[0];
        expect(row?.balanceAfter).toBe(entry.balance);
        expect(row?.reason).toBe(entry.reason);
        expect(finalUser[entry.field]).toBe(entry.balance);
      }
    } finally {
      if (userId !== undefined) {
        await prisma.keyLedger.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
    }
  });
});
