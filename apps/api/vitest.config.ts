import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  test: {
    include: ["tests/**/*.spec.ts", "apps/api/test/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
