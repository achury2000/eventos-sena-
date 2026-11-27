import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DB_NAME, testDatabaseUrl } from "../helpers/db";

export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  const adminUrl = url.replace(/\/[^/]*$/, "/postgres");

  const client = new Client({ connectionString: adminUrl });
  client.on("error", () => {
    /* noop: el handler del pool de pg evita crashes por conexiones caídas */
  });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE);`);
    await client.query(`CREATE DATABASE "${TEST_DB_NAME}";`);
  } finally {
    await client.end();
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}