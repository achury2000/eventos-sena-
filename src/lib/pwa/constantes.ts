// Constantes compartidas de la PWA. Viven en un módulo hoja (sin imports) para
// que las usen tanto los componentes cliente como las pruebas, sin arrastrar
// dependencias de Next ni del navegador.
//
// `PWA_VERSION` debe coincidir con el `VERSION` de `public/sw.js`: es la versión
// de las cachés, no la del paquete. Se incrementa cuando cambia la lógica de
// caché o el contrato de nombres (design.md, D10).

export const PWA_NOMBRE = "Eventos SENA";
export const PWA_NOMBRE_CORTO = "Eventos SENA";
export const PWA_DESCRIPCION =
  "Plataforma de gestión de eventos y control de asistencia del SENA";
export const PWA_COLOR = "#25A200";
export const PWA_VERSION = "pwa-2";

export const PWA_PREFIJO_CACHE_DOCS = "pwa-docs-";
export const PWA_PREFIJO_CACHE_ASSETS = "pwa-assets-";
export const PWA_CACHE_DOCS = `${PWA_PREFIJO_CACHE_DOCS}${PWA_VERSION}`;
export const PWA_CACHE_ASSETS = `${PWA_PREFIJO_CACHE_ASSETS}${PWA_VERSION}`;

// Ventana de privacidad para el HTML y los payloads RSC autenticados: pasado
// este plazo se tratan como inexistentes y se muestra /offline.
export const PWA_TTL_DOCUMENTOS_MS = 24 * 60 * 60 * 1000;
export const PWA_MAX_DOCUMENTOS = 40;
export const PWA_MAX_BYTES_RESPUESTA = 2 * 1024 * 1024;

// Mensajes entre el service worker y las pestañas.
export const PWA_EVENTO_COPIA_GUARDADA = "pwa-cache-hit";
export const PWA_EVENTO_CLIENTE_LISTO = "pwa-cliente-listo";
export const PWA_EVENTO_ESCRITURA_BLOQUEADA = "pwa-escritura-bloqueada";
