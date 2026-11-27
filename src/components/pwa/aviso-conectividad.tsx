"use client";

import { useEffect, useState } from "react";
import { useSinConexion } from "@/components/pwa/use-sin-conexion";
import {
  PWA_EVENTO_CLIENTE_LISTO,
  PWA_EVENTO_COPIA_GUARDADA,
  PWA_EVENTO_ESCRITURA_BLOQUEADA,
} from "@/lib/pwa/constantes";
import {
  MENSAJE_COPIA_GUARDADA,
  MENSAJE_ESCRITURA_BLOQUEADA,
} from "@/lib/pwa/conexion";

/**
 * Aviso global de modo lectura (design.md, D6). Reacciona a `online`/`offline`
 * y escucha al service worker cuando sirve una copia guardada. El guardia de
 * escrituras usa un evento de ventana para pedir que se muestre el mensaje de
 * bloqueo en esta misma franja.
 */
export function AvisoConectividad() {
  const sinConexion = useSinConexion();
  const [copiaGuardada, setCopiaGuardada] = useState(false);
  const [escrituraBloqueada, setEscrituraBloqueada] = useState(false);

  useEffect(() => {
    function alRecibirMensaje(evento: MessageEvent) {
      if (evento.data?.tipo === PWA_EVENTO_COPIA_GUARDADA) {
        setCopiaGuardada(true);
      }
    }

    function alBloquearEscritura() {
      setEscrituraBloqueada(true);
    }

    function alRecuperarConexion() {
      if (navigator.onLine) {
        setCopiaGuardada(false);
        setEscrituraBloqueada(false);
      }
    }

    // Si el HTML se sirvió desde la caché antes de hidratar, el mensaje del
    // service worker se perdió. Al estar lista, la pestaña se lo pide otra vez.
    function pedirEstadoCopia() {
      navigator.serviceWorker?.controller?.postMessage({
        tipo: PWA_EVENTO_CLIENTE_LISTO,
      });
    }

    navigator.serviceWorker?.addEventListener("message", alRecibirMensaje);
    navigator.serviceWorker?.addEventListener("controllerchange", pedirEstadoCopia);
    window.addEventListener(
      PWA_EVENTO_ESCRITURA_BLOQUEADA,
      alBloquearEscritura
    );
    window.addEventListener("online", alRecuperarConexion);
    pedirEstadoCopia();

    return () => {
      navigator.serviceWorker?.removeEventListener("message", alRecibirMensaje);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        pedirEstadoCopia
      );
      window.removeEventListener(
        PWA_EVENTO_ESCRITURA_BLOQUEADA,
        alBloquearEscritura
      );
      window.removeEventListener("online", alRecuperarConexion);
    };
  }, []);

  if (!sinConexion && !copiaGuardada && !escrituraBloqueada) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm text-warning-foreground print:hidden"
    >
      <p className="mx-auto max-w-4xl">
        {sinConexion
          ? "Sin conexión. Puedes consultar páginas ya visitadas; para inscribir o registrar necesitas internet."
          : null}
        {copiaGuardada ? ` ${MENSAJE_COPIA_GUARDADA}` : null}
        {escrituraBloqueada ? ` ${MENSAJE_ESCRITURA_BLOQUEADA}` : null}
      </p>
    </div>
  );
}
