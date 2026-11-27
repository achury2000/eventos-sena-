"use client";

import { usePathname, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { TIPOS_CHECKPOINT } from "@/lib/labels";
import type { FiltrosReporte } from "@/lib/reportes/cargar-reporte";

// Filtros del reporte: tipo de checkpoint y titular/acompañante.
// Navegan con searchParams para que la página server recargue los datos
// filtrados y la exportación use exactamente lo que se ve (tarea 4.3).
export function FiltrosReporteForm({ filtros }: { filtros: FiltrosReporte }) {
  const router = useRouter();
  const pathname = usePathname();

  function navegar(cambios: Partial<FiltrosReporte>) {
    const params = new URLSearchParams();
    const nuevo = { ...filtros, ...cambios };
    if (nuevo.tipoCheckpoint) params.set("tipo", nuevo.tipoCheckpoint);
    if (nuevo.rol) params.set("rol", nuevo.rol);
    const query = params.size ? `?${params.toString()}` : "";
    router.push(`${pathname}${query}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-tipo">Tipo de checkpoint</Label>
        <select
          id="filtro-tipo"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={filtros.tipoCheckpoint ?? ""}
          onChange={(e) =>
            navegar({
              tipoCheckpoint: (e.target.value || undefined) as
                | FiltrosReporte["tipoCheckpoint"]
                | undefined,
            })
          }
        >
          <option value="">Todos</option>
          {TIPOS_CHECKPOINT.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-rol">Persona</Label>
        <select
          id="filtro-rol"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={filtros.rol ?? ""}
          onChange={(e) =>
            navegar({ rol: (e.target.value || undefined) as FiltrosReporte["rol"] })
          }
        >
          <option value="">Todos</option>
          <option value="titular">Titulares</option>
          <option value="acompanante">Acompañantes</option>
        </select>
      </div>
    </div>
  );
}