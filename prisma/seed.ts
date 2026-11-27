// Seed de datos iniciales para desarrollo local.
// Ejecutar con: npm run db:seed
// Es idempotente: se puede correr varias veces sin duplicar datos.

import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient, RolUsuario, TipoAfiliacion } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

// Centro de formación de las cuentas de prueba: texto libre, sin catálogo.
const CENTRO_SEMILLA = "Centro Nacional de Comercio";

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@sena.gov.co";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const adminDocumento = process.env.SEED_ADMIN_DOCUMENTO ?? "10000001";

  console.log("==> Sembrando administrador...");
  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nombreCompleto: "Administrador del Sistema",
      documento: adminDocumento,
      email: adminEmail,
      passwordHash: await hash(adminPassword, 10),
      rol: RolUsuario.ADMINISTRADOR,
      tipoAfiliacion: TipoAfiliacion.SENA,
      centroFormacion: CENTRO_SEMILLA,
    },
  });

  const operadorEmail = process.env.SEED_OPERADOR_EMAIL ?? "operador@sena.gov.co";
  const operadorPassword = process.env.SEED_OPERADOR_PASSWORD ?? "operador123";
  const operadorDocumento = process.env.SEED_OPERADOR_DOCUMENTO ?? "20000001";

  console.log("==> Sembrando operador de prueba...");
  await prisma.usuario.upsert({
    where: { email: operadorEmail },
    update: {},
    create: {
      nombreCompleto: "Operador de Prueba",
      documento: operadorDocumento,
      email: operadorEmail,
      passwordHash: await hash(operadorPassword, 10),
      rol: RolUsuario.OPERADOR,
      tipoAfiliacion: TipoAfiliacion.SENA,
      centroFormacion: CENTRO_SEMILLA,
    },
  });

  console.log(`==> Listo.
    Admin:     ${adminEmail} / ${adminPassword}
    Operador:  ${operadorEmail} / ${operadorPassword}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });