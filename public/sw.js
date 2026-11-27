/*
 * Service worker de Bienestar al Aprendiz (design.md, D1, D3, D4, D5 y D10).
 *
 * Reglas que no se negocian:
 *  - Nunca se cachean `/api/*`, peticiones que no sean GET ni prefetch de RSC.
 *  - Solo se guardan respuestas 200 del mismo origen, menores a 2 MB y sin
 *    redirección bajo la URL original.
 *  - El HTML y los payloads RSC vencen a las 24 h y hay un máximo de 40
 *    entradas. Las cachés de documentos se limpian al iniciar y cerrar sesión
 *    (src/lib/pwa/caches.ts).
 *  - La versión de las cachés debe coincidir con PWA_VERSION de
 *    src/lib/pwa/constantes.ts.
 *
 * BAJA / ROLLBACK: si hay que retirar la PWA, publicar este mismo archivo con
 * el cuerpo de abajo y mantenerlo al menos un release. Un service worker ya
 * instalado no desaparece solo porque el archivo deje de existir.
 *
 * self.addEventListener("install", () => self.skipWaiting());
 * self.addEventListener("activate", (evento) => {
 *   evento.waitUntil((async () => {
 *     const nombres = await caches.keys();
 *     await Promise.all(
 *       nombres.filter((n) => n.startsWith("pwa-")).map((n) => caches.delete(n))
 *     );
 *     await self.registration.unregister();
 *     const clientes = await self.clients.matchAll({ type: "window" });
 *     for (const cliente of clientes) cliente.navigate(cliente.url);
 *   })());
 * });
 */

const VERSION = "pwa-2";
const CACHE_DOCS = `pwa-docs-${VERSION}`;
const CACHE_ASSETS = `pwa-assets-${VERSION}`;
const PREFIJO_PWA = "pwa-";
const CABECERA_GUARDADO = "x-pwa-guardado-en";
const TTL_DOCS_MS = 24 * 60 * 60 * 1000;
const MAX_DOCS = 40;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_RED_MS = 3000;
const OFFLINE_URL = "/offline";

let copiaServidaEn = 0;

const PRECACHE = [
  "/manifest.webmanifest",
  "/logo-sena.png",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const assets = await caches.open(CACHE_ASSETS);
      await Promise.all([
        ...PRECACHE.map((url) => precargar(assets, url)),
        precargarOffline(assets),
      ]);
      // La versión nueva no espera a que se cierren las pestañas. No se recarga
      // nada: la pestaña actual conserva su controlador anterior.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter(
            (nombre) =>
              nombre.startsWith(PREFIJO_PWA) &&
              nombre !== CACHE_DOCS &&
              nombre !== CACHE_ASSETS
          )
          .map((nombre) => caches.delete(nombre))
      );
      await self.clients.claim();
    })()
  );
});

async function precargar(cache, url) {
  try {
    const respuesta = await fetch(new Request(url, { cache: "reload" }));
    if (respuesta.ok) await cache.put(url, respuesta);
  } catch {
    // Un asset que no está en este despliegue no debe romper la instalación.
  }
}

async function precargarOffline(cache) {
  try {
    const respuesta = await fetch(
      new Request(OFFLINE_URL, { cache: "reload" })
    );
    if (!respuesta.ok) return;

    const html = await respuesta.clone().text();
    await cache.put(OFFLINE_URL, respuesta);

    // La página /offline se ve con estilos incluso en una primera visita sin
    // red: se precargan sus propios chunks. Si la extracción falla, el HTML ya
    // quedó guardado y los assets se completan en visitas posteriores.
    const urls = extraerAssets(html);
    await Promise.all(urls.map((url) => precargar(cache, url)));
  } catch {
    // Sin copia de /offline queda el respaldo mínimo en memoria.
  }
}

function extraerAssets(html) {
  const encontrados = new Set();
  const regex = /\/_next\/static\/[^\s"'<>\\]+/g;
  let coincidencia;

  while ((coincidencia = regex.exec(html)) !== null) {
    encontrados.add(coincidencia[0].replace(/[),;]+$/, ""));
  }

  return [...encontrados];
}

// ---------------------------------------------------------------------------
// Enrutamiento
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (evento) => {
  const { request } = evento;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // La API (incluida la firma y la autenticación) siempre va a la red.
  if (url.pathname.startsWith("/api/")) return;

  // Los prefetch de RSC son parciales y no representan la página completa.
  if (esPrefetch(request)) return;

  if (request.mode === "navigate") {
    evento.respondWith(manejarDocumento(evento, request, url, false));
    return;
  }

  if (esRsc(request)) {
    evento.respondWith(manejarDocumento(evento, request, url, true));
    return;
  }

  if (esCachePrimero(url.pathname)) {
    evento.respondWith(cachePrimero(evento, request));
    return;
  }

  evento.respondWith(staleWhileRevalidate(evento, request));
});

function esPrefetch(request) {
  const valor = request.headers.get("Next-Router-Prefetch");
  return valor === "1" || valor === "true";
}

function esRsc(request) {
  const valor = request.headers.get("RSC");
  return valor === "1" || valor === "true";
}

function esCachePrimero(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/logo-sena.png"
  );
}

// ---------------------------------------------------------------------------
// Documentos: red primero con timeout, respaldo en caché y /offline
// ---------------------------------------------------------------------------

async function manejarDocumento(evento, request, url, esRsc) {
  const clave = esRsc ? urlRsc(url) : new URL(url.href);

  const red = fetch(request).then((respuesta) => {
    if (respuesta && respuesta.ok) {
      const urlFinal = new URL(respuesta.url || url.href);
      const claveFinal = esRsc ? urlRsc(urlFinal) : new URL(urlFinal.href);
      extenderEvento(evento, guardarDocumento(claveFinal, respuesta.clone()));
    }
    return respuesta;
  });

  try {
    return await conTimeout(red, TIMEOUT_RED_MS);
  } catch {
    const copia = await leerDocumento(clave);
    conservarRed(evento, red);

    if (copia) {
      avisarCopiaGuardada();
      return copia;
    }

    const offline = await leerOffline();
    return offline ?? respuestaOfflineMinima();
  }
}

function urlRsc(url) {
  const normalizada = new URL(url.href);
  normalizada.searchParams.delete("_rsc");
  normalizada.searchParams.set("__pwa_rsc", "1");
  return normalizada;
}

function conTimeout(promesa, ms) {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(
      () => rechazar(new Error("timeout de red")),
      ms
    );

    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (error) => {
        clearTimeout(temporizador);
        rechazar(error);
      }
    );
  });
}

function conservarRed(evento, red) {
  extenderEvento(
    evento,
    red.then(
      () => undefined,
      () => undefined
    )
  );
}

function extenderEvento(evento, promesa) {
  try {
    evento.waitUntil(promesa);
  } catch {
    // Si el evento ya se cerró, la copia en segundo plano no se puede
    // garantizar; el contenido ya servido no se ve afectado.
  }
}

async function guardarDocumento(clave, respuesta) {
  if (!respuesta || respuesta.status !== 200) return;
  if (respuesta.type !== "basic") return;
  // El navegador oculta Set-Cookie a fetch, pero se deja la comprobación como
  // defensa explícita para entornos que sí la expongan.
  if (respuesta.headers.has("set-cookie")) return;

  const declarado = Number(respuesta.headers.get("content-length") ?? "0");
  if (declarado > MAX_BYTES) return;

  const cuerpo = await respuesta.blob();
  if (cuerpo.size > MAX_BYTES) return;

  const cabeceras = new Headers(respuesta.headers);
  // El cuerpo ya está decodificado; conservar content-encoding haría que el
  // navegador intentara descomprimirlo otra vez al servir la copia.
  cabeceras.delete("content-encoding");
  cabeceras.delete("content-length");
  cabeceras.delete("transfer-encoding");
  cabeceras.set(CABECERA_GUARDADO, new Date().toISOString());

  const copia = new Response(cuerpo, {
    status: 200,
    statusText: respuesta.statusText,
    headers: cabeceras,
  });

  const cache = await caches.open(CACHE_DOCS);
  await cache.put(clave, copia);
  await limitarDocumentos(cache);
}

async function limitarDocumentos(cache) {
  const llaves = await cache.keys();
  const sobrantes = llaves.length - MAX_DOCS;
  if (sobrantes <= 0) return;

  await Promise.all(llaves.slice(0, sobrantes).map((llave) => cache.delete(llave)));
}

async function leerDocumento(clave) {
  const cache = await caches.open(CACHE_DOCS);
  const copia = await cache.match(clave);
  if (!copia) return null;

  if (estaVencido(copia.headers.get(CABECERA_GUARDADO))) {
    await cache.delete(clave);
    return null;
  }

  return copia;
}

function estaVencido(guardadoEn) {
  if (!guardadoEn) return true;
  const instante = Date.parse(guardadoEn);
  if (Number.isNaN(instante)) return true;
  return Date.now() - instante > TTL_DOCS_MS;
}

async function leerOffline() {
  for (const nombre of [CACHE_ASSETS, CACHE_DOCS]) {
    const cache = await caches.open(nombre);
    const copia = await cache.match(OFFLINE_URL);
    if (!copia) continue;

    // La copia de assets es estática; la de documentos respeta el TTL.
    if (
      nombre === CACHE_DOCS &&
      estaVencido(copia.headers.get(CABECERA_GUARDADO))
    ) {
      continue;
    }

    return copia;
  }

  return null;
}

function avisarCopiaGuardada() {
  copiaServidaEn = Date.now();

  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientes) => {
      for (const cliente of clientes) {
        cliente.postMessage({ tipo: "pwa-cache-hit" });
      }
    })
    .catch(() => {
      // Sin pestañas abiertas no hay a quién avisar.
    });
}

// El postMessage del momento en que se sirve el HTML puede llegar antes de que
// React hidrate y escuche. La pestaña avisa cuando ya está lista y el service
// worker responde si acaba de servir una copia.
self.addEventListener("message", (evento) => {
  if (evento.data?.tipo !== "pwa-cliente-listo") return;
  if (Date.now() - copiaServidaEn > 15000) return;
  if (evento.source && "postMessage" in evento.source) {
    evento.source.postMessage({ tipo: "pwa-cache-hit" });
  }
});

function respuestaOfflineMinima() {
  return new Response(
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sin conexión</title><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center"><h1>Sin conexión</h1><p>Necesitas internet para abrir esta página. Inténtalo de nuevo cuando recuperes la señal.</p></body></html>',
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Assets: caché primero para lo versionado, stale-while-revalidate para el resto
// ---------------------------------------------------------------------------

async function cachePrimero(evento, request) {
  const cache = await caches.open(CACHE_ASSETS);
  const copia = await cache.match(request);
  if (copia) return copia;

  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) {
      extenderEvento(evento, guardarAsset(cache, request, respuesta.clone()));
    }
    return respuesta;
  } catch {
    return new Response("", { status: 504, statusText: "Sin conexión" });
  }
}

async function staleWhileRevalidate(evento, request) {
  const cache = await caches.open(CACHE_ASSETS);
  const copia = await cache.match(request);

  const actualizacion = fetch(request)
    .then(async (respuesta) => {
      if (respuesta.ok) {
        await guardarAsset(cache, request, respuesta.clone());
      }
      return respuesta;
    })
    .catch(() => null);

  if (copia) {
    extenderEvento(
      evento,
      actualizacion.then(
        () => undefined,
        () => undefined
      )
    );
    return copia;
  }

  const respuesta = await actualizacion;
  return (
    respuesta ?? new Response("", { status: 504, statusText: "Sin conexión" })
  );
}

async function guardarAsset(cache, request, respuesta) {
  if (!respuesta || respuesta.status !== 200) return;
  if (respuesta.type !== "basic") return;
  // Las redirecciones se guardarían bajo la URL original, que puede ser una
  // ruta sin autorización; por eso se descartan.
  if (respuesta.redirected) return;
  if (respuesta.headers.has("set-cookie")) return;

  const declarado = Number(respuesta.headers.get("content-length") ?? "0");
  if (declarado > MAX_BYTES) return;

  await cache.put(request, respuesta);
}
