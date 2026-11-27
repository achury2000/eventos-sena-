import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN,
  DOC_AUTO,
  loginComo,
  OPERADOR,
  prismaE2E,
} from "./soporte";

// La suite corre contra el build de producción de `webServer`, que es el único
// entorno donde se registra el service worker (design.md, D2). Cada test recibe
// un contexto nuevo y, por tanto, un service worker limpio.

async function esperarServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registros = await navigator.serviceWorker.getRegistrations();
    return registros.length > 0;
  });

  await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.ready;
    if (!registro.active) {
      throw new Error("El service worker no llegó a activarse.");
    }
  });

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

async function esperarCopiaDocumento(page: Page, ruta: string): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(async (rutaBuscada) => {
          const nombres = await caches.keys();
          for (const nombre of nombres) {
            if (!nombre.startsWith("pwa-docs-")) continue;
            const cache = await caches.open(nombre);
            const llaves = await cache.keys();
            if (llaves.some((llave) => new URL(llave.url).pathname === rutaBuscada)) {
              return true;
            }
          }
          return false;
        }, ruta),
      { timeout: 15_000 }
    )
    .toBe(true);
}

async function contarCaches(page: Page, prefijo: string): Promise<number> {
  return page.evaluate(async (prefijoBuscado) => {
    const nombres = await caches.keys();
    return nombres.filter((nombre) => nombre.startsWith(prefijoBuscado)).length;
  }, prefijo);
}

function tamanoPng(bytes: Buffer): { ancho: number; alto: number } {
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
}

test.describe("pwa", () => {
  test("el manifest y los iconos declaran la instalación", async ({
    request,
  }) => {
    const respuesta = await request.get("/manifest.webmanifest");
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = await respuesta.json();
    expect(manifest.name).toBe("Eventos SENA");
    expect(manifest.short_name).toBe("Eventos SENA");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("es");
    expect(manifest.theme_color).toBe("#25A200");
    expect(manifest.background_color).toBe("#25A200");

    const iconos = manifest.icons as Array<{
      src: string;
      sizes: string;
      type: string;
      purpose?: string;
    }>;
    expect(iconos).toHaveLength(3);
    expect(iconos.some((icono) => icono.purpose === "maskable")).toBe(true);

    for (const icono of iconos) {
      const imagen = await request.get(icono.src);
      expect(imagen.status()).toBe(200);
      expect(imagen.headers()["content-type"]).toContain("image/png");

      const [anchoEsperado, altoEsperado] = icono.sizes.split("x").map(Number);
      const tamano = tamanoPng(await imagen.body());
      expect(tamano).toEqual({
        ancho: anchoEsperado,
        alto: altoEsperado,
      });
    }

    const apple = await request.get("/icons/apple-touch-icon.png");
    expect(apple.status()).toBe(200);
    expect(apple.headers()["content-type"]).toContain("image/png");
  });

  test("el service worker se registra y controla la página", async ({
    page,
  }) => {
    await page.goto("/login");
    await esperarServiceWorker(page);

    const estado = await page.evaluate(async () => {
      const registro = await navigator.serviceWorker.ready;
      return {
        alcance: new URL(registro.scope).pathname,
        activo: registro.active?.state ?? null,
        controlada: navigator.serviceWorker.controller !== null,
      };
    });

    expect(estado.alcance).toBe("/");
    expect(estado.activo).toBe("activated");
    expect(estado.controlada).toBe(true);
  });

  test("el botón usa el prompt capturado antes de hidratar", async ({
    page,
  }) => {
    // Chrome puede disparar `beforeinstallprompt` antes de que React monte el
    // botón. El script inline del layout lo deja en `window`; aquí se simula
    // ese estado inicial para comprobar que el componente lo recupera.
    await page.addInitScript((clave) => {
      const evento = new Event("beforeinstallprompt", {
        cancelable: true,
      }) as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: "accepted"; platform: string }>;
      };
      evento.prompt = async () => {
        (window as Window & { __promptLlamado?: boolean }).__promptLlamado =
          true;
      };
      evento.userChoice = Promise.resolve({
        outcome: "accepted",
        platform: "web",
      });
      (window as unknown as Record<string, unknown>)[clave] = evento;
    }, "__pwaInstallPrompt");

    await page.goto("/login");

    const boton = page.getByRole("button", {
      name: "Instalar la aplicación",
    });
    await expect(boton).toBeVisible();
    await boton.click();

    const dialogo = page.getByRole("dialog", {
      name: "Instala Eventos SENA",
    });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Instalar app" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __promptLlamado?: boolean }).__promptLlamado
        )
      )
      .toBe(true);
  });

  test("sin prompt nativo, Chrome muestra instrucciones manuales", async ({
    page,
  }) => {
    // Se ignoran los listeners de `beforeinstallprompt` para simular de forma
    // determinista la visita en la que Chrome todavía no ofrece el prompt. El
    // diálogo debe mostrar instrucciones, no un botón inerte.
    await page.addInitScript(() => {
      const agregarOriginal = window.addEventListener.bind(window);
      window.addEventListener = ((
        tipo: string,
        oyente: EventListenerOrEventListenerObject,
        opciones?: boolean | AddEventListenerOptions
      ) => {
        if (tipo === "beforeinstallprompt") return;
        return agregarOriginal(tipo, oyente, opciones);
      }) as typeof window.addEventListener;
    });

    await page.goto("/login");

    const boton = page.getByRole("button", {
      name: "Instalar la aplicación",
    });
    await expect(boton).toBeVisible();
    await boton.click();

    const dialogo = page.getByRole("dialog", {
      name: "Instala Eventos SENA",
    });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(/barra de direcciones|menú del navegador/);
    await expect(
      dialogo.getByRole("button", { name: "Instalar app" })
    ).toHaveCount(0);
    await expect(
      dialogo.getByRole("button", { name: /Ahora no/ })
    ).toBeVisible();
  });

  test("cerrar el diálogo no oculta el botón", async ({ page }) => {
    await page.goto("/login");

    const boton = page.getByRole("button", {
      name: "Instalar la aplicación",
    });
    await expect(boton).toBeVisible();
    await boton.click();

    const dialogo = page.getByRole("dialog", {
      name: "Instala Eventos SENA",
    });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: /Ahora no/ }).click();
    await expect(dialogo).toBeHidden();
    await expect(boton).toBeVisible();

    await page.reload();
    await expect(boton).toBeVisible();
  });

  test("el botón aparece en el panel admin y del operador", async ({
    page,
  }) => {
    await page.goto("/login");
    await loginComo(page, ADMIN);

    const boton = page.getByRole("button", {
      name: "Instalar la aplicación",
    });
    await expect(boton).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(/\/login\/?$/);

    await loginComo(page, OPERADOR);
    await expect(boton).toBeVisible();
  });

  test("el botón se oculta si la app ya está instalada", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "standalone", {
        configurable: true,
        value: true,
      });
    });

    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Instalar la aplicación" })
    ).toHaveCount(0);
  });

  test("al completar la instalación el botón desaparece", async ({ page }) => {
    await page.goto("/login");

    const boton = page.getByRole("button", {
      name: "Instalar la aplicación",
    });
    await expect(boton).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    await expect(boton).toHaveCount(0);
  });

  test("una página visitada se abre sin conexión con aviso de copia guardada", async ({
    page,
    context,
  }) => {
    // Se usa una página pública que no limpia la caché al montarse (el login
    // sí lo hace, por privacidad). Es el caso real de consulta en el sitio del
    // evento: abrir de nuevo un checkpoint ya visitado.
    const prisma = prismaE2E();
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { activo: true },
      select: { codigoQr: true },
    });
    expect(checkpoint).not.toBeNull();
    await prisma.$disconnect();

    await page.goto("/login");
    await esperarServiceWorker(page);

    const urlCheckpoint = `/checkpoint/${checkpoint!.codigoQr}`;
    await page.goto(urlCheckpoint);
    await esperarCopiaDocumento(page, urlCheckpoint);

    await context.setOffline(true);
    await expect
      .poll(() => page.evaluate(() => navigator.onLine))
      .toBe(false);

    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Control de ingreso" })
    ).toBeVisible();
    const aviso = page.getByRole("status");
    await expect(aviso).toContainText("Sin conexión");
    await expect(aviso).toContainText("copia guardada");

    await context.setOffline(false);
  });

  test("una ruta nunca visitada cae en la página offline", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await esperarServiceWorker(page);

    await context.setOffline(true);
    await expect
      .poll(() => page.evaluate(() => navigator.onLine))
      .toBe(false);

    await page.goto("/checkpoint/ruta-que-nunca-existio");

    await expect(
      page.getByRole("heading", { name: "Sin conexión" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Para inscribirte o registrar asistencia necesitas conexión."
      )
    ).toBeVisible();

    await context.setOffline(false);
  });

  test("sin conexión una escritura se bloquea y no persiste", async ({
    page,
    context,
  }) => {
    const prisma = prismaE2E();
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { activo: true },
      select: { id: true, codigoQr: true },
    });
    expect(checkpoint).not.toBeNull();

    const antes = await prisma.registroControl.count({
      where: {
        checkpointId: checkpoint!.id,
        asistente: { documento: DOC_AUTO },
      },
    });
    await prisma.$disconnect();

    await page.goto("/login");
    await esperarServiceWorker(page);

    const urlCheckpoint = `/checkpoint/${checkpoint!.codigoQr}`;
    await page.goto(urlCheckpoint);
    await esperarCopiaDocumento(page, urlCheckpoint);

    await context.setOffline(true);
    await expect
      .poll(() => page.evaluate(() => navigator.onLine))
      .toBe(false);

    await page.getByLabel("Documento de identidad").fill(DOC_AUTO);
    await page.getByRole("button", { name: "Registrar asistencia" }).click();

    await expect(page.getByRole("status")).toContainText(
      "No se guardó: necesitas conexión para enviar."
    );
    await expect(page.getByText("Registro exitoso.")).toHaveCount(0);

    const prismaFinal = prismaE2E();
    const despues = await prismaFinal.registroControl.count({
      where: {
        checkpointId: checkpoint!.id,
        asistente: { documento: DOC_AUTO },
      },
    });
    await prismaFinal.$disconnect();
    expect(despues).toBe(antes);

    await context.setOffline(false);
  });

  test("cerrar sesión borra las copias de documentos y conserva los assets", async ({
    page,
  }) => {
    await page.goto("/login");
    await esperarServiceWorker(page);

    await loginComo(page, ADMIN);
    // Tras un POST con redirección el navegador sigue el 303 por dentro y el
    // service worker no ve la navegación; una recarga (o navegación normal)
    // deja la copia del panel.
    await page.reload();
    await esperarCopiaDocumento(page, "/admin");
    expect(await contarCaches(page, "pwa-docs-")).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(/\/login\/?$/);

    await expect
      .poll(() => contarCaches(page, "pwa-docs-"), { timeout: 15_000 })
      .toBe(0);
    expect(await contarCaches(page, "pwa-assets-")).toBeGreaterThan(0);
  });
});

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 " +
  "Mobile/15E148 Safari/604.1";

const FIREFOX_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) " +
  "Gecko/20100101 Firefox/152.0";

test.describe("pwa en iOS", () => {
  test.use({ userAgent: IPHONE_UA });

  test("muestra las instrucciones de Compartir", async ({ page }) => {
    // En iOS no existe prompt nativo; se ignoran los listeners para que la
    // prueba no dependa de que el motor de Chromium dispare uno simulado.
    await page.addInitScript(() => {
      const agregarOriginal = window.addEventListener.bind(window);
      window.addEventListener = ((
        tipo: string,
        oyente: EventListenerOrEventListenerObject,
        opciones?: boolean | AddEventListenerOptions
      ) => {
        if (tipo === "beforeinstallprompt") return;
        return agregarOriginal(tipo, oyente, opciones);
      }) as typeof window.addEventListener;
    });

    await page.goto("/login");

    const boton = page.getByRole("button", {
      name: "Instalar la aplicación",
    });
    await expect(boton).toBeVisible();
    await boton.click();

    const dialogo = page.getByRole("dialog", {
      name: "Instala Eventos SENA",
    });
    await expect(dialogo).toContainText(/Compartir/);
    await expect(
      dialogo.getByRole("button", { name: "Instalar app" })
    ).toHaveCount(0);
  });
});

test.describe("pwa sin instalación", () => {
  test.use({ userAgent: FIREFOX_UA });

  test("no muestra el botón", async ({ page }) => {
    await page.addInitScript(() => {
      const agregarOriginal = window.addEventListener.bind(window);
      window.addEventListener = ((
        tipo: string,
        oyente: EventListenerOrEventListenerObject,
        opciones?: boolean | AddEventListenerOptions
      ) => {
        if (tipo === "beforeinstallprompt") return;
        return agregarOriginal(tipo, oyente, opciones);
      }) as typeof window.addEventListener;
    });

    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Instalar la aplicación" })
    ).toHaveCount(0);
  });
});
