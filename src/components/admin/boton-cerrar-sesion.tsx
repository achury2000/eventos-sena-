"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { limpiarCachesDocumentos } from "@/lib/pwa/caches";

export function BotonCerrarSesion() {
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    if (saliendo) return;

    setSaliendo(true);
    try {
      // Primero se borran las copias autenticadas; así, incluso si el cierre
      // de sesión tarda o falla, el contenido no queda disponible sin red.
      await limpiarCachesDocumentos();
    } finally {
      await signOut({ callbackUrl: "/login" });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cerrarSesion}
      disabled={saliendo}
    >
      {saliendo ? "Cerrando..." : "Cerrar sesión"}
    </Button>
  );
}
