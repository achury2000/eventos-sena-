"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { useTema } from "./proveedor-tema";
import type { Tema } from "@/lib/tema";

const OPCIONES: Array<{
  valor: Tema;
  etiqueta: string;
  Icono: LucideIcon;
}> = [
  { valor: "light", etiqueta: "Usar tema claro", Icono: Sun },
  { valor: "dark", etiqueta: "Usar tema oscuro", Icono: Moon },
  { valor: "system", etiqueta: "Usar tema del sistema", Icono: Monitor },
];

export function SelectorTema() {
  const { tema, setTema } = useTema();

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className="flex items-center gap-0.5 rounded-full border border-white/25 bg-black/15 p-0.5"
    >
      {OPCIONES.map(({ valor, etiqueta, Icono }) => {
        const activo = tema === valor;

        return (
          <button
            key={valor}
            type="button"
            onClick={() => setTema(valor)}
            aria-label={etiqueta}
            aria-pressed={activo}
            title={etiqueta}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand",
              activo
                ? "bg-white text-brand-ink shadow-sm"
                : "text-white/80 hover:bg-white/15 hover:text-white"
            )}
          >
            <Icono className="size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
