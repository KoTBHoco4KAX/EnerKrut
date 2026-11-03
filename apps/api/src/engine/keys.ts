import { KeyGrade, Rarity } from "@enerkrut/shared";

export interface DrinkKeyResult {
  grade: KeyGrade;
  count: number;
}

const RARITY_RANK: Record<Rarity, number> = {
  [Rarity.Common]: 1,
  [Rarity.Uncommon]: 1,
  [Rarity.Rare]: 2,
  [Rarity.Epic]: 3,
  [Rarity.Legendary]: 4,
  [Rarity.FictionalMythic]: 4,
};

const GRADE_BY_RANK: Record<number, KeyGrade> = {
  1: KeyGrade.Gray,
  2: KeyGrade.Color,
  3: KeyGrade.Engraved,
  4: KeyGrade.Gold,
};

export function resolveDrinkKeys(
  rarity: Rarity,
  isAlcoholic: boolean,
): DrinkKeyResult {
  const rarityRank = RARITY_RANK[rarity];
  const alcoRank = isAlcoholic ? 2 : 0;
  const gradeRank = Math.max(rarityRank, alcoRank);
  const grade = GRADE_BY_RANK[gradeRank];
  if (grade === undefined) {
    throw new Error(`Unknown key grade rank: ${gradeRank}`);
  }
  return {
    grade,
    count: rarity === Rarity.FictionalMythic ? 2 : 1,
  };
}
