"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crearHabitacion,
  editarHabitacion,
} from "@/lib/actions/admin/habitaciones";

export function FormHabitacion({ eventoId }: { eventoId: string }) {
  const [state, action, pending] = useActionState(crearHabitacion, undefined);

  return (
    <form action={action} className="flex items-end gap-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="habitacion-identificador">Identificador</Label>
        <Input
          id="habitacion-identificador"
          name="identificador"
          placeholder="Ej. 101"
          maxLength={20}
          required
        />
      </div>
      <div className="flex w-28 flex-col gap-1.5">
        <Label htmlFor="habitacion-capacidad">Capacidad</Label>
        <Input
          id="habitacion-capacidad"
          name="capacidad"
          type="number"
          min={1}
          step={1}
          placeholder="2"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "Agregar"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function FormHabitacionEditar({
  eventoId,
  habitacion,
}: {
  eventoId: string;
  habitacion: { id: string; identificador: string; capacidad: number };
}) {
  const [state, action, pending] = useActionState(editarHabitacion, undefined);

  return (
    <form action={action} className="flex flex-col items-end gap-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <input type="hidden" name="id" value={habitacion.id} />
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`hab-edit-id-${habitacion.id}`}>Identificador</Label>
        <Input
          id={`hab-edit-id-${habitacion.id}`}
          name="identificador"
          defaultValue={habitacion.identificador}
          maxLength={20}
          required
        />
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`hab-edit-cap-${habitacion.id}`}>Capacidad</Label>
        <Input
          id={`hab-edit-cap-${habitacion.id}`}
          name="capacidad"
          type="number"
          min={1}
          step={1}
          defaultValue={habitacion.capacidad}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}