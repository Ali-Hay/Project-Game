import { buildServer } from "./server";
import { readConfig } from "./config";

async function main() {
  const config = readConfig();
  const { app } = await buildServer();
  await app.listen({
    host: config.SESSION_HOST,
    port: config.SESSION_PORT
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
