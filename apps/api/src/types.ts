import type { PrismaClient, User } from "@prisma/client";
import type { RandomSource } from "./lib/random.js";

export interface AppDeps {
  prisma: PrismaClient;
  rng: RandomSource;
  botToken: string;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser: User | null;
  }
}
