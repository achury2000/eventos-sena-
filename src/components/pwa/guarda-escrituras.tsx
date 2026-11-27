"use client";

import { useEffect } from "react";
import { PWA_EVENTO_ESCRITURA_BLOQUEADA } from "@/lib/pwa/constantes";

/**
 * Intercepta el envío de formularios en fase de captura cuando no hay red.
 * El evento se registra en `document` (antes de que React despache su propio
 * `onSubmit`), así que `stopPropagation` impide que corra el handler del
 * formulario y `preventDefault` impide el envío nativo. No hay cola: la persona
 * debe reintentar cuando recupere la conexión (design.md, D6).
 */
export function GuardaEscriturasSinConexion() {
  useEffect(() => {
    function alEnviar(evento: SubmitEvent) {
      if (navigator.onLine) return;

      evento.preventDefault();
      evento.stopPropagation();
      window.dispatchEvent(new Event(PWA_EVENTO_ESCRITURA_BLOQUEADA));
    }

    document.addEventListener("submit", alEnviar, true);
    return () => document.removeEventListener("submit", alEnviar, true);
  }, []);

  return null;
}
