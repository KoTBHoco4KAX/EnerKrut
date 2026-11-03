import type { Prisma } from "@prisma/client";
import type {
  CraftTicketBody,
  CraftTicketResponse,
} from "@enerkrut/shared";
import {
  CRAFT_RECIPES,
  KEY_GRADE_VALUES,
  KeyGrade,
} from "@enerkrut/shared";
import type { CaseId, CraftRecipe } from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { AppError } from "../lib/errors.js";
import { lockUser } from "../lib/locks.js";
import { KEY_GRADE_MAP } from "../lib/prisma-maps.js";

const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;
const TICKET_TTL_MS = 24 * 60 * 60 * 1000;

function keyBalance(
  user: {
    keysGray: number;
    keysColor: number;
    keysEngraved: number;
    keysGold: number;
  },
  grade: KeyGrade,
): number {
  switch (grade) {
    case KeyGrade.Gray:
      return user.keysGray;
    case KeyGrade.Color:
      return user.keysColor;
    case KeyGrade.Engraved:
      return user.keysEngraved;
    case KeyGrade.Gold:
      return user.keysGold;
  }
  throw new Error("Unknown key grade");
}

export async function craftTicket(
  deps: AppDeps,
  userId: string,
  body: CraftTicketBody,
): Promise<CraftTicketResponse> {
  const recipes: Record<CaseId, CraftRecipe> = CRAFT_RECIPES;
  const rawRecipe = recipes[body.caseId];
  if (rawRecipe === undefined) {
    throw new AppError(404, "recipe_not_found", "Craft recipe not found");
  }
  const recipe: Record<KeyGrade, number> = {
    [KeyGrade.Gray]: rawRecipe[KeyGrade.Gray] ?? 0,
    [KeyGrade.Color]: rawRecipe[KeyGrade.Color] ?? 0,
    [KeyGrade.Engraved]: rawRecipe[KeyGrade.Engraved] ?? 0,
    [KeyGrade.Gold]: rawRecipe[KeyGrade.Gold] ?? 0,
  };
  return deps.prisma.$transaction(async (tx) => {
    const seedCase = await tx.case.findUnique({ where: { id: body.caseId } });
    if (seedCase === null) {
      throw new AppError(404, "recipe_not_found", "Craft recipe not found");
    }
    const user = await lockUser(tx, userId);
    const next: Record<KeyGrade, number> = {
      [KeyGrade.Gray]: user.keysGray,
      [KeyGrade.Color]: user.keysColor,
      [KeyGrade.Engraved]: user.keysEngraved,
      [KeyGrade.Gold]: user.keysGold,
    };
    for (const grade of KEY_GRADE_VALUES) {
      const required = recipe[grade] ?? 0;
      if (required > 0 && keyBalance(user, grade) < required) {
        throw new AppError(400, "insufficient_keys", "Insufficient keys");
      }
      next[grade] -= required;
    }
    const data: Prisma.UserUpdateInput = {
      keysGray: next[KeyGrade.Gray],
      keysColor: next[KeyGrade.Color],
      keysEngraved: next[KeyGrade.Engraved],
      keysGold: next[KeyGrade.Gold],
    };
    await tx.user.update({ where: { id: userId }, data });
    for (const grade of KEY_GRADE_VALUES) {
      const required = recipe[grade] ?? 0;
      if (required > 0) {
        await tx.keyLedger.create({
          data: {
            userId,
            grade: KEY_GRADE_MAP[grade],
            delta: -required,
            reason: "craft_case_ticket",
            balanceAfter: next[grade],
          },
        });
      }
    }
    const expiresAt = new Date(Date.now() + TICKET_TTL_MS);
    const ticket = await tx.caseTicket.create({
      data: {
        userId,
        caseId: body.caseId,
        source: "craft_keys",
        expiresAt,
      },
    });
    return {
      ticketId: ticket.id,
      caseId: body.caseId,
      expiresAt: expiresAt.toISOString(),
    };
  }, TRANSACTION_OPTIONS);
}
