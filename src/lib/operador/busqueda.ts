import { ETIQUETA_TIPO_CHECKPOINT } from "@/lib/labels";
import type { CheckpointTablero } from "./tablero";

// Normalización compartida por los buscadores del panel: sin tildes y en
// minúsculas, de modo que "habitacion" encuentre "Habitación 601" y
// "ALOJAMIENTO" encuentre la categoría "Alojamiento". Solo afecta comparaciones.
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Texto comparable de un checkpoint: nombre + categoría legible.
function textoComparableCheckpoint(checkpoint: CheckpointTablero): string {
  return `${checkpoint.nombre} ${
    ETIQUETA_TIPO_CHECKPOINT[checkpoint.tipo] ?? checkpoint.tipo
  }`;
}

export function coincideCheckpoint(
  checkpoint: CheckpointTablero,
  busqueda: string
): boolean {
  const termino = normalizarBusqueda(busqueda);
  if (!termino) return true;
  return normalizarBusqueda(textoComparableCheckpoint(checkpoint)).includes(
    termino
  );
}

export function coincideAsistente(
  nombreCompleto: string,
  busqueda: string
): boolean {
  const termino = normalizarBusqueda(busqueda);
  if (!termino) return true;
  return normalizarBusqueda(nombreCompleto).includes(termino);
}

// Etiqueta corta para la columna de una habitación ("601" en "Habitación 601").
// El nombre completo se conserva en el atributo title de la cabecera.
export function etiquetaCortaCheckpoint(checkpoint: CheckpointTablero): string {
  if (checkpoint.habitacion) {
    const coincidencia = checkpoint.nombre.match(/(\d+[A-Za-z]?)\s*$/);
    if (coincidencia) return coincidencia[1];
  }

  const MAXIMO = 14;
  return checkpoint.nombre.length > MAXIMO
    ? `${checkpoint.nombre.slice(0, MAXIMO - 1)}…`
    : checkpoint.nombre;
}

export function textoColumnasVisibles(cantidad: number): string {
  return cantidad === 1
    ? "1 columna visible"
    : `${cantidad} columnas visibles`;
}
