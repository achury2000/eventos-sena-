// Módulo seguro para componentes del cliente: NO importa nada del cliente
// generado de Prisma (evita arrastrar su runtime al bundle del browser).

export type EstadoEventoString =
  | "PLANEADO"
  | "INSCRIPCIONES_ABIERTAS"
  | "CERRADO"
  | "FINALIZADO"
  | "CANCELADO";

export const ETIQUETA_ESTADO: Record<EstadoEventoString, string> = {
  PLANEADO: "Planeado",
  INSCRIPCIONES_ABIERTAS: "Inscripciones abiertas",
  CERRADO: "Cerrado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const TIPOS_CHECKPOINT = [
  { value: "COMIDA", label: "Comida" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "ALOJAMIENTO", label: "Alojamiento" },
  { value: "OTRO", label: "Otro" },
] as const;

export const ETIQUETA_TIPO_CHECKPOINT: Record<string, string> = Object.fromEntries(
  TIPOS_CHECKPOINT.map((t) => [t.value, t.label])
);

export const TIPOS_AFILIACION = [
  { value: "SENA", label: "SENA" },
  { value: "EXTERNO", label: "Externo" },
] as const;

export const ETIQUETA_AFILIACION: Record<string, string> = Object.fromEntries(
  TIPOS_AFILIACION.map((t) => [t.value, t.label])
);

export function formatearFecha(d: Date): string {
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export function aInputDateTime(d: Date | undefined): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}