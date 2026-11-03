import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import {
  CaseSeedSchema,
  ConditionProfileSeedSchema,
  ItemSeedSchema,
  RarityWeightSeedSchema,
} from "@enerkrut/shared";
import type {
  CaseSeed,
  ConditionProfileSeed,
  ItemSeed,
  RarityWeightSeed,
} from "@enerkrut/shared";
import { DATA_DIRECTORY, SEED_FILES } from "../paths.js";

export interface SeedData {
  items: ItemSeed[];
  cases: CaseSeed[];
  rarityWeights: RarityWeightSeed[];
  conditionProfiles: ConditionProfileSeed[];
}

async function readJson(fileName: string): Promise<unknown> {
  const raw = await readFile(join(DATA_DIRECTORY, fileName), "utf8");
  const parsed: unknown = JSON.parse(raw);
  return parsed;
}

function parseCollection<T>(schema: z.ZodType<T>, raw: unknown, fileName: string): T[] {
  const result = schema.array().safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`${fileName} failed schema validation: ${issues}`);
  }
  return result.data;
}

export async function loadSeedData(): Promise<SeedData> {
  const [itemsRaw, casesRaw, weightsRaw, profilesRaw] = await Promise.all([
    readJson(SEED_FILES.items),
    readJson(SEED_FILES.cases),
    readJson(SEED_FILES.rarityWeights),
    readJson(SEED_FILES.conditionProfiles),
  ]);

  return {
    items: parseCollection(ItemSeedSchema, itemsRaw, SEED_FILES.items),
    cases: parseCollection(CaseSeedSchema, casesRaw, SEED_FILES.cases),
    rarityWeights: parseCollection(
      RarityWeightSeedSchema,
      weightsRaw,
      SEED_FILES.rarityWeights,
    ),
    conditionProfiles: parseCollection(
      ConditionProfileSeedSchema,
      profilesRaw,
      SEED_FILES.conditionProfiles,
    ),
  };
}
