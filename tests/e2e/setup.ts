import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DB_NAME, testDatabaseUrl } from "../helpers/db";
import { semillaE2E } from "./seed";

// Recrea la base de prueba y la siembra antes de la corrida. El webServer
// (next dev en 3100) no toca la base hasta el primer request, así que aunque
// Playwright lo levante antes que este globalSetup no hay problema de orden.
export default async function globalSetup(): Promise<void> {
  const url = testDatabaseUrl();
  const adminUrl = url.replace(/\/[^/]*$/, "/postgres");

  const pg = new Client({ connectionString: adminUrl });
  pg.on("error", () => {
    /* noop: evita crashes por conexiones caídas */
  });
  await pg.connect();
  try {
    await pg.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE);`);
    await pg.query(`CREATE DATABASE "${TEST_DB_NAME}";`);
  } finally {
    await pg.end();
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });

  await semillaE2E();
}