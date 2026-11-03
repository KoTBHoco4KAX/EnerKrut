import { z } from "zod";
import {
  CONDITION_PROFILE_VALUES,
  CONDITION_VALUES,
  ConditionProfileKey,
} from "../enums.js";

export const ConditionMultipliersSchema = z
  .object({
    mint: z.number().min(0).max(10),
    dented: z.number().min(0).max(10),
    bloated: z.number().min(0).max(10),
    crooked_label: z.number().min(0).max(10),
  })
  .strict();

export const ConditionProfileSeedSchema = z
  .object({
    key: z.enum(CONDITION_PROFILE_VALUES),
    multipliers: ConditionMultipliersSchema,
    allowedStates: z.array(z.enum(CONDITION_VALUES)).min(1),
    description: z.string().min(1).max(500),
  })
  .strict()
  .superRefine((profile, ctx) => {
    if (new Set(profile.allowedStates).size !== profile.allowedStates.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedStates"],
        message: "allowedStates must be unique",
      });
    }
    if (profile.key === ConditionProfileKey.Fictional) {
      if (
        profile.allowedStates.length !== 1 ||
        profile.allowedStates[0] !== "mint"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allowedStates"],
          message: "fictional profile allows only mint state",
        });
      }
    }
    for (const condition of profile.allowedStates) {
      const multiplier = profile.multipliers[condition];
      if (multiplier <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["multipliers", condition],
          message: "allowed condition multiplier must be positive",
        });
      }
    }
  });

export type ConditionProfileSeed = z.infer<typeof ConditionProfileSeedSchema>;
export type ConditionMultipliers = z.infer<typeof ConditionMultipliersSchema>;
