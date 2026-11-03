import type { FastifyInstance } from "fastify";
import type { User } from "@prisma/client";
import type { AppDeps } from "../types.js";

export function registerRecalcBpm(
  app: FastifyInstance,
  deps: AppDeps,
): void {
  app.addHook("preHandler", async (request) => {
    const current = request.authUser;
    if (current === null) {
      return;
    }
    const rows = await deps.prisma.$queryRaw<User[]>`
      UPDATE "User"
      SET
        "bpmCurrent" = GREATEST(
          60,
          "bpmCurrent" - GREATEST(
            0,
            FLOOR(
              EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - "bpmUpdatedAt")) / 3600
            )::int
          ) * 2
        ),
        "bpmUpdatedAt" = (NOW() AT TIME ZONE 'UTC'),
        "lastSeenAt" = (NOW() AT TIME ZONE 'UTC'),
        "tachycardiaActive" = CASE
          WHEN "tachycardiaActive"
            AND (
              "tachycardiaUntil" IS NULL
              OR "tachycardiaUntil" <= (NOW() AT TIME ZONE 'UTC')
            )
          THEN false
          ELSE "tachycardiaActive"
        END,
        "tachycardiaUntil" = CASE
          WHEN "tachycardiaActive"
            AND (
              "tachycardiaUntil" IS NULL
              OR "tachycardiaUntil" <= (NOW() AT TIME ZONE 'UTC')
            )
          THEN NULL
          ELSE "tachycardiaUntil"
        END
      WHERE "id" = ${current.id}
      RETURNING *
    `;
    const updated = rows[0];
    if (updated !== undefined) {
      request.authUser = updated;
    }
  });
}
