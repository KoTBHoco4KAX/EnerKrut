import type {
  Condition as PrismaCondition,
  ConditionProfileKey as PrismaConditionProfileKey,
} from "@prisma/client";
import {
  CONDITION_ROLL_WEIGHTS,
  Condition,
  Rarity,
  RARITY_VALUES,
} from "@enerkrut/shared";
import { CONDITION_TO_SHARED, PROFILE_TO_SHARED } from "../lib/prisma-maps.js";
import { TOTAL_WEIGHT } from "./bpm.js";

export interface WeightedEntry<T> {
  value: T;
  weight: number;
}

export interface ConditionRollEntry {
  condition: Condition;
  weight: number;
}

export function pickRarity(weights: Record<Rarity, number>, roll: number): Rarity {
  let cumulative = 0;
  for (const rarity of RARITY_VALUES) {
    cumulative += weights[rarity];
    if (roll < cumulative) {
      return rarity;
    }
  }
  return Rarity.FictionalMythic;
}

export function pickWeighted<T>(
  entries: ReadonlyArray<WeightedEntry<T>>,
  roll: number,
): T {
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      return entry.value;
    }
  }
  const last = entries[entries.length - 1];
  if (last === undefined) {
    throw new Error("Weighted collection is empty");
  }
  return last.value;
}

export function pickCondition(
  entries: ReadonlyArray<ConditionRollEntry>,
  roll: number,
): Condition {
  return pickWeighted(
    entries.map((entry) => ({ value: entry.condition, weight: entry.weight })),
    roll,
  );
}

export function conditionRollEntries(
  profile: PrismaConditionProfileKey,
  allowedStates: ReadonlyArray<PrismaCondition>,
): ConditionRollEntry[] {
  const weights = CONDITION_ROLL_WEIGHTS[PROFILE_TO_SHARED[profile]];
  const allowed = new Set(allowedStates.map((state) => CONDITION_TO_SHARED[state]));
  const entries: ConditionRollEntry[] = [];
  for (const condition of Object.values(Condition)) {
    if (allowed.has(condition) && weights[condition] > 0) {
      entries.push({ condition, weight: weights[condition] });
    }
  }
  if (entries.length === 0) {
    throw new Error("No allowed condition weights for profile");
  }
  return entries;
}

export function conditionWeightTotal(entries: ReadonlyArray<ConditionRollEntry>): number {
  return entries.reduce((sum, entry) => sum + entry.weight, 0);
}

export function rollRarity(
  rng: { int(minInclusive: number, maxExclusive: number): number },
  weights: Record<Rarity, number>,
): { rarity: Rarity; roll: number } {
  const roll = rng.int(0, TOTAL_WEIGHT);
  return { rarity: pickRarity(weights, roll), roll };
}

export function rollItem<T>(
  rng: { int(minInclusive: number, maxExclusive: number): number },
  entries: ReadonlyArray<WeightedEntry<T>>,
): { value: T; roll: number } {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    throw new Error("Item weights must have a positive sum");
  }
  const roll = rng.int(1, total + 1);
  return { value: pickWeighted(entries, roll), roll };
}

export function rollCondition(
  rng: { int(minInclusive: number, maxExclusive: number): number },
  entries: ReadonlyArray<ConditionRollEntry>,
): { condition: Condition; roll: number } {
  const total = conditionWeightTotal(entries);
  const roll = rng.int(0, total);
  return { condition: pickCondition(entries, roll), roll };
}
