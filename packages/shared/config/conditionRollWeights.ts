import {
  Condition,
  ConditionProfileKey,
} from "../enums.js";

export const CONDITION_ROLL_WEIGHTS: Record<
  ConditionProfileKey,
  Record<Condition, number>
> = {
  [ConditionProfileKey.Massmarket]: {
    [Condition.Mint]: 60,
    [Condition.Dented]: 25,
    [Condition.Bloated]: 10,
    [Condition.CrookedLabel]: 5,
  },
  [ConditionProfileKey.PremiumImport]: {
    [Condition.Mint]: 85,
    [Condition.Dented]: 10,
    [Condition.Bloated]: 0,
    [Condition.CrookedLabel]: 5,
  },
  [ConditionProfileKey.ArchiveRare]: {
    [Condition.Mint]: 40,
    [Condition.Dented]: 35,
    [Condition.Bloated]: 25,
    [Condition.CrookedLabel]: 0,
  },
  [ConditionProfileKey.Fictional]: {
    [Condition.Mint]: 100,
    [Condition.Dented]: 0,
    [Condition.Bloated]: 0,
    [Condition.CrookedLabel]: 0,
  },
};
