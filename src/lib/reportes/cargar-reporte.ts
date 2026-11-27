import { EstadoInscripcion, type TipoCheckpoint } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Módulo de servidor (patrón de src/lib/operador/tablero.ts): consultas
// eficientes del reporte de asistentes, compartidas entre la página
// /admin/eventos/[id]/reporte y la exportación XLSX. No se importa desde
// componentes de cliente.

export interface FiltrosReporte {
  /** Filtra los checkpoints visibles por su categoría amplia. */
  tipoCheckpoint?: TipoCheckpoint;
  /** "titular" -> solo esTitular = true; "acompanante" -> solo esTitular = false. */
  rol?: "titular" | "acompanante";
}

export interface CheckpointReporte {
  id: string;
  nombre: string;
  tipo: TipoCheckpoint;
  activo: boolean;
  /** Asistentes esperados (inscripción no cancelada, según filtro de rol). */
  esperados: number;
  /** Registros reales del checkpoint de asistentes esperados. */
  registrados: number;
  /**
   * Personas esperadas que aún no tienen registro en el checkpoint.
   * Nunca es negativo: "registrados" y "esperados" comparten el mismo
   * universo (inscripción no cancelada y filtro de rol).
   */
  faltan: number;
  /** Porcentaje de asistencia; null cuando no hay esperados. */
  porcentaje: number | null;
}

export interface AsistenteReporte {
  id: string;
  nombreCompleto: string;
  documento: string;
  esTitular: boolean;
  centroFormacion: string | null;
  /** checkpointId -> registrado (solo para los checkpoints visibles). */
  registradoPorCheckpoint: Record<string, boolean>;
  completados: number;
  totalCheckpoints: number;
}

export interface ReporteEvento {
  id: string;
  nombre: string;
  lugar: string;
  fechaInicio: Date;
  fechaFin: Date;
  checkpoints: CheckpointReporte[];
  asistentes: AsistenteReporte[];
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}

// Carga el reporte de un evento con un número constante de consultas:
// (1) el evento con sus checkpoints y el conteo filtrado de registros, y
// (2) los asistentes esperados con sus registros por checkpoint.
// Devuelve null si el evento no existe.
export async function cargarReporteEvento(
  eventoId: string,
  filtros: FiltrosReporte = {}
): Promise<ReporteEvento | null> {
  // Un único predicado de rol para "esperados" y "registrados": si el filtro
  // se aplicara solo a uno de los dos, la diferencia y el porcentaje quedarían
  // calculados sobre universos distintos (registros de acompañantes sumando
  // cuando se filtra por titulares).
  const filtroRol: { esTitular?: boolean } =
    filtros.rol === "titular"
      ? { esTitular: true }
      : filtros.rol === "acompanante"
        ? { esTitular: false }
        : {};

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      id: true,
      nombre: true,
      lugar: true,
      fechaInicio: true,
      fechaFin: true,
      checkpoints: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          activo: true,
          _count: {
            select: {
              registros: {
                // Solo cuentan los registros de asistentes esperados
                // (inscripción no cancelada y mismo filtro de rol), el mismo
                // universo que los conteos de "esperados".
                where: {
                  asistente: {
                    ...filtroRol,
                    inscripcion: {
                      estado: { not: EstadoInscripcion.CANCELADO },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { creadoEn: "asc" },
      },
    },
  });
  if (!evento) return null;

  const checkpoints =
    filtros.tipoCheckpoint === undefined
      ? evento.checkpoints
      : evento.checkpoints.filter((c) => c.tipo === filtros.tipoCheckpoint);

  const asistentes = await prisma.asistente.findMany({
    where: {
      eventoId,
      inscripcion: { estado: { not: EstadoInscripcion.CANCELADO } },
      ...filtroRol,
    },
    select: {
      id: true,
      nombreCompleto: true,
      documento: true,
      esTitular: true,
      centroFormacion: true,
      registrosControl: { select: { checkpointId: true } },
    },
    orderBy: { nombreCompleto: "asc" },
  });

  const idsCheckpoints = new Set(checkpoints.map((c) => c.id));

  const checkpointsReporte: CheckpointReporte[] = checkpoints.map((c) => {
    const registrados = c._count.registros;
    const esperados = asistentes.length;
    return {
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      activo: c.activo,
      esperados,
      registrados,
      faltan: esperados - registrados,
      porcentaje: esperados === 0 ? null : redondear((registrados / esperados) * 100),
    };
  });

  const asistentesReporte: AsistenteReporte[] = asistentes.map((a) => {
    const registradoPorCheckpoint: Record<string, boolean> = {};
    let completados = 0;
    for (const registro of a.registrosControl) {
      if (idsCheckpoints.has(registro.checkpointId)) {
        registradoPorCheckpoint[registro.checkpointId] = true;
      }
    }
    for (const id of idsCheckpoints) {
      if (registradoPorCheckpoint[id]) completados += 1;
    }
    return {
      id: a.id,
      nombreCompleto: a.nombreCompleto,
      documento: a.documento,
      esTitular: a.esTitular,
      centroFormacion: a.centroFormacion ?? null,
      registradoPorCheckpoint,
      completados,
      totalCheckpoints: idsCheckpoints.size,
    };
  });

  return {
    id: evento.id,
    nombre: evento.nombre,
    lugar: evento.lugar,
    fechaInicio: evento.fechaInicio,
    fechaFin: evento.fechaFin,
    checkpoints: checkpointsReporte,
    asistentes: asistentesReporte,
  };
}