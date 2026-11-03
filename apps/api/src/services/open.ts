import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { VendingEventType } from "@enerkrut/shared";
import type { CaseId, OpenCaseResponse } from "@enerkrut/shared";
import type { AppDeps } from "../types.js";
import { AppError } from "../lib/errors.js";
import { lockUser } from "../lib/locks.js";
import { rollDrop } from "./roll.js";
import {
  maybeTriggerTachycardia,
  normalizeTachycardia,
  tachycardiaPayload,
} from "./tachycardia.js";

const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

function userUpdateData(
  charge: { balanceRub: bigint } | null,
  tachycardia: { active: boolean; until: Date | null; changed: boolean },
): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};
  if (charge !== null) {
    data.balanceRub = charge.balanceRub;
  }
  if (tachycardia.changed) {
    data.tachycardiaActive = tachycardia.active;
    data.tachycardiaUntil = tachycardia.until;
  }
  return data;
}

async function consumeTicket(
  tx: Prisma.TransactionClient,
  userId: string,
  caseId: string,
  now: Date,
): Promise<void> {
  const ticket = await tx.caseTicket.findFirst({
    where: {
      userId,
      caseId,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "asc" },
  });
  if (ticket === null) {
    throw new AppError(404, "ticket_not_found", "Ticket not found");
  }
  const consumed = await tx.caseTicket.updateMany({
    where: { id: ticket.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) {
    throw new AppError(404, "ticket_not_found", "Ticket not found");
  }
}

async function createStuckEvent(
  deps: AppDeps,
  userId: string,
  caseId: string,
  priceRub: number,
  tachycardia: { active: boolean; until: Date | null },
): Promise<OpenCaseResponse> {
  const eventId = randomUUID();
  await deps.prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    if (user.balanceRub < BigInt(priceRub)) {
      throw new AppError(400, "insufficient_balance", "Insufficient balance");
    }
    const balanceAfter = user.balanceRub - BigInt(priceRub);
    await tx.user.update({
      where: { id: userId },
      data: { balanceRub: balanceAfter },
    });
    await tx.rubLedger.create({
      data: {
        userId,
        deltaRub: -BigInt(priceRub),
        reason: "case_open",
        refId: eventId,
        balanceAfter,
      },
    });
    await tx.vendingEvent.create({
      data: {
        id: eventId,
        userId,
        caseId,
        eventType: "stuck_can_hit",
        outcome: {},
      },
    });
  }, TRANSACTION_OPTIONS);
  return {
    status: "pending_vending",
    eventId,
    eventType: VendingEventType.StuckCanHit,
    caseId: caseId as CaseId,
    priceRub,
    tachycardia: tachycardiaPayload(tachycardia),
  };
}

async function createMachineAteEvent(
  deps: AppDeps,
  userId: string,
  caseId: string,
  priceRub: number,
  tachycardia: { active: boolean; until: Date | null },
): Promise<OpenCaseResponse> {
  const eventId = randomUUID();
  await deps.prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    const total = BigInt(priceRub) * 2n;
    if (user.balanceRub < total) {
      throw new AppError(400, "insufficient_balance", "Insufficient balance");
    }
    const afterOpen = user.balanceRub - BigInt(priceRub);
    const afterAte = afterOpen - BigInt(priceRub);
    await tx.user.update({
      where: { id: userId },
      data: { balanceRub: afterAte },
    });
    await tx.rubLedger.create({
      data: {
        userId,
        deltaRub: -BigInt(priceRub),
        reason: "case_open",
        refId: eventId,
        balanceAfter: afterOpen,
      },
    });
    await tx.rubLedger.create({
      data: {
        userId,
        deltaRub: -BigInt(priceRub),
        reason: "vending_ate",
        refId: eventId,
        balanceAfter: afterAte,
      },
    });
    await tx.vendingEvent.create({
      data: {
        id: eventId,
        userId,
        caseId,
        eventType: "machine_ate_100",
        outcome: {},
      },
    });
  }, TRANSACTION_OPTIONS);
  return {
    status: "machine_ate",
    eventId,
    eventType: VendingEventType.MachineAte100,
    caseId: caseId as CaseId,
    priceRub,
    tachycardia: tachycardiaPayload(tachycardia),
  };
}

async function performOpen(
  deps: AppDeps,
  userId: string,
  caseId: string,
  priceRub: number,
  useTicket: boolean,
): Promise<OpenCaseResponse> {
  return deps.prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    const now = new Date();
    if (useTicket) {
      await consumeTicket(tx, userId, caseId, now);
    } else if (user.balanceRub < BigInt(priceRub)) {
      throw new AppError(400, "insufficient_balance", "Insufficient balance");
    }
    const tachycardia = maybeTriggerTachycardia(user, deps.rng, now);
    const drop = await rollDrop(tx, deps, {
      userId,
      caseId,
      bpm: user.bpmCurrent,
      now,
    });
    let charge: { balanceRub: bigint } | null = null;
    if (!useTicket) {
      const balanceAfter = user.balanceRub - BigInt(priceRub);
      charge = { balanceRub: balanceAfter };
      await tx.rubLedger.create({
        data: {
          userId,
          deltaRub: -BigInt(priceRub),
          reason: "case_open",
          refId: drop.dropId,
          balanceAfter,
        },
      });
    }
    const data = userUpdateData(charge, tachycardia);
    if (Object.keys(data).length > 0) {
      await tx.user.update({ where: { id: userId }, data });
    }
    return {
      status: "opened",
      dropId: drop.dropId,
      item: drop.item,
      servedPriceRub: drop.servedPriceRub,
      tachycardia: tachycardiaPayload(tachycardia),
    };
  }, TRANSACTION_OPTIONS);
}

export async function openCase(
  deps: AppDeps,
  userId: string,
  caseId: string,
  useTicket: boolean,
): Promise<OpenCaseResponse> {
  const seedCase = await deps.prisma.case.findUnique({ where: { id: caseId } });
  if (seedCase === null || !seedCase.isActive) {
    throw new AppError(404, "case_not_found", "Case not found");
  }
  const currentUser = await deps.prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  if (currentUser.bpmCurrent < seedCase.minBpmRequired) {
    throw new AppError(403, "bpm_too_low", "BPM is too low for this case");
  }
  const now = new Date();
  const normalized = normalizeTachycardia(currentUser, now);
  if (!useTicket && seedCase.hasVendingMachine) {
    const trigger = deps.rng.int(0, 100);
    if (trigger < 8) {
      const kind = deps.rng.int(0, 100);
      if (kind < 75) {
        return createStuckEvent(
          deps,
          userId,
          caseId,
          seedCase.priceRub,
          normalized,
        );
      }
      return createMachineAteEvent(
        deps,
        userId,
        caseId,
        seedCase.priceRub,
        normalized,
      );
    }
  }
  return performOpen(deps, userId, caseId, seedCase.priceRub, useTicket);
}
