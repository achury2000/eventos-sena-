"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearUsuario } from "@/lib/actions/admin/usuarios";
import { TIPOS_AFILIACION } from "@/lib/labels";

type Rol = "OPERADOR" | "ADMINISTRADOR";

export function FormUsuario({
  rolInicial = "OPERADOR",
}: {
  rolInicial?: Rol;
}) {
  const [state, action, pending] = useActionState(crearUsuario, undefined);
  // El centro de formación es obligatorio solo para Administradores (personal
  // del SENA); un Operador puede ser externo. El `required` del HTML refleja la
  // regla para dar UX inmediata, pero el servidor la re-valida.
  const [rol, setRol] = useState<Rol>(rolInicial);

  function errorDe(campo: string) {
    return state?.errors?.[campo];
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rol">Rol</Label>
        <select
          id="rol"
          name="rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          required
        >
          <option value="OPERADOR">Operador</option>
          <option value="ADMINISTRADOR">Administrador</option>
        </select>
        {errorDe("rol") ? <p className="text-sm text-destructive">{errorDe("rol")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombreCompleto">Nombre completo</Label>
        <Input id="nombreCompleto" name="nombreCompleto" placeholder="Nombre del usuario" required />
        {errorDe("nombreCompleto") ? (
          <p className="text-sm text-destructive">{errorDe("nombreCompleto")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="documento">Documento</Label>
        <Input id="documento" name="documento" inputMode="numeric" placeholder="Número de documento" required />
        {errorDe("documento") ? <p className="text-sm text-destructive">{errorDe("documento")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" placeholder="correo@sena.gov.co" required />
        {errorDe("email") ? <p className="text-sm text-destructive">{errorDe("email")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña (la asigna el Administrador)</Label>
        <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" required />
        {errorDe("password") ? <p className="text-sm text-destructive">{errorDe("password")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tipoAfiliacion">Tipo de afiliación</Label>
        <select
          id="tipoAfiliacion"
          name="tipoAfiliacion"
          defaultValue={TIPOS_AFILIACION[0].value}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          required
        >
          {TIPOS_AFILIACION.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errorDe("tipoAfiliacion") ? <p className="text-sm text-destructive">{errorDe("tipoAfiliacion")}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="centroFormacion">Centro de formación</Label>
        <Input
          id="centroFormacion"
          name="centroFormacion"
          placeholder="Escribe el nombre del centro"
          maxLength={200}
          required={rol === "ADMINISTRADOR"}
        />
        <p className="text-xs text-muted-foreground">
          {rol === "ADMINISTRADOR"
            ? "Obligatorio para Administradores (personal del SENA)."
            : "Opcional para Operadores: pueden ser personal del SENA o externos."}
        </p>
        {errorDe("centroFormacion") ? (
          <p className="text-sm text-destructive">{errorDe("centroFormacion")}</p>
        ) : null}
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
          {pending ? "Creando..." : "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}
