import { z } from "zod";
import {
  CASE_IDS,
  CONDITION_VALUES,
  CONTAINER_TYPE_VALUES,
  DECISION_VALUES,
  KEY_GRADE_VALUES,
  PAYMENT_STATUS_VALUES,
  RARITY_VALUES,
  VENDING_EVENT_TYPE_VALUES,
} from "../enums.js";

const dateTime = z.string().datetime();

export const PublicCaseSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayName: z.string(),
    description: z.string(),
    priceRub: z.number().int().positive(),
    priceStarsAlt: z.number().int().positive().nullable(),
    coverUrl: z.string(),
    order: z.number().int().positive(),
    minBpmRequired: z.number().int().nonnegative(),
    hasVendingMachine: z.boolean(),
  })
  .strict();

export const CasesResponseSchema = z
  .object({
    cases: z.array(PublicCaseSchema),
  })
  .strict();

export const TachycardiaSchema = z
  .object({
    active: z.boolean(),
    until: dateTime.optional(),
  })
  .strict();

export const OpenCaseBodySchema = z
  .object({
    useTicket: z.boolean().optional(),
  })
  .strict();

export const OpenCaseItemSchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    rarity: z.enum(RARITY_VALUES),
    condition: z.enum(CONDITION_VALUES),
    containerType: z.enum(CONTAINER_TYPE_VALUES),
    imageUrl: z.string(),
    imageThumbUrl: z.string(),
    flavorNotes: z.string(),
  })
  .strict();

export const OpenCaseResponseSchema = z
  .object({
    status: z.enum(["opened", "pending_vending", "machine_ate"]),
    dropId: z.string().uuid().optional(),
    item: OpenCaseItemSchema.optional(),
    servedPriceRub: z.number().int().positive().optional(),
    tachycardia: TachycardiaSchema,
    eventId: z.string().uuid().optional(),
    eventType: z.enum(VENDING_EVENT_TYPE_VALUES).optional(),
    priceRub: z.number().int().positive().optional(),
    caseId: z.enum(CASE_IDS).optional(),
  })
  .strict();

export const SellDropResponseSchema = z
  .object({
    dropId: z.string().uuid(),
    priceRub: z.number().int().positive(),
    balanceRub: z.number().int().nonnegative(),
  })
  .strict();

export const DrinkDropResponseSchema = z
  .object({
    dropId: z.string().uuid(),
    keyGrade: z.enum(KEY_GRADE_VALUES),
    keyCount: z.number().int().positive(),
    bpmCurrent: z.number().int().min(60).max(200),
    keyBalanceAfter: z.number().int().nonnegative(),
  })
  .strict();

export const VendingDropSchema = z
  .object({
    id: z.string().uuid(),
    item: OpenCaseItemSchema,
    servedPriceRub: z.number().int().positive(),
  })
  .strict();

export const VendingHitResponseSchema = z
  .object({
    result: z.enum(["single", "double", "fail"]),
    drops: z.array(VendingDropSchema).optional(),
    refundRub: z.number().int().nonnegative().optional(),
  })
  .strict();

export const LambardSellBodySchema = z
  .object({
    grade: z.enum(KEY_GRADE_VALUES),
    count: z.number().int().min(1),
  })
  .strict();

export const LambardSellResponseSchema = z
  .object({
    rubsAdded: z.number().int().positive(),
    balanceRub: z.number().int().nonnegative(),
    keyBalanceAfter: z.number().int().nonnegative(),
  })
  .strict();

export const CraftTicketBodySchema = z
  .object({
    caseId: z.enum(CASE_IDS),
  })
  .strict();

export const CraftTicketResponseSchema = z
  .object({
    ticketId: z.string().uuid(),
    caseId: z.enum(CASE_IDS),
    expiresAt: dateTime,
  })
  .strict();

export const MeKeysSchema = z
  .object({
    gray: z.number().int().nonnegative(),
    color: z.number().int().nonnegative(),
    engraved: z.number().int().nonnegative(),
    gold: z.number().int().nonnegative(),
  })
  .strict();

export const MeResponseSchema = z
  .object({
    telegramId: z.string().regex(/^\d+$/),
    balanceRub: z.number().int().nonnegative(),
    balanceStars: z.number().int().nonnegative(),
    keys: MeKeysSchema,
    bpmCurrent: z.number().int().min(60).max(200),
    tachycardia: TachycardiaSchema,
    vipTier: z.number().int().nonnegative(),
    vipExpiresAt: dateTime.nullable(),
  })
  .strict();

export const InventoryQuerySchema = z
  .object({
    decision: z.enum(["pending", "sold", "drank"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const DropsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().uuid().optional(),
  })
  .strict();

export const InventoryItemSchema = z
  .object({
    id: z.string().uuid(),
    itemId: z.string(),
    condition: z.enum(CONDITION_VALUES),
    state: z.string(),
    servedPriceRub: z.number().int().positive(),
    decision: z.enum(DECISION_VALUES).nullable(),
    decisionAt: dateTime.nullable(),
    obtainedAt: dateTime,
    obtainedFromCase: z.string().nullable(),
    keyGrade: z.enum(KEY_GRADE_VALUES),
    item: OpenCaseItemSchema,
  })
  .strict();

export const InventoryResponseSchema = z
  .object({
    items: z.array(InventoryItemSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .strict();

export const DropHistorySchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    caseId: z.string(),
    itemId: z.string(),
    rarity: z.enum(RARITY_VALUES),
    condition: z.enum(CONDITION_VALUES),
    rollSeed: z.string().regex(/^[0-9a-f]{32}$/),
    rollValueRarity: z.number().int().min(0).max(999_999),
    rollValueItem: z.number().int().min(1),
    weightsSnapshot: z.record(z.unknown()),
    servedPriceRub: z.number().int().positive(),
    decision: z.enum(DECISION_VALUES).nullable(),
    decisionAt: dateTime.nullable(),
    createdAt: dateTime,
    item: z
      .object({
        id: z.string(),
        displayName: z.string(),
        imageThumbUrl: z.string(),
        rarity: z.enum(RARITY_VALUES),
      })
      .strict(),
    case: z
      .object({
        id: z.string(),
        displayName: z.string(),
      })
      .strict(),
  })
  .strict();

export const DropsResponseSchema = z
  .object({
    drops: z.array(DropHistorySchema),
    nextCursor: z.string().uuid().optional(),
  })
  .strict();

export const PaymentStatusSchema = z.enum(PAYMENT_STATUS_VALUES);

export const ApiErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

export type OpenCaseBody = z.infer<typeof OpenCaseBodySchema>;
export type PublicCase = z.infer<typeof PublicCaseSchema>;
export type CasesResponse = z.infer<typeof CasesResponseSchema>;
export type OpenCaseResponse = z.infer<typeof OpenCaseResponseSchema>;
export type SellDropResponse = z.infer<typeof SellDropResponseSchema>;
export type DrinkDropResponse = z.infer<typeof DrinkDropResponseSchema>;
export type VendingHitResponse = z.infer<typeof VendingHitResponseSchema>;
export type LambardSellBody = z.infer<typeof LambardSellBodySchema>;
export type LambardSellResponse = z.infer<typeof LambardSellResponseSchema>;
export type CraftTicketBody = z.infer<typeof CraftTicketBodySchema>;
export type CraftTicketResponse = z.infer<typeof CraftTicketResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type InventoryQuery = z.infer<typeof InventoryQuerySchema>;
export type InventoryResponse = z.infer<typeof InventoryResponseSchema>;
export type DropsQuery = z.infer<typeof DropsQuerySchema>;
export type DropsResponse = z.infer<typeof DropsResponseSchema>;
