import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CraftTicketBodySchema,
  DropsQuerySchema,
  InventoryQuerySchema,
  LambardSellBodySchema,
  OpenCaseBodySchema,
} from "@enerkrut/shared";
import type { AppDeps } from "./types.js";
import { AppError } from "./lib/errors.js";
import { openCase } from "./services/open.js";
import { drinkDrop, sellDrop } from "./services/drops.js";
import { hitVending } from "./services/vending.js";
import { sellKeysToLambard } from "./services/lambard.js";
import { craftTicket } from "./services/craft.js";
import { getMe, listDrops, listInventory } from "./services/me.js";

const IdParamsSchema = z.object({ id: z.string().min(1) }).strict();
const EventIdParamsSchema = z.object({ eventId: z.string().min(1) }).strict();

function authUserId(request: {
  authUser: { id: string } | null;
}): string {
  if (request.authUser === null) {
    throw new AppError(401, "unauthorized", "Authentication required");
  }
  return request.authUser.id;
}

export function registerCasesRoute(
  app: FastifyInstance,
  deps: AppDeps,
): void {
  app.get(
    "/api/cases",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async () => {
      const cases = await deps.prisma.case.findMany({
        where: { isActive: true, priceRub: { gt: 0 } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          displayName: true,
          description: true,
          priceRub: true,
          priceStarsAlt: true,
          coverUrl: true,
          order: true,
          minBpmRequired: true,
          hasVendingMachine: true,
        },
      });
      return { cases };
    },
  );
}

export function registerRoutes(
  app: FastifyInstance,
  deps: AppDeps,
): void {
  // Публичный healthcheck: docker healthcheck, nginx и мониторинг.
  app.get("/api/health", async (_request, reply) => {
    try {
      await deps.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "up", uptime: Math.round(process.uptime()) };
    } catch {
      return reply.code(503).send({ status: "degraded", db: "down" });
    }
  });

  app.post("/api/cases/:id/open", async (request) => {
    const userId = authUserId(request);
    const params = IdParamsSchema.parse(request.params);
    const body = OpenCaseBodySchema.parse(request.body ?? {});
    return openCase(deps, userId, params.id, body.useTicket === true);
  });

  app.post("/api/drops/:id/sell", async (request) => {
    const userId = authUserId(request);
    const params = IdParamsSchema.parse(request.params);
    return sellDrop(deps, userId, params.id);
  });

  app.post("/api/drops/:id/drink", async (request) => {
    const userId = authUserId(request);
    const params = IdParamsSchema.parse(request.params);
    return drinkDrop(deps, userId, params.id);
  });

  app.post("/api/vending/:eventId/hit", async (request) => {
    const userId = authUserId(request);
    const params = EventIdParamsSchema.parse(request.params);
    return hitVending(deps, userId, params.eventId);
  });

  app.post("/api/lambard/sell", async (request) => {
    const userId = authUserId(request);
    const body = LambardSellBodySchema.parse(request.body);
    return sellKeysToLambard(deps, userId, body);
  });

  app.post("/api/craft/ticket", async (request, reply) => {
    const userId = authUserId(request);
    const body = CraftTicketBodySchema.parse(request.body);
    const ticket = await craftTicket(deps, userId, body);
    return reply.code(201).send(ticket);
  });

  app.get("/api/me", async (request) => {
    const userId = authUserId(request);
    return getMe(deps, userId);
  });

  app.get("/api/me/inventory", async (request) => {
    const userId = authUserId(request);
    const query = InventoryQuerySchema.parse(request.query);
    return listInventory(deps, userId, query);
  });

  app.get("/api/me/drops", async (request) => {
    const userId = authUserId(request);
    const query = DropsQuerySchema.parse(request.query);
    return listDrops(deps, userId, query);
  });
}
