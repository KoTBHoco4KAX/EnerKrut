import { KeyGrade } from "../enums.js";

export const LAMBARD_RATES: Record<KeyGrade, number> = {
  [KeyGrade.Gray]: 15,
  [KeyGrade.Color]: 50,
  [KeyGrade.Engraved]: 200,
  [KeyGrade.Gold]: 800,
};

export const LAMBARD_MIN_BALANCE_RUB = 300;
