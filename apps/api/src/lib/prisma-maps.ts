import {
  Condition as PrismaCondition,
  ConditionProfileKey as PrismaConditionProfileKey,
  ContainerType as PrismaContainerType,
  Decision as PrismaDecision,
  KeyGrade as PrismaKeyGrade,
  Rarity as PrismaRarity,
} from "@prisma/client";
import {
  Condition as SharedCondition,
  ConditionProfileKey as SharedConditionProfileKey,
  ContainerType as SharedContainerType,
  Decision as SharedDecision,
  KeyGrade as SharedKeyGrade,
  Rarity as SharedRarity,
} from "@enerkrut/shared";

export const RARITY_MAP: Record<SharedRarity, PrismaRarity> = {
  [SharedRarity.Common]: PrismaRarity.common,
  [SharedRarity.Uncommon]: PrismaRarity.uncommon,
  [SharedRarity.Rare]: PrismaRarity.rare,
  [SharedRarity.Epic]: PrismaRarity.epic,
  [SharedRarity.Legendary]: PrismaRarity.legendary,
  [SharedRarity.FictionalMythic]: PrismaRarity.fictional_mythic,
};

export const CONDITION_MAP: Record<SharedCondition, PrismaCondition> = {
  [SharedCondition.Mint]: PrismaCondition.mint,
  [SharedCondition.Dented]: PrismaCondition.dented,
  [SharedCondition.Bloated]: PrismaCondition.bloated,
  [SharedCondition.CrookedLabel]: PrismaCondition.crooked_label,
};

export const PROFILE_MAP: Record<
  SharedConditionProfileKey,
  PrismaConditionProfileKey
> = {
  [SharedConditionProfileKey.Massmarket]: PrismaConditionProfileKey.massmarket,
  [SharedConditionProfileKey.PremiumImport]: PrismaConditionProfileKey.premium_import,
  [SharedConditionProfileKey.ArchiveRare]: PrismaConditionProfileKey.archive_rare,
  [SharedConditionProfileKey.Fictional]: PrismaConditionProfileKey.fictional,
};

export const CONTAINER_MAP: Record<SharedContainerType, PrismaContainerType> = {
  [SharedContainerType.Can]: PrismaContainerType.can,
  [SharedContainerType.SlimCan]: PrismaContainerType.slim_can,
  [SharedContainerType.Bottle]: PrismaContainerType.bottle,
  [SharedContainerType.Shot]: PrismaContainerType.shot,
  [SharedContainerType.Jar]: PrismaContainerType.jar,
  [SharedContainerType.Tube]: PrismaContainerType.tube,
  [SharedContainerType.Jelly]: PrismaContainerType.jelly,
  [SharedContainerType.Ration]: PrismaContainerType.ration,
  [SharedContainerType.Carton]: PrismaContainerType.carton,
};

export const KEY_GRADE_MAP: Record<SharedKeyGrade, PrismaKeyGrade> = {
  [SharedKeyGrade.Gray]: PrismaKeyGrade.gray,
  [SharedKeyGrade.Color]: PrismaKeyGrade.color,
  [SharedKeyGrade.Engraved]: PrismaKeyGrade.engraved,
  [SharedKeyGrade.Gold]: PrismaKeyGrade.gold,
};

export const PROFILE_TO_SHARED: Record<
  PrismaConditionProfileKey,
  SharedConditionProfileKey
> = {
  [PrismaConditionProfileKey.massmarket]: SharedConditionProfileKey.Massmarket,
  [PrismaConditionProfileKey.premium_import]: SharedConditionProfileKey.PremiumImport,
  [PrismaConditionProfileKey.archive_rare]: SharedConditionProfileKey.ArchiveRare,
  [PrismaConditionProfileKey.fictional]: SharedConditionProfileKey.Fictional,
};

export const CONDITION_TO_SHARED: Record<PrismaCondition, SharedCondition> = {
  [PrismaCondition.mint]: SharedCondition.Mint,
  [PrismaCondition.dented]: SharedCondition.Dented,
  [PrismaCondition.bloated]: SharedCondition.Bloated,
  [PrismaCondition.crooked_label]: SharedCondition.CrookedLabel,
};

export const RARITY_TO_SHARED: Record<PrismaRarity, SharedRarity> = {
  [PrismaRarity.common]: SharedRarity.Common,
  [PrismaRarity.uncommon]: SharedRarity.Uncommon,
  [PrismaRarity.rare]: SharedRarity.Rare,
  [PrismaRarity.epic]: SharedRarity.Epic,
  [PrismaRarity.legendary]: SharedRarity.Legendary,
  [PrismaRarity.fictional_mythic]: SharedRarity.FictionalMythic,
};

export const KEY_GRADE_TO_SHARED: Record<PrismaKeyGrade, SharedKeyGrade> = {
  [PrismaKeyGrade.gray]: SharedKeyGrade.Gray,
  [PrismaKeyGrade.color]: SharedKeyGrade.Color,
  [PrismaKeyGrade.engraved]: SharedKeyGrade.Engraved,
  [PrismaKeyGrade.gold]: SharedKeyGrade.Gold,
};

export const CONTAINER_TO_SHARED: Record<
  PrismaContainerType,
  SharedContainerType
> = {
  [PrismaContainerType.can]: SharedContainerType.Can,
  [PrismaContainerType.slim_can]: SharedContainerType.SlimCan,
  [PrismaContainerType.bottle]: SharedContainerType.Bottle,
  [PrismaContainerType.shot]: SharedContainerType.Shot,
  [PrismaContainerType.jar]: SharedContainerType.Jar,
  [PrismaContainerType.tube]: SharedContainerType.Tube,
  [PrismaContainerType.jelly]: SharedContainerType.Jelly,
  [PrismaContainerType.ration]: SharedContainerType.Ration,
  [PrismaContainerType.carton]: SharedContainerType.Carton,
};

export const DECISION_TO_SHARED: Record<PrismaDecision, SharedDecision> = {
  [PrismaDecision.sold]: SharedDecision.Sold,
  [PrismaDecision.drank]: SharedDecision.Drank,
  [PrismaDecision.kept]: SharedDecision.Kept,
};
