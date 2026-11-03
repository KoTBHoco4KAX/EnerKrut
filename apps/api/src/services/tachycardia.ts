import type { User } from "@prisma/client";
import type { RandomSource } from "../lib/random.js";

export interface TachycardiaState {
  active: boolean;
  until: Date | null;
  changed: boolean;
}

const TACHYCARDIA_DURATION_MS = 30 * 60 * 1000;

export function normalizeTachycardia(user: User, now: Date): TachycardiaState {
  const active =
    user.tachycardiaActive &&
    user.tachycardiaUntil !== null &&
    user.tachycardiaUntil.getTime() > now.getTime();
  if (active) {
    return { active: true, until: user.tachycardiaUntil, changed: false };
  }
  return {
    active: false,
    until: null,
    changed: user.tachycardiaActive || user.tachycardiaUntil !== null,
  };
}

export function maybeTriggerTachycardia(
  user: User,
  rng: RandomSource,
  now: Date,
): TachycardiaState {
  const normalized = normalizeTachycardia(user, now);
  if (normalized.active) {
    return normalized;
  }
  const chance = Math.min(
    0.05,
    0.02 + Math.max(0, user.bpmCurrent - 60) * 0.0005,
  );
  const roll = rng.int(0, 1_000_000);
  if (roll < chance * 1_000_000) {
    return {
      active: true,
      until: new Date(now.getTime() + TACHYCARDIA_DURATION_MS),
      changed: true,
    };
  }
  return normalized;
}

export function tachycardiaPayload(state: {
  active: boolean;
  until: Date | null;
}): { active: boolean; until?: string } {
  return state.active && state.until !== null
    ? { active: true, until: state.until.toISOString() }
    : { active: false };
}
