export enum Rarity {
  Common = "common",
  Uncommon = "uncommon",
  Rare = "rare",
  Epic = "epic",
  Legendary = "legendary",
  FictionalMythic = "fictional_mythic",
}

export enum Condition {
  Mint = "mint",
  Dented = "dented",
  Bloated = "bloated",
  CrookedLabel = "crooked_label",
}

export enum ConditionProfileKey {
  Massmarket = "massmarket",
  PremiumImport = "premium_import",
  ArchiveRare = "archive_rare",
  Fictional = "fictional",
}

export enum ContainerType {
  Can = "can",
  SlimCan = "slim_can",
  Bottle = "bottle",
  Shot = "shot",
  Jar = "jar",
  Tube = "tube",
  Jelly = "jelly",
  Ration = "ration",
  Carton = "carton",
}

export enum KeyGrade {
  Gray = "gray",
  Color = "color",
  Engraved = "engraved",
  Gold = "gold",
}

export enum Decision {
  Sold = "sold",
  Drank = "drank",
  Kept = "kept",
}

export enum VendingEventType {
  StuckCanHit = "stuck_can_hit",
  StuckCanDouble = "stuck_can_double",
  StuckCanFail = "stuck_can_fail",
  MachineAte100 = "machine_ate_100",
  TachycardiaTrigger = "tachycardia_trigger",
}

export enum LedgerCurrency {
  Rub = "rub",
  Star = "star",
}

export enum PaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
  Refunded = "refunded",
}

export enum PaymentPurpose {
  RubPackSmall = "rub_pack_small",
  RubPackMid = "rub_pack_mid",
  RubPackLarge = "rub_pack_large",
  Vip30d = "vip_30d",
  Vip90d = "vip_90d",
  DonateSafe = "donate_safe",
  DonateImport = "donate_import",
  AuctionPass = "auction_pass",
}

export enum ItemSource {
  OpenFoodFacts = "open_food_facts",
  Registry = "registry",
  Manual = "manual",
}

export const RARITY_VALUES = [
  Rarity.Common,
  Rarity.Uncommon,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
  Rarity.FictionalMythic,
] as const;

export const CONDITION_VALUES = [
  Condition.Mint,
  Condition.Dented,
  Condition.Bloated,
  Condition.CrookedLabel,
] as const;

export const CONDITION_PROFILE_VALUES = [
  ConditionProfileKey.Massmarket,
  ConditionProfileKey.PremiumImport,
  ConditionProfileKey.ArchiveRare,
  ConditionProfileKey.Fictional,
] as const;

export const CONTAINER_TYPE_VALUES = [
  ContainerType.Can,
  ContainerType.SlimCan,
  ContainerType.Bottle,
  ContainerType.Shot,
  ContainerType.Jar,
  ContainerType.Tube,
  ContainerType.Jelly,
  ContainerType.Ration,
  ContainerType.Carton,
] as const;

export const KEY_GRADE_VALUES = [
  KeyGrade.Gray,
  KeyGrade.Color,
  KeyGrade.Engraved,
  KeyGrade.Gold,
] as const;

export const DECISION_VALUES = [Decision.Sold, Decision.Drank, Decision.Kept] as const;

export const VENDING_EVENT_TYPE_VALUES = [
  VendingEventType.StuckCanHit,
  VendingEventType.StuckCanDouble,
  VendingEventType.StuckCanFail,
  VendingEventType.MachineAte100,
  VendingEventType.TachycardiaTrigger,
] as const;

export const LEDGER_CURRENCY_VALUES = [LedgerCurrency.Rub, LedgerCurrency.Star] as const;

export const PAYMENT_STATUS_VALUES = [
  PaymentStatus.Pending,
  PaymentStatus.Paid,
  PaymentStatus.Failed,
  PaymentStatus.Refunded,
] as const;

export const PAYMENT_PURPOSE_VALUES = [
  PaymentPurpose.RubPackSmall,
  PaymentPurpose.RubPackMid,
  PaymentPurpose.RubPackLarge,
  PaymentPurpose.Vip30d,
  PaymentPurpose.Vip90d,
  PaymentPurpose.DonateSafe,
  PaymentPurpose.DonateImport,
  PaymentPurpose.AuctionPass,
] as const;

export const ITEM_SOURCE_VALUES = [
  ItemSource.OpenFoodFacts,
  ItemSource.Registry,
  ItemSource.Manual,
] as const;

export const CASE_IDS = [
  "pyaterochka_fridge",
  "tabachka_ip",
  "tokyo_jidohanbai",
  "duty_free_airport",
  "avito_garage_clean",
  "ebay_private_auction",
] as const;

export type CaseId = (typeof CASE_IDS)[number];
