import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  RARITY_VALUES,
  Rarity as SharedRarity,
  type Condition as SharedCondition,
  type ContainerType as SharedContainerType,
} from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { applyBpmToRarityWeights } from "../engine/bpm.js";
import {
  computeServedPrice,
  conditionMultiplier,
  readConditionMultipliers,
} from "../engine/pricing.js";
import {
  conditionRollEntries,
  rollCondition,
  rollItem,
  rollRarity,
} from "../engine/rolls.js";
import {
  CONDITION_MAP,
  CONTAINER_TO_SHARED,
  RARITY_MAP,
  RARITY_TO_SHARED,
} from "../lib/prisma-maps.js";

export interface RolledItemView {
  id: string;
  displayName: string;
  rarity: SharedRarity;
  condition: SharedCondition;
  containerType: SharedContainerType;
  imageUrl: string;
  imageThumbUrl: string;
  flavorNotes: string;
}

export interface RolledDrop {
  dropId: string;
  item: RolledItemView;
  servedPriceRub: number;
}

interface RollDropParams {
  userId: string;
  caseId: string;
  bpm: number;
  now: Date;
}

export async function rollDrop(
  tx: Prisma.TransactionClient,
  deps: AppDeps,
  params: RollDropParams,
): Promise<RolledDrop> {
  const weightRows = await tx.caseRarityWeight.findMany({
    where: { caseId: params.caseId },
  });
  const catalogRows = await tx.caseDropTable.findMany({
    where: { caseId: params.caseId },
    select: { item: { select: { rarity: true } } },
  });
  const availableRarities = new Set<SharedRarity>(
    catalogRows.map((row) => RARITY_TO_SHARED[row.item.rarity]),
  );
  const rawWeights = Object.fromEntries(
    RARITY_VALUES.map((rarity) => {
      const row = weightRows.find(
        (candidate) => RARITY_TO_SHARED[candidate.rarity] === rarity,
      );
      return [
        rarity,
        availableRarities.has(rarity) ? (row?.weight ?? 0) : 0,
      ];
    }),
  ) as Record<SharedRarity, number>;
  const weights = applyBpmToRarityWeights(rawWeights, params.bpm);
  const rarityRoll = rollRarity(deps.rng, weights);
  const itemRows = await tx.caseDropTable.findMany({
    where: {
      caseId: params.caseId,
      item: { rarity: RARITY_MAP[rarityRoll.rarity] },
    },
    include: { item: true },
    orderBy: { itemId: "asc" },
  });
  const entries = itemRows.map((row) => ({ value: row.item, weight: row.weight }));
  const itemRoll = rollItem(deps.rng, entries);
  const item = itemRoll.value;
  const profile = await tx.conditionProfile.findUnique({
    where: { key: item.conditionProfile },
  });
  if (profile === null) {
    throw new Error(`Condition profile not found: ${item.conditionProfile}`);
  }
  const conditionEntries = conditionRollEntries(
    profile.key,
    profile.allowedStates,
  );
  const conditionRoll = rollCondition(deps.rng, conditionEntries);
  const condition = conditionRoll.condition;
  const multipliers = readConditionMultipliers(profile.multipliers);
  const servedPriceRub = computeServedPrice(
    item.basePriceRub,
    item.tasteScore.toNumber(),
    conditionMultiplier(multipliers, CONDITION_MAP[condition]),
  );
  const dropId = randomUUID();
  const rollSeed = deps.rng.bytes(16).toString("hex");
  const rarityWeightsSnapshot: Prisma.InputJsonObject = Object.fromEntries(
    RARITY_VALUES.map((rarity) => [rarity, weights[rarity]]),
  );
  const itemWeightsSnapshot: Prisma.InputJsonArray = entries.map((entry) => ({
    itemId: entry.value.id,
    weight: entry.weight,
  }));
  const conditionWeightsSnapshot: Prisma.InputJsonArray = conditionEntries.map(
    (entry) => ({ condition: entry.condition, weight: entry.weight }),
  );
  const weightsSnapshot: Prisma.InputJsonObject = {
    version: 1,
    bpm: params.bpm,
    rarityWeights: rarityWeightsSnapshot,
    itemWeights: itemWeightsSnapshot,
    conditionWeights: conditionWeightsSnapshot,
    conditionRoll: conditionRoll.roll,
  };

  await tx.dropHistory.create({
    data: {
      id: dropId,
      userId: params.userId,
      caseId: params.caseId,
      itemId: item.id,
      rarity: RARITY_MAP[rarityRoll.rarity],
      condition: CONDITION_MAP[condition],
      rollSeed,
      rollValueRarity: rarityRoll.roll,
      rollValueItem: itemRoll.roll,
      weightsSnapshot,
      servedPriceRub,
    },
  });
  await tx.userInventory.create({
    data: {
      id: dropId,
      userId: params.userId,
      itemId: item.id,
      condition: CONDITION_MAP[condition],
      state: "pending",
      obtainedFromCase: params.caseId,
      servedPriceRub,
    },
  });

  return {
    dropId,
    item: {
      id: item.id,
      displayName: item.displayName,
      rarity: rarityRoll.rarity,
      condition,
      containerType: CONTAINER_TO_SHARED[item.containerType],
      imageUrl: item.imageUrl,
      imageThumbUrl: item.imageThumbUrl,
      flavorNotes: item.flavorNotes,
    },
    servedPriceRub,
  };
}
