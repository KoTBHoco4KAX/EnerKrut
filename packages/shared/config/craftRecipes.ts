import { KeyGrade } from "../enums.js";
import type { CaseId } from "../enums.js";

export type CraftRecipe = Partial<Record<KeyGrade, number>>;

export const CRAFT_RECIPES = {
  pyaterochka_fridge: { [KeyGrade.Gray]: 10 },
  tabachka_ip: { [KeyGrade.Gray]: 5 },
  tokyo_jidohanbai: { [KeyGrade.Gray]: 15, [KeyGrade.Color]: 3 },
  duty_free_airport: { [KeyGrade.Color]: 5, [KeyGrade.Engraved]: 2 },
  avito_garage_clean: { [KeyGrade.Engraved]: 3, [KeyGrade.Gold]: 1 },
  ebay_private_auction: { [KeyGrade.Gold]: 5 },
} satisfies Record<CaseId, CraftRecipe>;
