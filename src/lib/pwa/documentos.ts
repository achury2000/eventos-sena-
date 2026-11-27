import {
  PWA_MAX_DOCUMENTOS,
  PWA_PREFIJO_CACHE_ASSETS,
  PWA_PREFIJO_CACHE_DOCS,
  PWA_TTL_DOCUMENTOS_MS,
  PWA_VERSION,
} from "./constantes";

// Funciones puras del contrato de caché. El service worker las replica en
// `public/sw.js` (no puede importar TypeScript), así que cualquier cambio de
// nombres o de vencimiento debe hacerse en los dos lugares.

export function nombreCacheDocumentos(version = PWA_VERSION): string {
  return `${PWA_PREFIJO_CACHE_DOCS}${version}`;
}

export function nombreCacheAssets(version = PWA_VERSION): string {
  return `${PWA_PREFIJO_CACHE_ASSETS}${version}`;
}

/**
 * Indica si una copia guardada ya no es vigente. Un valor ausente, vacío o no
 * parseable se considera vencido: es más seguro descartar que servir una copia
 * de la que no se conoce la fecha.
 */
export function estaVencido(
  guardadoEn: string | null | undefined,
  ahora: number = Date.now(),
  ttlMs: number = PWA_TTL_DOCUMENTOS_MS
): boolean {
  if (!guardadoEn) return true;
  const instante = Date.parse(guardadoEn);
  if (Number.isNaN(instante)) return true;
  return ahora - instante > ttlMs;
}

/**
 * Normaliza la URL de un payload RSC para que el `_rsc` (un hash que cambia en
 * cada build) no impida encontrar la copia. El resto de los parámetros se
 * conserva, y se agrega `__pwa_rsc` para no colisionar con el HTML de la misma
 * ruta en la caché de documentos.
 */
export function normalizarUrlRsc(url: string | URL): string {
  const normalizada = new URL(url.toString());
  normalizada.searchParams.delete("_rsc");
  normalizada.searchParams.set("__pwa_rsc", "1");
  return normalizada.toString();
}

/**
 * Límite de documentos por caché. Devuelve cuántas entradas sobran y, por
 * tanto, deben eliminarse las más antiguas por orden de `cache.keys()`.
 */
export function entradasSobrantes(
  cantidad: number,
  maximo: number = PWA_MAX_DOCUMENTOS
): number {
  return Math.max(0, cantidad - maximo);
}
