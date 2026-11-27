"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Estado = "idle" | "copiado" | "error";

export function BotonCopiar({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
    } catch {
      setEstado("error");
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setEstado("idle"), 2000);
      return;
    }
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setEstado("idle"), 2000);
  }

  const etiqueta =
    estado === "copiado" ? "Copiado ✓" : estado === "error" ? "No se pudo copiar" : "Copiar";

  return (
    <Button
      variant={estado === "error" ? "destructive" : "secondary"}
      size="sm"
      onClick={copiar}
      aria-live="polite"
    >
      {etiqueta}
    </Button>
  );
}