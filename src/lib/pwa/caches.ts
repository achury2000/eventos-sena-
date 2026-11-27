import { PWA_PREFIJO_CACHE_DOCS } from "./constantes";

/**
 * Borra únicamente las cachés de documentos (HTML y payloads RSC). Las cachés
 * de assets se conservan porque no contienen datos personales y evitan volver a
 * descargar estilos y tipografías en cada inicio de sesión.
 *
 * Se invoca al montar el login y antes de cerrar sesión. El montaje del login
 * cubre también el aterrizaje tras el cierre y la sesión vencida que redirige
 * al acceso (design.md, D4). La página de login no queda disponible sin
 * conexión a propósito: no hay nada que hacer allí sin red y su copia
 * sobreviviría al cierre de sesión, que es justo lo que se quiere evitar.
 */
export async function limpiarCachesDocumentos(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const nombres = await caches.keys();
    await Promise.all(
      nombres
        .filter((nombre) => nombre.startsWith(PWA_PREFIJO_CACHE_DOCS))
        .map((nombre) => caches.delete(nombre))
    );
  } catch {
    // El navegador puede negar el acceso al almacenamiento (modo privado,
    // cuota agotada). No hay nada que limpiar y no debe romper el login.
  }
}
