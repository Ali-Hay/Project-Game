import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "corepack pnpm dev:session",
      port: 4000,
      reuseExistingServer: false
    },
    {
      command: "corepack pnpm dev:web",
      port: 3000,
      reuseExistingServer: false
    }
  ]
});
