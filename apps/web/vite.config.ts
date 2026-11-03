import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    target: "es2020",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.spec.ts", "test/**/*.spec.tsx"],
    css: false,
    root: fileURLToPath(new URL(".", import.meta.url)),
    testTimeout: 15_000,
  },
});
