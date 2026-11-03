import type {
  Prisma,
  User,
  UserInventory,
  VendingEvent,
} from "@prisma/client";
import { AppError } from "./errors.js";

export async function lockUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<User> {
  const rows = await tx.$queryRaw<User[]>`
    SELECT * FROM "User" WHERE "id" = ${userId} FOR UPDATE
  `;
  const user = rows[0];
  if (user === undefined) {
    throw new AppError(404, "not_found", "User not found");
  }
  return user;
}

export async function lockInventory(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<UserInventory | null> {
  const rows = await tx.$queryRaw<UserInventory[]>`
    SELECT * FROM "UserInventory" WHERE "id"::text = ${inventoryId} FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function lockVendingEvent(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<VendingEvent | null> {
  const rows = await tx.$queryRaw<VendingEvent[]>`
    SELECT * FROM "VendingEvent" WHERE "id"::text = ${eventId} FOR UPDATE
  `;
  return rows[0] ?? null;
}
