"use client";

import { useEffect } from "react";

/**
 * Registra el service worker solo en producción. En desarrollo cachearía los
 * bundles de HMR y produciría recargas fantasma; la verificación offline se
 * hace contra un build de producción (design.md, D2).
 *
 * `updateViaCache: "none"` obliga a comprobar el script contra el servidor en
 * cada actualización, en línea con el `Cache-Control: no-store` de `/sw.js`.
 */
export function RegistradorPwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Sin service worker la app sigue funcionando en línea; el modo
        // offline es una mejora, no un requisito para arrancar.
      });
  }, []);

  return null;
}
