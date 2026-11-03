import { describe, expect, it } from "vitest";
import { Rarity } from "@enerkrut/shared";
import {
  applyBpmToRarityWeights,
  bpmPriceMultiplier,
  TOTAL_WEIGHT,
} from "../src/engine/bpm.js";
import { computeServedPrice } from "../src/engine/pricing.js";
import { pickRarity } from "../src/engine/rolls.js";
import { resolveDrinkKeys } from "../src/engine/keys.js";

const PYATEROCHKA_WEIGHTS: Record<Rarity, number> = {
  [Rarity.Common]: 600_000,
  [Rarity.Uncommon]: 250_000,
  [Rarity.Rare]: 120_000,
  [Rarity.Epic]: 25_000,
  [Rarity.Legendary]: 4_500,
  [Rarity.FictionalMythic]: 500,
};

function seededRolls(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return Math.floor((state / 4_294_967_296) * TOTAL_WEIGHT);
  };
}

describe("pricing engine", () => {
  it("uses the exact taste and condition formula", () => {
    expect(computeServedPrice(100, 5, 1)).toBe(100);
    expect(computeServedPrice(100, 10, 1)).toBe(125);
    expect(computeServedPrice(100, 5, 0.5)).toBe(50);
    expect(computeServedPrice(100, 5, 2)).toBe(200);
    expect(computeServedPrice(1, 0, 0.5)).toBe(1);
  });

  it("matches the formula across 100 property cases", () => {
    for (let index = 0; index < 100; index += 1) {
      const base = (index * 37) % 1000 + 1;
      const taste = ((index * 13) % 101) / 10;
      const multiplier = [0.3, 0.5, 0.6, 0.7, 0.75, 0.85, 1, 2][index % 8];
      if (multiplier === undefined) {
        throw new Error("Missing multiplier fixture");
      }
      const expected = Math.max(
        1,
        Math.round(base * (1 + (taste - 5) * 0.05) * multiplier),
      );
      expect(computeServedPrice(base, taste, multiplier)).toBe(expected);
    }
  });
});

describe("BPM multiplier", () => {
  it("maps every BPM band to the required multiplier", () => {
    expect(bpmPriceMultiplier(60)).toBe(1);
    expect(bpmPriceMultiplier(79)).toBe(1);
    expect(bpmPriceMultiplier(80)).toBe(1.08);
    expect(bpmPriceMultiplier(100)).toBe(1.16);
    expect(bpmPriceMultiplier(120)).toBe(1.25);
    expect(bpmPriceMultiplier(140)).toBe(1.32);
    expect(bpmPriceMultiplier(160)).toBe(1.4);
    expect(bpmPriceMultiplier(200)).toBe(1.4);
  });

  it("keeps weights unchanged at 60 BPM", () => {
    expect(applyBpmToRarityWeights(PYATEROCHKA_WEIGHTS, 60)).toEqual(
      PYATEROCHKA_WEIGHTS,
    );
  });

  it("scales rare+ by 1.40 at 160 BPM and renormalizes to 1,000,000", () => {
    const scaled = applyBpmToRarityWeights(PYATEROCHKA_WEIGHTS, 160);
    const sum = Object.values(scaled).reduce((total, weight) => total + weight, 0);
    expect(sum).toBe(TOTAL_WEIGHT);
    expect(scaled[Rarity.Rare]).toBeGreaterThan(PYATEROCHKA_WEIGHTS[Rarity.Rare]);
    expect(scaled[Rarity.Common]).toBeLessThan(PYATEROCHKA_WEIGHTS[Rarity.Common]);
    expect(
      scaled[Rarity.Rare] / scaled[Rarity.Common],
    ).toBeCloseTo((PYATEROCHKA_WEIGHTS[Rarity.Rare] * 1.4) / PYATEROCHKA_WEIGHTS[Rarity.Common], 5);
  });
});

describe("rarity rolls", () => {
  it("matches the pyaterochka distribution within 2% over 10,000 seeded rolls", () => {
    const nextRoll = seededRolls(42);
    const counts = new Map<Rarity, number>();
    const total = 10_000;
    for (let index = 0; index < total; index += 1) {
      const rarity = pickRarity(PYATEROCHKA_WEIGHTS, nextRoll());
      counts.set(rarity, (counts.get(rarity) ?? 0) + 1);
    }
    for (const [rarity, weight] of Object.entries(PYATEROCHKA_WEIGHTS) as Array<
      [Rarity, number]
    >) {
      const expected = weight / TOTAL_WEIGHT;
      const actual = (counts.get(rarity) ?? 0) / total;
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.02);
    }
  });
});

describe("drink key grades", () => {
  it("resolves every rarity and alcohol combination", () => {
    expect(resolveDrinkKeys(Rarity.Common, false)).toEqual({
      grade: "gray",
      count: 1,
    });
    expect(resolveDrinkKeys(Rarity.Rare, false)).toEqual({
      grade: "color",
      count: 1,
    });
    expect(resolveDrinkKeys(Rarity.Rare, true)).toEqual({
      grade: "color",
      count: 1,
    });
    expect(resolveDrinkKeys(Rarity.Epic, true)).toEqual({
      grade: "engraved",
      count: 1,
    });
    expect(resolveDrinkKeys(Rarity.Legendary, false)).toEqual({
      grade: "gold",
      count: 1,
    });
    expect(resolveDrinkKeys(Rarity.FictionalMythic, false)).toEqual({
      grade: "gold",
      count: 2,
    });
  });
});
