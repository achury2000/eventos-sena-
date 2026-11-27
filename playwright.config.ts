import { defineConfig, devices } from "@playwright/test";
import { testDatabaseUrl } from "./tests/helpers/db";

// Suite e2e aislada. Levanta el app en producción (next build + standalone)
// sobre el puerto 3100 apuntando a la base de pruebas (bienestar_sena_test),
// nunca a la de desarrollo.
//
// Se usa producción y no `next dev` porque el servidor de desarrollo se
// vuelve inestable bajo la carga de las pruebas (compilación bajo demanda y
// resolución del redirect del proxy), lo que genera cuelgues intermitentes.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: "list",
  globalSetup: "./tests/e2e/setup.ts",
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3100",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Una sola worker: el seed se comparte entre specs y los conteos del panel
  // dependen del estado previo (se calculan por spec en tiempo de ejecución).
  webServer: {
    // El `server.js` de standalone no sirve `public/` ni `_next/static/` sin
    // copiarlos primero (tests/e2e/servidor.mjs); AUTH_URL y NEXT_PUBLIC_URL
    // quedan fijas a este puerto para que los redirects de Auth.js no salten a 3000.
    command: "npm run build && node tests/e2e/servidor.mjs && node .next/standalone/server.js",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...(process.env as Record<string, string>),
      DATABASE_URL: testDatabaseUrl(),
      AUTH_URL: "http://localhost:3100",
      NEXT_PUBLIC_URL: "http://localhost:3100",
      PORT: "3100",
      HOSTNAME: "::",
    },
    stdout: "ignore",
    stderr: "pipe",
  },
});