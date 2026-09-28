import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Next's server-only guard throws outside React Server Components; tests run on the server anyway.
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: { environment: "node", testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false },
});
