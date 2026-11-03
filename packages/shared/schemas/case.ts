import { z } from "zod";
import { CASE_IDS, RARITY_VALUES } from "../enums.js";

const SLUG_PATTERN = /^[a-z0-9_]{3,64}$/;

export const CaseSeedSchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN),
    slug: z.string().regex(SLUG_PATTERN),
    displayName: z.string().min(1).max(160),
    description: z.string().min(1).max(2000),
    priceRub: z.number().int().min(1),
    priceStarsAlt: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean(),
    minBpmRequired: z.number().int().min(0),
    isVipOnly: z.boolean(),
    hasVendingMachine: z.boolean(),
    coverUrl: z.string().min(1),
    order: z.number().int().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.id !== value.slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slug"],
        message: "id and slug must match",
      });
    }
    if (value.coverUrl !== `/cdn/cases/${value.slug}.webp`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coverUrl"],
        message: "coverUrl must match the case slug",
      });
    }
  });

export const RarityWeightSeedSchema = z
  .object({
    caseId: z.enum(CASE_IDS),
    rarity: z.enum(RARITY_VALUES),
    weight: z.number().int().min(0).max(1_000_000),
  })
  .strict();

export type CaseSeed = z.infer<typeof CaseSeedSchema>;
export type RarityWeightSeed = z.infer<typeof RarityWeightSeedSchema>;
