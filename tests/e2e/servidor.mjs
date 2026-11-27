// Prepara el output standalone de Next.js para arrancar el servidor de las
// pruebas e2e. `next build` con `output: "standalone"` no copia `public/` ni
// `_next/static/` dentro de `.next/standalone/`, así que el `server.js` no
// sirve estáticos sin este paso previo (ver playwright.config.ts → webServer).
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const destino = ".next/standalone";

async function copiarSiExiste(origen, destinoArchivo) {
  if (!existsSync(origen)) {
    console.log(`[servidor.mjs] aviso: ${origen} no existe, omitido`);
    return;
  }
  await mkdir(destinoArchivo, { recursive: true });
  await cp(origen, destinoArchivo, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
  console.log(`[servidor.mjs] copiado ${origen} -> ${destinoArchivo}`);
}

await copiarSiExiste("public", `${destino}/public`);
await copiarSiExiste(".next/static", `${destino}/.next/static`);