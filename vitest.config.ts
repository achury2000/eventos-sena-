import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/setup.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // La BD de test es compartida entre archivos (setup.ts la crea una vez):
    // correrlos en paralelo deja filas ajenas (admins con eventos, FK Restrict)
    // que hacen no deterministas tests con estado global como los de
    // usuarios.test.ts. Serializar el archivo elimina la interferencia.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});