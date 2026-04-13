import { access } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const target = path.resolve(process.cwd(), "packages/domain/dist/index.js");
const timeoutMs = Number(process.env.DOMAIN_WAIT_TIMEOUT_MS ?? 30000);
const intervalMs = Number(process.env.DOMAIN_WAIT_INTERVAL_MS ?? 250);
const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  try {
    await access(target);
    process.exit(0);
  } catch {
    await delay(intervalMs);
  }
}

console.error(`Timed out waiting for ${target}. Start \`corepack pnpm dev:domain\` or run \`corepack pnpm --filter @project-game/domain build\`.`);
process.exit(1);
