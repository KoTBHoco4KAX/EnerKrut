import type { Prisma } from "@prisma/client";
import type {
  LambardSellBody,
  LambardSellResponse,
} from "@enerkrut/shared";
import {
  KeyGrade,
  LAMBARD_MIN_BALANCE_RUB,
  LAMBARD_RATES,
} from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { AppError } from "../lib/errors.js";
import { lockUser } from "../lib/locks.js";
import { KEY_GRADE_MAP } from "../lib/prisma-maps.js";

const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

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

export async function sellKeysToLambard(
  deps: AppDeps,
  userId: string,
  body: LambardSellBody,
): Promise<LambardSellResponse> {
  return deps.prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    if (Number(user.balanceRub) >= LAMBARD_MIN_BALANCE_RUB) {
      throw new AppError(409, "lambard_blocked", "Lambard is blocked");
    }
    const current = keyBalance(user, body.grade);
    if (current < body.count) {
      throw new AppError(400, "insufficient_keys", "Insufficient keys");
    }
    const balanceAfterKeys = current - body.count;
    const rubsAdded = body.count * LAMBARD_RATES[body.grade];
    const balanceAfterRub = user.balanceRub + BigInt(rubsAdded);
    const data: Prisma.UserUpdateInput = {
      keysGray: user.keysGray,
      keysColor: user.keysColor,
      keysEngraved: user.keysEngraved,
      keysGold: user.keysGold,
      balanceRub: balanceAfterRub,
    };
    switch (body.grade) {
      case KeyGrade.Gray:
        data.keysGray = balanceAfterKeys;
        break;
      case KeyGrade.Color:
        data.keysColor = balanceAfterKeys;
        break;
      case KeyGrade.Engraved:
        data.keysEngraved = balanceAfterKeys;
        break;
      case KeyGrade.Gold:
        data.keysGold = balanceAfterKeys;
        break;
    }
    await tx.user.update({ where: { id: userId }, data });
    await tx.keyLedger.create({
      data: {
        userId,
        grade: KEY_GRADE_MAP[body.grade],
        delta: -body.count,
        reason: "lambard_sell",
        balanceAfter: balanceAfterKeys,
      },
    });
    await tx.rubLedger.create({
      data: {
        userId,
        deltaRub: BigInt(rubsAdded),
        reason: "lambard_sell",
        balanceAfter: balanceAfterRub,
      },
    });
    return {
      rubsAdded,
      balanceRub: Number(balanceAfterRub),
      keyBalanceAfter: balanceAfterKeys,
    };
  }, TRANSACTION_OPTIONS);
}
