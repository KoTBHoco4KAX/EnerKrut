import type { Prisma } from "@prisma/client";
import type {
  VendingHitResponse,
} from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { AppError } from "../lib/errors.js";
import { lockUser, lockVendingEvent } from "../lib/locks.js";
import {
  CONDITION_TO_SHARED,
  CONTAINER_TO_SHARED,
  RARITY_TO_SHARED,
} from "../lib/prisma-maps.js";
import { rollDrop } from "./roll.js";
import type { RolledDrop } from "./roll.js";

const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

interface StoredOutcome {
  result?: "single" | "double" | "fail";
  dropIds: string[];
  refundRub?: number;
}

function readOutcome(value: Prisma.JsonValue): StoredOutcome {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { dropIds: [] };
  }
  const record = value as Record<string, Prisma.JsonValue>;
  const rawResult = record.result;
  const result =
    rawResult === "single" || rawResult === "double" || rawResult === "fail"
      ? rawResult
      : undefined;
  const rawIds: unknown = record.dropIds;
  const dropIds = Array.isArray(rawIds)
    ? rawIds.filter((candidate): candidate is string => typeof candidate === "string")
    : [];
  const rawRefund = record.refundRub;
  const refundRub =
    typeof rawRefund === "number" && Number.isFinite(rawRefund)
      ? rawRefund
      : undefined;
  return { result, dropIds, refundRub };
}

async function loadDrops(
  tx: Prisma.TransactionClient,
  userId: string,
  ids: ReadonlyArray<string>,
): Promise<RolledDrop[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await tx.userInventory.findMany({
    where: { id: { in: [...ids] }, userId },
    include: { item: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const drops: RolledDrop[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row !== undefined) {
      drops.push({
        dropId: row.id,
        servedPriceRub: row.servedPriceRub,
        item: {
          id: row.item.id,
          displayName: row.item.displayName,
          rarity: RARITY_TO_SHARED[row.item.rarity],
          condition: CONDITION_TO_SHARED[row.condition],
          containerType: CONTAINER_TO_SHARED[row.item.containerType],
          imageUrl: row.item.imageUrl,
          imageThumbUrl: row.item.imageThumbUrl,
          flavorNotes: row.item.flavorNotes,
        },
      });
    }
  }
  return drops;
}

function dropResponse(drop: RolledDrop): {
  id: string;
  item: RolledDrop["item"];
  servedPriceRub: number;
} {
  return { id: drop.dropId, item: drop.item, servedPriceRub: drop.servedPriceRub };
}

export async function hitVending(
  deps: AppDeps,
  userId: string,
  eventId: string,
): Promise<VendingHitResponse> {
  return deps.prisma.$transaction(async (tx) => {
    const event = await lockVendingEvent(tx, eventId);
    if (event === null || event.userId !== userId) {
      throw new AppError(404, "not_found", "Vending event not found");
    }
    if (event.eventType !== "stuck_can_hit") {
      throw new AppError(400, "not_hittable", "Vending event is not hittable");
    }
    const stored = readOutcome(event.outcome);
    if (stored.result !== undefined) {
      if (stored.result === "fail") {
        return { result: "fail", refundRub: stored.refundRub ?? 0 };
      }
      const drops = await loadDrops(tx, userId, stored.dropIds);
      return {
        result: stored.result,
        drops: drops.map(dropResponse),
      };
    }
    const user = await lockUser(tx, userId);
    const seedCase = await tx.case.findUniqueOrThrow({
      where: { id: event.caseId },
    });
    const roll = deps.rng.int(0, 100);
    if (roll < 40) {
      const drop = await rollDrop(tx, deps, {
        userId,
        caseId: event.caseId,
        bpm: user.bpmCurrent,
        now: new Date(),
      });
      await tx.vendingEvent.update({
        where: { id: eventId },
        data: {
          outcome: { result: "single", dropIds: [drop.dropId] },
        },
      });
      return { result: "single", drops: [dropResponse(drop)] };
    }
    if (roll < 55) {
      const first = await rollDrop(tx, deps, {
        userId,
        caseId: event.caseId,
        bpm: user.bpmCurrent,
        now: new Date(),
      });
      const second = await rollDrop(tx, deps, {
        userId,
        caseId: event.caseId,
        bpm: user.bpmCurrent,
        now: new Date(),
      });
      await tx.vendingEvent.update({
        where: { id: eventId },
        data: {
          outcome: {
            result: "double",
            dropIds: [first.dropId, second.dropId],
          },
        },
      });
      return {
        result: "double",
        drops: [dropResponse(first), dropResponse(second)],
      };
    }
    const refundRub = Math.round(seedCase.priceRub * 0.5);
    const balanceAfter = user.balanceRub + BigInt(refundRub);
    await tx.user.update({
      where: { id: userId },
      data: { balanceRub: balanceAfter },
    });
    await tx.rubLedger.create({
      data: {
        userId,
        deltaRub: BigInt(refundRub),
        reason: "vending_refund",
        refId: eventId,
        balanceAfter,
      },
    });
    await tx.vendingEvent.update({
      where: { id: eventId },
      data: { outcome: { result: "fail", refundRub } },
    });
    return { result: "fail", refundRub };
  }, TRANSACTION_OPTIONS);
}
