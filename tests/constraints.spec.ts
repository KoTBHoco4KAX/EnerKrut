import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CASE_IDS,
  ItemSeedSchema,
  Rarity,
  RARITY_VALUES,
} from "@enerkrut/shared";
import type { CaseId, ItemSeed } from "@enerkrut/shared";
import { DATA_DIRECTORY, SEED_FILES } from "../apps/api/src/paths";
import { loadSeedData } from "../apps/api/src/seed/load";
import type { SeedData } from "../apps/api/src/seed/load";
import { validateSeedData } from "../apps/api/src/seed/validate";

const EXPECTED_CASES: ReadonlyArray<{
  id: CaseId;
  displayName: string;
  priceRub: number;
  order: number;
  minBpmRequired: number;
  hasVendingMachine: boolean;
}> = [
  {
    id: "pyaterochka_fridge",
    displayName: "Холодильник в «Пятёрочке»",
    priceRub: 100,
    order: 1,
    minBpmRequired: 0,
    hasVendingMachine: true,
  },
  {
    id: "tabachka_ip",
    displayName: "Табачка у ИП",
    priceRub: 350,
    order: 2,
    minBpmRequired: 0,
    hasVendingMachine: true,
  },
  {
    id: "tokyo_jidohanbai",
    displayName: "Токийский Дзидоханбайки",
    priceRub: 800,
    order: 3,
    minBpmRequired: 0,
    hasVendingMachine: true,
  },
  {
    id: "duty_free_airport",
    displayName: "Дьюти-Фри / Аэропорт",
    priceRub: 1800,
    order: 4,
    minBpmRequired: 0,
    hasVendingMachine: false,
  },
  {
    id: "avito_garage_clean",
    displayName: "Лот на Авито / Гараж",
    priceRub: 4500,
    order: 5,
    minBpmRequired: 0,
    hasVendingMachine: false,
  },
  {
    id: "ebay_private_auction",
    displayName: "Аукцион eBay",
    priceRub: 10000,
    order: 6,
    minBpmRequired: 120,
    hasVendingMachine: false,
  },
];

const EXPECTED_MATRIX: Record<CaseId, Record<Rarity, number>> = {
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

function cloneAsRecord(value: ItemSeed): Record<string, unknown> {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Unable to clone item seed");
  }
  return parsed as Record<string, unknown>;
}

describe("seed constraints", () => {
  let data: SeedData;

  beforeAll(async () => {
    data = await loadSeedData();
  });

  it("validates every JSON collection through Zod without errors", () => {
    expect(data.items.length).toBeGreaterThanOrEqual(500);
    expect(data.cases).toHaveLength(6);
    expect(data.rarityWeights).toHaveLength(36);
    expect(data.conditionProfiles).toHaveLength(4);
    for (const item of data.items) {
      expect(ItemSeedSchema.safeParse(item).success).toBe(true);
    }
  });

  it("passes the full seed validator", () => {
    const report = validateSeedData(data);
    expect(report.errors).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.counts.dropTableRows).toBe(data.items.length);
  });

  it("sums rarity weights to 1,000,000 for every case", () => {
    for (const caseId of CASE_IDS) {
      const sum = data.rarityWeights
        .filter((weight) => weight.caseId === caseId)
        .reduce((total, weight) => total + weight.weight, 0);
      expect(sum).toBe(1_000_000);
    }
  });

  it("satisfies the case and rarity matrix", () => {
    for (const caseId of CASE_IDS) {
      for (const rarity of RARITY_VALUES) {
        const actual = data.items.filter(
          (item) => item.caseId === caseId && item.rarity === rarity,
        ).length;
        expect(actual).toBeGreaterThanOrEqual(EXPECTED_MATRIX[caseId][rarity]);
      }
    }
  });

  it("enforces rule 1, alcohol flag matches alcohol percent", () => {
    for (const item of data.items) {
      expect(item.isAlcoholic).toBe(item.alcoholPercent !== undefined);
      if (item.alcoholPercent !== undefined) {
        expect(item.alcoholPercent).toBeGreaterThanOrEqual(0);
        expect(item.alcoholPercent).toBeLessThanOrEqual(20);
      }
    }
  });

  it("enforces rule 2, fictional items cascade into parody mythic cans", () => {
    for (const item of data.items.filter((candidate) => candidate.isFictional)) {
      expect(item.legalFlags.parody).toBe(true);
      expect(item.rarity).toBe(Rarity.FictionalMythic);
      expect(item.conditionProfile).toBe("fictional");
      expect(["can", "slim_can"]).toContain(item.containerType);
    }
  });

  it("enforces rule 3, narco_list_ref is always false", () => {
    for (const item of data.items) {
      expect(item.legalFlags.narco_list_ref).toBe(false);
    }
  });

  it("enforces rule 4, duty free items use premium import", () => {
    for (const item of data.items.filter(
      (candidate) => candidate.caseId === "duty_free_airport",
    )) {
      expect(item.conditionProfile).toBe("premium_import");
    }
  });

  it("enforces rule 5, eBay items are epic or higher", () => {
    const allowed = new Set<Rarity>([
      Rarity.Epic,
      Rarity.Legendary,
      Rarity.FictionalMythic,
    ]);
    for (const item of data.items.filter(
      (candidate) => candidate.caseId === "ebay_private_auction",
    )) {
      expect(allowed.has(item.rarity)).toBe(true);
    }
  });

  it("enforces rule 6, avito items are archive or discontinued", () => {
    for (const item of data.items.filter(
      (candidate) => candidate.caseId === "avito_garage_clean",
    )) {
      expect(item.isArchiveRare || item.isDiscontinued).toBe(true);
    }
  });

  it("enforces rule 7, pyaterochka items originate from RU, KZ or BY", () => {
    const allowed = new Set(["RU", "KZ", "BY"]);
    for (const item of data.items.filter(
      (candidate) => candidate.caseId === "pyaterochka_fridge",
    )) {
      expect(allowed.has(item.countryOrigin)).toBe(true);
    }
  });

  it("enforces rule 8, item ids are unique slugs", () => {
    const ids = new Set<string>();
    for (const item of data.items) {
      expect(item.id).toMatch(/^[a-z0-9_]{3,64}$/);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
  });

  it("enforces rule 9, image urls derive from item ids", () => {
    for (const item of data.items) {
      expect(item.imageUrl).toBe(`/cdn/items/${item.id}.webp`);
      expect(item.imageThumbUrl).toBe(`/cdn/items/${item.id}_thumb.webp`);
    }
  });

  it("rejects schema violations for rules 1 to 3", () => {
    const source = data.items[0];
    if (source === undefined) {
      throw new Error("Items seed is empty");
    }
    const alcoholBroken = cloneAsRecord(source);
    alcoholBroken.isAlcoholic = true;
    alcoholBroken.alcoholPercent = undefined;
    expect(ItemSeedSchema.safeParse(alcoholBroken).success).toBe(false);

    const narcoBroken = cloneAsRecord(source);
    const legalFlags = narcoBroken.legalFlags;
    if (typeof legalFlags !== "object" || legalFlags === null) {
      throw new Error("Item legal flags are missing");
    }
    narcoBroken.legalFlags = { ...legalFlags, narco_list_ref: true };
    expect(ItemSeedSchema.safeParse(narcoBroken).success).toBe(false);

    const fictionalBroken = cloneAsRecord(source);
    fictionalBroken.isFictional = true;
    expect(ItemSeedSchema.safeParse(fictionalBroken).success).toBe(false);
  });

  it("matches the exact case catalog", () => {
    for (const expected of EXPECTED_CASES) {
      const seedCase = data.cases.find((candidate) => candidate.id === expected.id);
      expect(seedCase).toBeDefined();
      expect(seedCase?.displayName).toBe(expected.displayName);
      expect(seedCase?.priceRub).toBe(expected.priceRub);
      expect(seedCase?.order).toBe(expected.order);
      expect(seedCase?.minBpmRequired).toBe(expected.minBpmRequired);
      expect(seedCase?.hasVendingMachine).toBe(expected.hasVendingMachine);
      expect(seedCase?.coverUrl).toBe(`/cdn/cases/${expected.id}.webp`);
      expect(seedCase?.priceStarsAlt ?? null).toBeNull();
      expect(seedCase?.isActive).toBe(true);
      expect(seedCase?.isVipOnly).toBe(false);
    }
  });

  it("matches the exact condition profile values", () => {
    const expected = {
      massmarket: {
        multipliers: { mint: 1, dented: 0.75, bloated: 0.5, crooked_label: 0.85 },
        allowedStates: ["mint", "dented", "bloated", "crooked_label"],
      },
      premium_import: {
        multipliers: { mint: 1, dented: 0.6, bloated: 0.3, crooked_label: 1 },
        allowedStates: ["mint", "dented", "crooked_label"],
      },
      archive_rare: {
        multipliers: { mint: 1, dented: 0.7, bloated: 2, crooked_label: 1 },
        allowedStates: ["mint", "dented", "bloated"],
      },
      fictional: {
        multipliers: { mint: 1, dented: 1, bloated: 1, crooked_label: 1 },
        allowedStates: ["mint"],
      },
    } as const;
    for (const profile of data.conditionProfiles) {
      expect(profile.multipliers).toEqual(expected[profile.key].multipliers);
      expect(profile.allowedStates).toEqual(expected[profile.key].allowedStates);
    }
  });

  it("includes the required fictional eBay collectibles", () => {
    const requiredBrands = ["Cheetah Chug", "Staminan X", "Overdose 90s", "C-Can"];
    const fictional = data.items.filter(
      (item) => item.caseId === "ebay_private_auction" && item.isFictional,
    );
    expect(fictional).toHaveLength(15);
    for (const brand of requiredBrands) {
      expect(fictional.some((item) => item.brand === brand)).toBe(true);
    }
  });

  it("keeps the generated drop table artifact in sync with items", async () => {
    const raw = await readFile(join(DATA_DIRECTORY, SEED_FILES.dropTable), "utf8");
    const parsed: unknown = JSON.parse(raw);
    expect(parsed).toEqual(validateSeedData(data).dropTable);
  });
});
