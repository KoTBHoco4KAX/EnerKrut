import type { Condition as PrismaCondition } from "@prisma/client";
import { ConditionMultipliersSchema } from "@enerkrut/shared";
import type { ConditionMultipliers } from "@enerkrut/shared";
import { AppError } from "../lib/errors.js";

const MULTIPLIER_KEYS: Record<PrismaCondition, keyof ConditionMultipliers> = {
  mint: "mint",
  dented: "dented",
  bloated: "bloated",
  crooked_label: "crooked_label",
};

export function computeServedPrice(
  basePriceRub: number,
  tasteScore: number,
  conditionMultiplier: number,
): number {
  const tasteScoreMult = 1 + (tasteScore - 5) * 0.05;
  return Math.max(1, Math.round(basePriceRub * tasteScoreMult * conditionMultiplier));
}

export function readConditionMultipliers(value: unknown): ConditionMultipliers {
  const parsed = ConditionMultipliersSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(500, "config_error", "Condition profile multipliers are invalid");
  }
  return parsed.data;
}

export function conditionMultiplier(
  multipliers: ConditionMultipliers,
  condition: PrismaCondition,
): number {
  return multipliers[MULTIPLIER_KEYS[condition]];
}
