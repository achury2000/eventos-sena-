"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asignarOperador } from "@/lib/actions/admin/evento-operadores";

type Operador = { id: string; nombreCompleto: string; email: string };

export function FormAsignarOperador({
  eventoId,
  operadores,
}: {
  eventoId: string;
  operadores: Operador[];
}) {
  const [state, action, pending] = useActionState(asignarOperador, undefined);
  const [filtro, setFiltro] = useState("");

  if (operadores.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay operadores disponibles para asignar.</p>;
  }

  const texto = filtro.trim().toLocaleLowerCase();
  const visibles = texto
    ? operadores.filter(
        (o) =>
          o.nombreCompleto.toLocaleLowerCase().includes(texto) ||
          o.email.toLocaleLowerCase().includes(texto)
      )
    : operadores;

  return (
    <form action={action} className="flex items-end gap-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <LabelOperador />
        <Input
          type="search"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar operador por nombre o correo"
        />
        {visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay operadores que coincidan con “{filtro.trim()}”.
          </p>
        ) : (
          <select
            name="operadorId"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {visibles.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombreCompleto} — {o.email}
              </option>
            ))}
          </select>
        )}
      </div>
      <Button type="submit" variant="secondary" disabled={pending || visibles.length === 0}>
        {pending ? "Asignando..." : "Asignar"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}

function LabelOperador() {
  return <label className="text-sm font-medium">Asignar Operador al evento</label>;
}