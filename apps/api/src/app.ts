import "dotenv/config";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "./lib/errors.js";
import { cryptoRandomSource } from "./lib/random.js";
import type { RandomSource } from "./lib/random.js";
import { registerTelegramAuth } from "./plugins/telegram-auth.js";
import { registerRecalcBpm } from "./plugins/recalc-bpm.js";
import { registerRoutes, registerCasesRoute } from "./routes.js";
import type { AppDeps } from "./types.js";

export interface AppOptions {
  prisma?: PrismaClient;
  rng?: RandomSource;
  botToken?: string;
  logger?: boolean;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  const ownsPrisma = options.prisma === undefined;
  const prisma = options.prisma ?? new PrismaClient();
  const configuredBotToken = options.botToken ?? process.env.BOT_TOKEN;
  const botToken =
    configuredBotToken === undefined || configuredBotToken.length === 0
      ? "TEST_TOKEN"
      : configuredBotToken;
  const deps: AppDeps = {
    prisma,
    rng: options.rng ?? cryptoRandomSource,
    botToken,
  };

  app.addHook("onClose", async () => {
    if (ownsPrisma) {
      await prisma.$disconnect();
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send({ code: error.code, message: error.message });
    }
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      return reply.code(400).send({ code: "validation_error", message });
    }
    const statusCode =
      typeof error.statusCode === "number" && error.statusCode >= 400
        ? error.statusCode
        : 500;
    if (statusCode >= 500) {
      request.log.error(error);
      return reply
        .code(500)
        .send({ code: "internal_error", message: "Internal server error" });
    }
    return reply.code(statusCode).send({
      code: "bad_request",
      message: error.message,
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ code: "not_found", message: "Route not found" }),
  );

  registerTelegramAuth(app, deps);
  registerRecalcBpm(app, deps);
  void app.register(cors, { origin: true });
  void app.register(async (instance) => {
    await instance.register(rateLimit, { global: false });
    registerCasesRoute(instance, deps);
  });
  registerRoutes(app, deps);

  return app;
}
