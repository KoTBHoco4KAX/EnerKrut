import { RARITY_VALUES, Rarity } from "@enerkrut/shared";

export const TOTAL_WEIGHT = 1_000_000;

const RARE_PLUS = new Set<Rarity>([
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
  Rarity.FictionalMythic,
]);

export function bpmPriceMultiplier(bpm: number): number {
  if (bpm < 80) {
    return 1;
  }
  if (bpm < 100) {
    return 1.08;
  }
  if (bpm < 120) {
    return 1.16;
  }
  if (bpm < 140) {
    return 1.25;
  }
  if (bpm < 160) {
    return 1.32;
  }
  return 1.4;
}

export function normalizeRarityWeights(
  weights: Record<Rarity, number>,
): Record<Rarity, number> {
  const total = RARITY_VALUES.reduce((sum, rarity) => sum + weights[rarity], 0);
  if (total <= 0) {
    throw new Error("Rarity weights must have a positive sum");
  }
  const parts = RARITY_VALUES.map((rarity) => {
    const exact = (weights[rarity] / total) * TOTAL_WEIGHT;
    const floored = Math.floor(exact);
    return { rarity, value: floored, remainder: exact - floored };
  });
  let assigned = parts.reduce((sum, part) => sum + part.value, 0);
  const byRemainder = parts
    .filter((part) => weights[part.rarity] > 0)
    .sort((left, right) => right.remainder - left.remainder);
  let index = 0;
  while (assigned < TOTAL_WEIGHT) {
    if (byRemainder.length === 0) {
      throw new Error("Unable to distribute rarity weight remainder");
    }
    const part = byRemainder[index % byRemainder.length];
    if (part === undefined) {
      throw new Error("Unable to distribute rarity weight remainder");
    }
    part.value += 1;
    assigned += 1;
    index += 1;
  }
  return Object.fromEntries(
    parts.map((part) => [part.rarity, part.value]),
  ) as Record<Rarity, number>;
}

export function applyBpmToRarityWeights(
  weights: Record<Rarity, number>,
  bpm: number,
): Record<Rarity, number> {
  const multiplier = bpmPriceMultiplier(bpm);
  const scaled: Record<Rarity, number> = {
    [Rarity.Common]: weights[Rarity.Common],
    [Rarity.Uncommon]: weights[Rarity.Uncommon],
    [Rarity.Rare]: weights[Rarity.Rare],
    [Rarity.Epic]: weights[Rarity.Epic],
    [Rarity.Legendary]: weights[Rarity.Legendary],
    [Rarity.FictionalMythic]: weights[Rarity.FictionalMythic],
  };
  for (const rarity of RARE_PLUS) {
    scaled[rarity] = weights[rarity] * multiplier;
  }
  return normalizeRarityWeights(scaled);
}

export function selectRarity(
  weights: Record<Rarity, number>,
  roll: number,
): Rarity | null {
  let cumulative = 0;
  for (const rarity of RARITY_VALUES) {
    cumulative += weights[rarity];
    if (roll < cumulative) {
      return rarity;
    }
  }
  return null;
}
