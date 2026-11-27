import { ETIQUETA_TIPO_CHECKPOINT, TIPOS_CHECKPOINT } from "@/lib/labels";
import type { FiltrosReporte } from "./cargar-reporte";

// Lógica pura compartida entre la página del reporte y las dos exportaciones.
// Debe conservar exactamente el comportamiento previo de la ruta XLSX: valores
// desconocidos se ignoran y el texto de filtros usa las mismas etiquetas.

type ValorFiltro = string | null | undefined;

export function filtrosReporteDesdeParametros(valores: {
  tipo?: ValorFiltro;
  rol?: ValorFiltro;
}): FiltrosReporte {
  const filtros: FiltrosReporte = {};

  if (
    valores.tipo &&
    TIPOS_CHECKPOINT.some((t) => t.value === valores.tipo)
  ) {
    filtros.tipoCheckpoint = valores.tipo as FiltrosReporte["tipoCheckpoint"];
  }
  if (valores.rol === "titular" || valores.rol === "acompanante") {
    filtros.rol = valores.rol;
  }

  return filtros;
}

export function filtrosReporteDesdeSearchParams(
  searchParams: URLSearchParams
): FiltrosReporte {
  return filtrosReporteDesdeParametros({
    tipo: searchParams.get("tipo"),
    rol: searchParams.get("rol"),
  });
}

export function descripcionFiltrosReporte(filtros: FiltrosReporte): string {
  const etiquetas: string[] = [];
  if (filtros.tipoCheckpoint) {
    etiquetas.push(
      `Tipo de checkpoint: ${
        ETIQUETA_TIPO_CHECKPOINT[filtros.tipoCheckpoint] ?? filtros.tipoCheckpoint
      }`
    );
  }
  if (filtros.rol) {
    etiquetas.push(
      `Persona: ${filtros.rol === "titular" ? "Titulares" : "Acompañantes"}`
    );
  }
  return etiquetas.length ? etiquetas.join(" · ") : "Todos (sin filtros)";
}

export function slugReporte(nombre: string): string {
  return (
    nombre
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "evento"
  );
}
