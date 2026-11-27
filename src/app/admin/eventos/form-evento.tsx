"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearEvento, editarEvento } from "@/lib/actions/admin/eventos";
import { aInputDateTime } from "@/lib/labels";
import { MAX_ACOMPANANTES_POR_DEFECTO, MAX_ACOMPANANTES_TECNICO } from "@/lib/limites";

type EventoInicial = {
  id?: string;
  nombre?: string;
  descripcion?: string | null;
  lugar?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  inscripcionApertura?: Date;
  inscripcionCierre?: Date;
  cupoMaximo?: number;
  maxAcompanantes?: number;
  incluyeHotel?: boolean;
  incluyeBus?: boolean;
};

export function FormEvento({ evento }: { evento?: EventoInicial | null }) {
  const editando = Boolean(evento?.id);
  const action = editando ? editarEvento : crearEvento;
  const [state, formAction, pending] = useActionState(action, undefined);

  // Control Sí/No del límite de acompañantes. En datos hay un solo entero y
  // `0` significa "inscripción individual" (design.md, D2); el radio es solo la
  // forma de que el Administrador lo exprese sin tener que escribir un cero. El
  // entero lo deriva el servidor a partir de esta elección, no el cliente (D11),
  // así que este formulario nunca envía un `0`: envía "si" o "no".
  //
  // El número vive en estado propio y no como `defaultValue` porque tiene que
  // sobrevivir a que el input se desmonte al elegir "No": si el Administrador
  // responde Sí, escribe 5, prueba el control y vuelve a Sí, el 5 sigue ahí.
  // Un `defaultValue` se perdería al remontar el campo.
  const inicial = evento?.maxAcompanantes;
  const [opcion, setOpcion] = useState(inicial === 0 ? "no" : "si");
  // Si el evento guardado tiene 0, el número arrancaría en "0", que es
  // inválido para la opción "Sí" (el control nunca puede producirla) y dispararía
  // un error de validación en cuanto el Administrador cambiara de opinión.
  // Arranca en el valor por defecto.
  const [cantidad, setCantidad] = useState(
    String(inicial && inicial > 0 ? inicial : MAX_ACOMPANANTES_POR_DEFECTO)
  );

  function errorDe(campo: string) {
    return state?.errors?.[campo];
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {evento?.id ? <input type="hidden" name="id" value={evento.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre del evento</Label>
        <Input id="nombre" name="nombre" defaultValue={evento?.nombre} placeholder="Ej. Día de integración" required />
        {errorDe("nombre") ? <p className="text-sm text-destructive">{errorDe("nombre")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          defaultValue={evento?.descripcion ?? ""}
          rows={3}
          className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
        />
        {errorDe("descripcion") ? <p className="text-sm text-destructive">{errorDe("descripcion")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lugar">Lugar</Label>
        <Input id="lugar" name="lugar" defaultValue={evento?.lugar} placeholder="Ej. Centro Agropecuario de Caldas" required />
        {errorDe("lugar") ? <p className="text-sm text-destructive">{errorDe("lugar")}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fechaInicio">Inicio del evento</Label>
          <Input id="fechaInicio" name="fechaInicio" type="datetime-local" defaultValue={aInputDateTime(evento?.fechaInicio)} required />
          {errorDe("fechaInicio") ? <p className="text-sm text-destructive">{errorDe("fechaInicio")}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fechaFin">Fin del evento</Label>
          <Input id="fechaFin" name="fechaFin" type="datetime-local" defaultValue={aInputDateTime(evento?.fechaFin)} required />
          {errorDe("fechaFin") ? <p className="text-sm text-destructive">{errorDe("fechaFin")}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inscripcionApertura">Inscripciones abren</Label>
          <Input id="inscripcionApertura" name="inscripcionApertura" type="datetime-local" defaultValue={aInputDateTime(evento?.inscripcionApertura)} required />
          {errorDe("inscripcionApertura") ? <p className="text-sm text-destructive">{errorDe("inscripcionApertura")}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inscripcionCierre">Inscripciones cierran</Label>
          <Input id="inscripcionCierre" name="inscripcionCierre" type="datetime-local" defaultValue={aInputDateTime(evento?.inscripcionCierre)} required />
          {errorDe("inscripcionCierre") ? <p className="text-sm text-destructive">{errorDe("inscripcionCierre")}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cupoMaximo">Cupo máximo (personas totales)</Label>
        <Input id="cupoMaximo" name="cupoMaximo" type="number" min={1} defaultValue={evento?.cupoMaximo ?? 1} required />
        {errorDe("cupoMaximo") ? <p className="text-sm text-destructive">{errorDe("cupoMaximo")}</p> : null}
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">¿Permite acompañantes?</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="permiteAcompanantes"
              value="si"
              checked={opcion === "si"}
              onChange={() => setOpcion("si")}
              className="size-4"
            />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="permiteAcompanantes"
              value="no"
              checked={opcion === "no"}
              onChange={() => setOpcion("no")}
              className="size-4"
            />
            No, el evento es de inscripción individual
          </label>
        </div>
        {errorDe("eleccionAcompanantes") ? (
          <p className="text-sm text-destructive">{errorDe("eleccionAcompanantes")}</p>
        ) : null}
      </fieldset>

      {opcion === "si" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxAcompanantes">
            Máximo de acompañantes por inscripción
          </Label>
          <Input
            id="maxAcompanantes"
            name="maxAcompanantes"
            type="number"
            min={1}
            max={MAX_ACOMPANANTES_TECNICO}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />
          <p className="text-sm text-muted-foreground">
            Personas <strong>adicionales al titular</strong> que puede incluir cada
            inscripción, hasta {MAX_ACOMPANANTES_TECNICO}. Si el evento es de
            inscripción individual, elige la opción &quot;No&quot; de arriba.
          </p>
          {errorDe("maxAcompanantes") ? (
            <p className="text-sm text-destructive">{errorDe("maxAcompanantes")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="incluyeHotel" defaultChecked={evento?.incluyeHotel ?? false} className="size-4" />
          Incluye hotel
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="incluyeBus" defaultChecked={evento?.incluyeBus ?? false} className="size-4" />
          Incluye bus
        </label>
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : editando ? "Guardar cambios" : "Crear Evento"}
        </Button>
      </div>
    </form>
  );
}