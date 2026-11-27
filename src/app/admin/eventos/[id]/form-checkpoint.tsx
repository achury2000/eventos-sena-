"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearCheckpoint, editarCheckpoint } from "@/lib/actions/admin/checkpoints";
import { TIPOS_CHECKPOINT } from "@/lib/labels";

export function FormCheckpoint({ eventoId }: { eventoId: string }) {
  const [state, action, pending] = useActionState(crearCheckpoint, undefined);

  return (
    <form action={action} className="flex items-end gap-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="checkpoint-nombre">Nombre del checkpoint</Label>
        <Input id="checkpoint-nombre" name="nombre" placeholder="Ej. Desayuno" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkpoint-tipo">Categoría</Label>
        <select
          id="checkpoint-tipo"
          name="tipo"
          defaultValue={TIPOS_CHECKPOINT[0].value}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {TIPOS_CHECKPOINT.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "Agregar"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.errors?.nombre ? (
        <p className="text-sm text-destructive">{state.errors.nombre}</p>
      ) : null}
    </form>
  );
}

export function FormCheckpointEditar({
  eventoId,
  checkpoint,
}: {
  eventoId: string;
  checkpoint: { id: string; nombre: string; tipo: string };
}) {
  const [state, action, pending] = useActionState(editarCheckpoint, undefined);

  return (
    <form action={action} className="flex items-end gap-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <input type="hidden" name="id" value={checkpoint.id} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor={`cp-edit-n-${checkpoint.id}`}>Nombre</Label>
        <Input
          id={`cp-edit-n-${checkpoint.id}`}
          name="nombre"
          defaultValue={checkpoint.nombre}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cp-edit-t-${checkpoint.id}`}>Categoría</Label>
        <select
          id={`cp-edit-t-${checkpoint.id}`}
          name="tipo"
          defaultValue={checkpoint.tipo}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {TIPOS_CHECKPOINT.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}