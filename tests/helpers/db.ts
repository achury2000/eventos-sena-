import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

export const TEST_DB_NAME = "bienestar_sena_test";

export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;
  const dev = process.env.DATABASE_URL;
  if (!dev) {
    throw new Error("Falta DATABASE_URL o TEST_DATABASE_URL en el entorno");
  }
  return dev.replace(/\/[^/]*$/, `/${TEST_DB_NAME}`);
}

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
  });
}