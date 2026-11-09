import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../types.js";
import { AppError } from "../lib/errors.js";

const TelegramUserSchema = z
  .object({
    id: z.number().int().positive(),
    username: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  })
  .passthrough();

const AUTH_MAX_AGE_SECONDS = 86_400;

function unauthorized(message: string): AppError {
  return new AppError(401, "unauthorized", message);
}

function verifyInitData(initData: string, botToken: string): {
  user: z.infer<typeof TelegramUserSchema>;
  authDate: number;
} {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (hash === null || !/^[0-9a-f]{64}$/i.test(hash)) {
    throw unauthorized("Missing init data hash");
  }
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  const computedBuffer = Buffer.from(computed, "hex");
  const hashBuffer = Buffer.from(hash, "hex");
  if (
    computedBuffer.length !== hashBuffer.length ||
    !timingSafeEqual(computedBuffer, hashBuffer)
  ) {
    throw unauthorized("Invalid init data signature");
  }
  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw === null ? Number.NaN : Number(authDateRaw);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    throw unauthorized("Missing auth_date");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > AUTH_MAX_AGE_SECONDS) {
    throw unauthorized("Init data expired");
  }
  const userRaw = params.get("user");
  if (userRaw === null) {
    throw unauthorized("Missing user payload");
  }
  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(userRaw);
  } catch {
    throw unauthorized("Malformed user payload");
  }
  const user = TelegramUserSchema.safeParse(parsedUser);
  if (!user.success) {
    throw unauthorized("Invalid user payload");
  }
  return { user: user.data, authDate };
}

export function registerTelegramAuth(
  app: FastifyInstance,
  deps: AppDeps,
): void {
  app.decorateRequest("authUser", null);
  app.addHook("preHandler", async (request) => {
    if (request.method === "OPTIONS") {
      return;
    }
    const path = request.url.split("?")[0];
    // Публичные маршруты: каталог кейсов и healthcheck для docker/nginx.
    if (
      request.method === "GET" &&
      (path === "/api/cases" || path === "/api/health")
    ) {
      return;
    }
    const header = request.headers["x-telegram-init-data"];
    if (typeof header !== "string" || header.length === 0) {
      throw unauthorized("Missing x-telegram-init-data header");
    }
    const { user } = verifyInitData(header, deps.botToken);
    const telegramId = BigInt(user.id);
    const now = new Date();
    request.authUser = await deps.prisma.user.upsert({
      where: { telegramId },
      update: {
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lastSeenAt: now,
      },
      create: {
        telegramId,
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lastSeenAt: now,
      },
    });
  });
}
