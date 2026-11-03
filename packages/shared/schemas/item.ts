import { z } from "zod";
import {
  CASE_IDS,
  CONTAINER_TYPE_VALUES,
  CONDITION_PROFILE_VALUES,
  ITEM_SOURCE_VALUES,
  RARITY_VALUES,
  ContainerType,
  ConditionProfileKey,
  Rarity,
} from "../enums.js";

const SLUG_PATTERN = /^[a-z0-9_]{3,64}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const ONE_DECIMAL = (value: number): boolean =>
  Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;

export const ItemLegalFlagsSchema = z
  .object({
    parody: z.boolean(),
    alcohol: z.boolean(),
    narco_list_ref: z.literal(false),
  })
  .strict();

export const ItemSeedSchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN),
    displayName: z.string().min(1).max(160),
    displayNameRu: z.string().min(1).max(160).optional(),
    brand: z.string().min(1).max(80),
    countryOrigin: z.string().regex(COUNTRY_PATTERN),
    containerType: z.enum(CONTAINER_TYPE_VALUES),
    rarity: z.enum(RARITY_VALUES),
    conditionProfile: z.enum(CONDITION_PROFILE_VALUES),
    basePriceRub: z.number().int().min(1),
    tasteScore: z.number().min(0).max(10).refine(ONE_DECIMAL),
    flavorNotes: z.string().min(1).max(240),
    yearRelease: z.number().int().min(1960).max(2030).optional(),
    isAlcoholic: z.boolean(),
    alcoholPercent: z.number().min(0).max(20).refine(ONE_DECIMAL).optional(),
    isFictional: z.boolean(),
    isDiscontinued: z.boolean(),
    isArchiveRare: z.boolean(),
    imageUrl: z.string().regex(/^\/cdn\/items\/[a-z0-9_]{3,64}\.webp$/),
    imageThumbUrl: z.string().regex(/^\/cdn\/items\/[a-z0-9_]{3,64}_thumb\.webp$/),
    source: z.enum(ITEM_SOURCE_VALUES),
    legalFlags: ItemLegalFlagsSchema,
    caseId: z.enum(CASE_IDS),
    weightInRarity: z.number().int().min(1),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.isAlcoholic && item.alcoholPercent === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alcoholPercent"],
        message: "alcoholPercent is required for alcoholic items",
      });
    }
    if (!item.isAlcoholic && item.alcoholPercent !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alcoholPercent"],
        message: "alcoholPercent is forbidden for non-alcoholic items",
      });
    }
    if (item.legalFlags.alcohol !== item.isAlcoholic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalFlags", "alcohol"],
        message: "legalFlags.alcohol must match isAlcoholic",
      });
    }
    if (item.legalFlags.narco_list_ref !== false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalFlags", "narco_list_ref"],
        message: "narco_list_ref must always be false",
      });
    }
    if (item.imageUrl !== `/cdn/items/${item.id}.webp`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageUrl"],
        message: "imageUrl must match the item id",
      });
    }
    if (item.imageThumbUrl !== `/cdn/items/${item.id}_thumb.webp`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageThumbUrl"],
        message: "imageThumbUrl must match the item id",
      });
    }
    if (item.isFictional) {
      if (!item.legalFlags.parody) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legalFlags", "parody"],
          message: "fictional items require parody flag",
        });
      }
      if (item.rarity !== Rarity.FictionalMythic) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rarity"],
          message: "fictional items must use fictional_mythic rarity",
        });
      }
      if (item.conditionProfile !== ConditionProfileKey.Fictional) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionProfile"],
          message: "fictional items must use fictional condition profile",
        });
      }
      if (
        item.containerType !== ContainerType.Can &&
        item.containerType !== ContainerType.SlimCan
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["containerType"],
          message: "fictional items must use can or slim_can containers",
        });
      }
    }
    if (item.legalFlags.parody) {
      if (item.rarity !== Rarity.FictionalMythic) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rarity"],
          message: "parody items must use fictional_mythic rarity",
        });
      }
      if (item.conditionProfile !== ConditionProfileKey.Fictional) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionProfile"],
          message: "parody items must use fictional condition profile",
        });
      }
      if (
        item.containerType !== ContainerType.Can &&
        item.containerType !== ContainerType.SlimCan
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["containerType"],
          message: "parody items must use can or slim_can containers",
        });
      }
    }
  });

export type ItemSeed = z.infer<typeof ItemSeedSchema>;
