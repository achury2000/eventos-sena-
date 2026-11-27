import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestPrisma } from "../helpers/db";

const prisma = createTestPrisma();

describe("Harness de testing (smoke)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("conecta a la base de pruebas y tiene el esquema migrado", async () => {
    const tablas = await prisma.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const nombres = tablas.map((t) => t.tablename);

    expect(nombres).toContain("usuarios");
    expect(nombres).toContain("eventos");
    expect(nombres).toContain("inscripciones");
    expect(nombres).toContain("registros_control");
    expect(nombres).toContain("_prisma_migrations");
  });
});