"use client";

import { useId } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Buscador local de una vista de evento. Cada vista activa muestra su propio
// campo; el valor lo controla PanelOperador para que sobreviva al sondeo y al
// cambio de vista.
export function BuscadorVista({
  valor,
  onChange,
  etiqueta,
  placeholder,
}: {
  valor: string;
  onChange: (valor: string) => void;
  etiqueta: string;
  placeholder: string;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
          className="h-9 pl-9 pr-3 text-sm"
        />
      </div>
      {valor ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
          aria-label={`Limpiar búsqueda: ${etiqueta}`}
          className="sm:shrink-0"
        >
          <X aria-hidden="true" />
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
