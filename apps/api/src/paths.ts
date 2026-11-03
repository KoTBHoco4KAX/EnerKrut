import { fileURLToPath } from "node:url";

export const DATA_DIRECTORY = fileURLToPath(new URL("../../../data/", import.meta.url));

export const SEED_FILES = {
  items: "items.seed.json",
  cases: "cases.seed.json",
  rarityWeights: "rarity_weights.seed.json",
  conditionProfiles: "condition_profiles.json",
  dropTable: "drop_table.seed.json",
} as const;
