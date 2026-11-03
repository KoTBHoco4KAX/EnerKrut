import type { Prisma } from "@prisma/client";
import type {
  DropsQuery,
  DropsResponse,
  InventoryQuery,
  InventoryResponse,
  MeResponse,
} from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { resolveDrinkKeys } from "../engine/keys.js";
import {
  CONDITION_TO_SHARED,
  CONTAINER_TO_SHARED,
  DECISION_TO_SHARED,
  RARITY_TO_SHARED,
} from "../lib/prisma-maps.js";
import { normalizeTachycardia, tachycardiaPayload } from "./tachycardia.js";

export async function getMe(deps: AppDeps, userId: string): Promise<MeResponse> {
  const user = await deps.prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const tachycardia = normalizeTachycardia(user, new Date());
  return {
    telegramId: user.telegramId.toString(),
    balanceRub: Number(user.balanceRub),
    balanceStars: user.balanceStars,
    keys: {
      gray: user.keysGray,
      color: user.keysColor,
      engraved: user.keysEngraved,
      gold: user.keysGold,
    },
    bpmCurrent: user.bpmCurrent,
    tachycardia: tachycardiaPayload(tachycardia),
    vipTier: user.vipTier,
    vipExpiresAt: user.vipExpiresAt?.toISOString() ?? null,
  };
}

function inventoryDecision(
  decision: InventoryQuery["decision"],
): Prisma.UserInventoryWhereInput["decision"] {
  if (decision === undefined) {
    return undefined;
  }
  if (decision === "pending") {
    return null;
  }
  return decision;
}

export async function listInventory(
  deps: AppDeps,
  userId: string,
  query: InventoryQuery,
): Promise<InventoryResponse> {
  const where: Prisma.UserInventoryWhereInput = {
    userId,
    decision: inventoryDecision(query.decision),
  };
  const rows = await deps.prisma.userInventory.findMany({
    where,
    include: { item: true },
    orderBy: [{ obtainedAt: "desc" }, { id: "desc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return {
    items: rows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      condition: CONDITION_TO_SHARED[row.condition],
      state: row.state,
      servedPriceRub: row.servedPriceRub,
      decision:
        row.decision === null ? null : DECISION_TO_SHARED[row.decision],
      decisionAt: row.decisionAt?.toISOString() ?? null,
      obtainedAt: row.obtainedAt.toISOString(),
      obtainedFromCase: row.obtainedFromCase,
      keyGrade: resolveDrinkKeys(
        RARITY_TO_SHARED[row.item.rarity],
        row.item.isAlcoholic,
      ).grade,
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
    })),
    page: query.page,
    pageSize: query.pageSize,
  };
}

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function listDrops(
  deps: AppDeps,
  userId: string,
  query: DropsQuery,
): Promise<DropsResponse> {
  const rows = await deps.prisma.dropHistory.findMany({
    where: { userId },
    include: {
      item: {
        select: {
          id: true,
          displayName: true,
          imageThumbUrl: true,
          rarity: true,
        },
      },
      case: { select: { id: true, displayName: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor === undefined
      ? {}
      : { cursor: { id: query.cursor }, skip: 1 }),
  });
  const hasMore = rows.length > query.limit;
  const drops = hasMore ? rows.slice(0, query.limit) : rows;
  const last = drops[drops.length - 1];
  return {
    drops: drops.map((drop) => ({
      id: drop.id,
      userId: drop.userId,
      caseId: drop.caseId,
      itemId: drop.itemId,
      rarity: RARITY_TO_SHARED[drop.rarity],
      condition: CONDITION_TO_SHARED[drop.condition],
      rollSeed: drop.rollSeed,
      rollValueRarity: drop.rollValueRarity,
      rollValueItem: drop.rollValueItem,
      weightsSnapshot: jsonObject(drop.weightsSnapshot),
      servedPriceRub: drop.servedPriceRub,
      decision:
        drop.decision === null ? null : DECISION_TO_SHARED[drop.decision],
      decisionAt: drop.decisionAt?.toISOString() ?? null,
      createdAt: drop.createdAt.toISOString(),
      item: {
        id: drop.item.id,
        displayName: drop.item.displayName,
        imageThumbUrl: drop.item.imageThumbUrl,
        rarity: RARITY_TO_SHARED[drop.item.rarity],
      },
      case: {
        id: drop.case.id,
        displayName: drop.case.displayName,
      },
    })),
    ...(hasMore && last !== undefined ? { nextCursor: last.id } : {}),
  };
}
