import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/domain/src/**/*.test.ts", "apps/session/src/**/*.test.ts"],
    exclude: ["apps/web/e2e/**", "node_modules/**", "dist/**"]
  }
});
