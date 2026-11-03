import {
  CASE_IDS,
  CONDITION_PROFILE_VALUES,
  RARITY_VALUES,
  ConditionProfileKey,
  Rarity,
} from "@enerkrut/shared";
import type { CaseId } from "@enerkrut/shared";
import type { SeedData } from "./load.js";

export interface DropTableRow {
  caseId: CaseId;
  itemId: string;
  weight: number;
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  counts: {
    items: number;
    cases: number;
    rarityWeights: number;
    conditionProfiles: number;
    dropTableRows: number;
  };
  matrix: Array<{
    caseId: CaseId;
    rarity: Rarity;
    required: number;
    actual: number;
  }>;
  dropTable: DropTableRow[];
}

const REQUIRED_MATRIX: Record<CaseId, Record<Rarity, number>> = {
  pyaterochka_fridge: {
    [Rarity.Common]: 40,
    [Rarity.Uncommon]: 20,
    [Rarity.Rare]: 12,
    [Rarity.Epic]: 4,
    [Rarity.Legendary]: 2,
    [Rarity.FictionalMythic]: 1,
  },
  tabachka_ip: {
    [Rarity.Common]: 25,
    [Rarity.Uncommon]: 25,
    [Rarity.Rare]: 20,
    [Rarity.Epic]: 8,
    [Rarity.Legendary]: 3,
    [Rarity.FictionalMythic]: 1,
  },
  tokyo_jidohanbai: {
    [Rarity.Common]: 15,
    [Rarity.Uncommon]: 25,
    [Rarity.Rare]: 25,
    [Rarity.Epic]: 10,
    [Rarity.Legendary]: 4,
    [Rarity.FictionalMythic]: 2,
  },
  duty_free_airport: {
    [Rarity.Common]: 5,
    [Rarity.Uncommon]: 20,
    [Rarity.Rare]: 30,
    [Rarity.Epic]: 20,
    [Rarity.Legendary]: 8,
    [Rarity.FictionalMythic]: 3,
  },
  avito_garage_clean: {
    [Rarity.Common]: 3,
    [Rarity.Uncommon]: 15,
    [Rarity.Rare]: 30,
    [Rarity.Epic]: 30,
    [Rarity.Legendary]: 20,
    [Rarity.FictionalMythic]: 5,
  },
  ebay_private_auction: {
    [Rarity.Common]: 0,
    [Rarity.Uncommon]: 0,
    [Rarity.Rare]: 0,
    [Rarity.Epic]: 25,
    [Rarity.Legendary]: 30,
    [Rarity.FictionalMythic]: 15,
  },
};

const SLUG_PATTERN = /^[a-z0-9_]{3,64}$/;
const PYATEROCHKA_COUNTRIES = new Set(["RU", "KZ", "BY"]);
const VENDING_CASES = new Set<string>([
  "pyaterochka_fridge",
  "tabachka_ip",
  "tokyo_jidohanbai",
]);
const EBAY_RARITIES = new Set<Rarity>([
  Rarity.Epic,
  Rarity.Legendary,
  Rarity.FictionalMythic,
]);

function matrixKey(caseId: string, rarity: Rarity): string {
  return `${caseId}:${rarity}`;
}

export function validateSeedData(data: SeedData): ValidationReport {
  const errors: string[] = [];
  const caseIds = new Set<string>();
  const caseById = new Map<string, (typeof data.cases)[number]>();
  const profileKeys = new Set<string>();
  const itemIds = new Set<string>();
  const itemCounts = new Map<string, number>();
  const weightSums = new Map<string, number>();
  const caseWeightSums = new Map<string, number>();
  const weightKeys = new Set<string>();
  for (const profile of data.conditionProfiles) {
    if (profileKeys.has(profile.key)) {
      errors.push(`duplicate condition profile: ${profile.key}`);
    }
    profileKeys.add(profile.key);
  }
  for (const requiredProfile of CONDITION_PROFILE_VALUES) {
    if (!profileKeys.has(requiredProfile)) {
      errors.push(`missing condition profile: ${requiredProfile}`);
    }
  }

  for (const seedCase of data.cases) {
    if (caseIds.has(seedCase.id)) {
      errors.push(`duplicate case id: ${seedCase.id}`);
    }
    caseIds.add(seedCase.id);
    caseById.set(seedCase.id, seedCase);
  }
  for (const requiredCase of CASE_IDS) {
    if (!caseIds.has(requiredCase)) {
      errors.push(`missing case: ${requiredCase}`);
    }
  }
  for (const seedCase of data.cases) {
    if (!(CASE_IDS as readonly string[]).includes(seedCase.id)) {
      errors.push(`unknown case id: ${seedCase.id}`);
    }
    if (!(seedCase.order >= 1)) {
      errors.push(`case ${seedCase.id} has invalid order`);
    }
    if (seedCase.hasVendingMachine !== VENDING_CASES.has(seedCase.id)) {
      errors.push(`case ${seedCase.id} has invalid hasVendingMachine flag`);
    }
  }

  const orders = data.cases.map((seedCase) => seedCase.order);
  if (new Set(orders).size !== orders.length) {
    errors.push("case order values must be unique");
  }

  if (data.items.length < 500) {
    errors.push(`items catalog must contain at least 500 rows, got ${data.items.length}`);
  }

  for (const item of data.items) {
    const label = `item ${item.id}`;
    if (!SLUG_PATTERN.test(item.id)) {
      errors.push(`${label}: id does not match ${SLUG_PATTERN.source}`);
    }
    if (itemIds.has(item.id)) {
      errors.push(`${label}: duplicate id`);
    }
    itemIds.add(item.id);
    if (!caseById.has(item.caseId)) {
      errors.push(`${label}: unknown case ${item.caseId}`);
    }
    if (!profileKeys.has(item.conditionProfile)) {
      errors.push(`${label}: unknown condition profile ${item.conditionProfile}`);
    }

    if (item.isAlcoholic !== (item.alcoholPercent !== undefined)) {
      errors.push(`${label}: rule 1 violated, alcohol flag and percent must match`);
    }
    if (item.legalFlags.narco_list_ref !== false) {
      errors.push(`${label}: rule 3 violated, narco_list_ref must be false`);
    }
    if (item.isFictional) {
      if (!item.legalFlags.parody) {
        errors.push(`${label}: rule 2 violated, fictional item must be a parody`);
      }
      if (item.rarity !== Rarity.FictionalMythic) {
        errors.push(`${label}: rule 2 violated, fictional item must be fictional_mythic`);
      }
      if (item.conditionProfile !== ConditionProfileKey.Fictional) {
        errors.push(`${label}: rule 2 violated, fictional item must use fictional profile`);
      }
      if (
        item.containerType !== "can" &&
        item.containerType !== "slim_can"
      ) {
        errors.push(`${label}: rule 2 violated, fictional item must be a can`);
      }
    }
    if (item.caseId === "duty_free_airport" && item.conditionProfile !== "premium_import") {
      errors.push(`${label}: rule 4 violated, duty free items must be premium_import`);
    }
    if (item.caseId === "ebay_private_auction" && !EBAY_RARITIES.has(item.rarity)) {
      errors.push(`${label}: rule 5 violated, eBay items must be epic or higher`);
    }
    if (
      item.caseId === "avito_garage_clean" &&
      !item.isArchiveRare &&
      !item.isDiscontinued
    ) {
      errors.push(`${label}: rule 6 violated, avito items must be archive or discontinued`);
    }
    if (
      item.caseId === "pyaterochka_fridge" &&
      !PYATEROCHKA_COUNTRIES.has(item.countryOrigin)
    ) {
      errors.push(`${label}: rule 7 violated, pyaterochka origin must be RU, KZ or BY`);
    }
    if (item.imageUrl !== `/cdn/items/${item.id}.webp`) {
      errors.push(`${label}: rule 9 violated, imageUrl mismatch`);
    }
    if (item.imageThumbUrl !== `/cdn/items/${item.id}_thumb.webp`) {
      errors.push(`${label}: rule 9 violated, imageThumbUrl mismatch`);
    }
    if (item.alcoholPercent !== undefined && item.alcoholPercent > 20) {
      errors.push(`${label}: alcoholPercent exceeds 20`);
    }

    const key = matrixKey(item.caseId, item.rarity);
    itemCounts.set(key, (itemCounts.get(key) ?? 0) + 1);
  }

  for (const weight of data.rarityWeights) {
    const key = matrixKey(weight.caseId, weight.rarity);
    if (weightKeys.has(key)) {
      errors.push(`duplicate rarity weight: ${key}`);
    }
    weightKeys.add(key);
    weightSums.set(key, (weightSums.get(key) ?? 0) + weight.weight);
    caseWeightSums.set(
      weight.caseId,
      (caseWeightSums.get(weight.caseId) ?? 0) + weight.weight,
    );
  }

  for (const caseId of CASE_IDS) {
    const caseSum = caseWeightSums.get(caseId) ?? 0;
    if (caseSum !== 1_000_000) {
      errors.push(`rarity weights must sum to 1000000 for ${caseId}: got ${caseSum}`);
    }
    for (const rarity of RARITY_VALUES) {
      const key = matrixKey(caseId, rarity);
      if (!weightKeys.has(key)) {
        errors.push(`missing rarity weight: ${key}`);
      }
      const sum = weightSums.get(key) ?? 0;
      if ((itemCounts.get(key) ?? 0) > 0 && sum <= 0) {
        errors.push(`positive item count requires positive rarity weight: ${key}`);
      }
    }
  }

  const matrix: ValidationReport["matrix"] = [];
  for (const caseId of CASE_IDS) {
    for (const rarity of RARITY_VALUES) {
      const required = REQUIRED_MATRIX[caseId][rarity];
      const actual = itemCounts.get(matrixKey(caseId, rarity)) ?? 0;
      matrix.push({ caseId, rarity, required, actual });
      if (actual < required) {
        errors.push(
          `matrix violated for ${caseId}/${rarity}: required ${required}, got ${actual}`,
        );
      }
    }
  }

  const dropTable: DropTableRow[] = data.items.map((item) => ({
    caseId: item.caseId,
    itemId: item.id,
    weight: item.weightInRarity,
  }));

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      items: data.items.length,
      cases: data.cases.length,
      rarityWeights: data.rarityWeights.length,
      conditionProfiles: data.conditionProfiles.length,
      dropTableRows: dropTable.length,
    },
    matrix,
    dropTable,
  };
}
