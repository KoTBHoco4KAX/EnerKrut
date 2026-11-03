import type { Prisma } from "@prisma/client";
import type { DrinkDropResponse, SellDropResponse } from "@enerkrut/shared";
import { KeyGrade } from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { AppError } from "../lib/errors.js";
import { lockInventory, lockUser } from "../lib/locks.js";
import { KEY_GRADE_MAP, RARITY_TO_SHARED } from "../lib/prisma-maps.js";
import { resolveDrinkKeys } from "../engine/keys.js";

const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

export async function sellDrop(
  deps: AppDeps,
  userId: string,
  dropId: string,
): Promise<SellDropResponse> {
  return deps.prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    const inventory = await lockInventory(tx, dropId);
    if (inventory === null || inventory.userId !== userId) {
      throw new AppError(404, "not_found", "Drop not found");
    }
    if (inventory.decision !== null || inventory.state !== "pending") {
      throw new AppError(409, "already_decided", "Drop already decided");
    }
    const now = new Date();
    const tachycardiaActive =
      user.tachycardiaActive &&
      user.tachycardiaUntil !== null &&
      user.tachycardiaUntil.getTime() > now.getTime();
    const priceRub = inventory.servedPriceRub * (tachycardiaActive ? 2 : 1);
    const balanceAfter = user.balanceRub + BigInt(priceRub);
    const bpmCurrent = Math.min(200, user.bpmCurrent + 2);
    await tx.userInventory.update({
      where: { id: dropId },
      data: {
        decision: "sold",
        state: "sold",
        decisionAt: now,
      },
    });
    await tx.dropHistory.updateMany({
      where: { id: dropId },
      data: { decision: "sold", decisionAt: now },
    });
    await tx.rubLedger.create({
      data: {
        userId,
        deltaRub: BigInt(priceRub),
        reason: "sell_can",
        refId: dropId,
        balanceAfter,
      },
    });
    const data: Prisma.UserUpdateInput = {
      balanceRub: balanceAfter,
      bpmCurrent,
      bpmUpdatedAt: now,
    };
    if (tachycardiaActive || user.tachycardiaActive) {
      data.tachycardiaActive = false;
      data.tachycardiaUntil = null;
    }
    await tx.user.update({ where: { id: userId }, data });
    return {
      dropId,
      priceRub,
      balanceRub: Number(balanceAfter),
    };
  }, TRANSACTION_OPTIONS);
}

function keyBalance(user: {
  keysGray: number;
  keysColor: number;
  keysEngraved: number;
  keysGold: number;
}, grade: KeyGrade): number {
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
}

export async function drinkDrop(
  deps: AppDeps,
  userId: string,
  dropId: string,
): Promise<DrinkDropResponse> {
  return deps.prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    const inventory = await lockInventory(tx, dropId);
    if (inventory === null || inventory.userId !== userId) {
      throw new AppError(404, "not_found", "Drop not found");
    }
    if (inventory.decision !== null || inventory.state !== "pending") {
      throw new AppError(409, "already_decided", "Drop already decided");
    }
    const item = await tx.itemsCatalog.findUniqueOrThrow({
      where: { id: inventory.itemId },
    });
    const result = resolveDrinkKeys(
      RARITY_TO_SHARED[item.rarity],
      item.isAlcoholic,
    );
    const balanceAfter = keyBalance(user, result.grade) + result.count;
    const now = new Date();
    const bpmCurrent = Math.min(200, user.bpmCurrent + 5);
    const data: Prisma.UserUpdateInput = {
      bpmCurrent,
      bpmUpdatedAt: now,
    };
    switch (result.grade) {
      case KeyGrade.Gray:
        data.keysGray = balanceAfter;
        break;
      case KeyGrade.Color:
        data.keysColor = balanceAfter;
        break;
      case KeyGrade.Engraved:
        data.keysEngraved = balanceAfter;
        break;
      case KeyGrade.Gold:
        data.keysGold = balanceAfter;
        break;
    }
    await tx.user.update({ where: { id: userId }, data });
    await tx.userInventory.update({
      where: { id: dropId },
      data: {
        decision: "drank",
        state: "drank",
        decisionAt: now,
      },
    });
    await tx.dropHistory.updateMany({
      where: { id: dropId },
      data: { decision: "drank", decisionAt: now },
    });
    await tx.keyLedger.create({
      data: {
        userId,
        grade: KEY_GRADE_MAP[result.grade],
        delta: result.count,
        reason: "drink_can",
        sourceItem: item.id,
        refId: dropId,
        balanceAfter,
      },
    });
    return {
      dropId,
      keyGrade: result.grade,
      keyCount: result.count,
      bpmCurrent,
      keyBalanceAfter: balanceAfter,
    };
  }, TRANSACTION_OPTIONS);
}
