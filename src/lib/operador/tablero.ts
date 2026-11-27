import { prisma } from "@/lib/prisma";
import {
  EstadoInscripcion,
  MetodoRegistro,
  type TipoCheckpoint,
} from "@/generated/prisma/client";

export interface CheckpointTablero {
  id: string;
  nombre: string;
  tipo: TipoCheckpoint;
  activo: boolean;
  registros: number;
  // Registros creados manualmente por un Operador (metodo = "MANUAL"). El
  // resto se asume autoregistro; el panel grafica el desglose (barras
  // apiladas) y la tarjeta conserva el total en `registros`. En habitaciones
  // ambos conteos excluyen a los asistentes no asignados al cuarto.
  manuales: number;
  // Denominador del avance: asistentes vigentes del evento en checkpoints
  // manuales y ocupantes asignados en habitaciones. El cliente solo lo lee.
  baseDestinatarios: number;
  // Solo para checkpoints respaldados por una habitación (habitacionId != null):
  // asistentes asignados a ese cuarto frente a su capacidad. Los checkpoints
  // manuales no la llevan (undefined), el panel no dibuja la línea.
  // `asignados` contiene IDs, nunca documentos: la tabla de asistentes decide
  // con ellos qué celdas son aplicables.
  habitacion?: { capacidad: number; ocupados: number; asignados: string[] };
}

export interface AsistenteTablero {
  id: string;
  nombreCompleto: string;
  /** checkpointId -> registrado. Solo contiene checkpoints del mismo evento. */
  registradoPorCheckpoint: Record<string, boolean>;
}

export interface EventoTablero {
  id: string;
  nombre: string;
  lugar: string;
  totalAsistentes: number;
  // Asistentes distintos que ya registraron en al menos un checkpoint del
  // evento (cobertura). Nunca mayor que totalAsistentes.
  asistentesRegistrados: number;
  // Asistentes vigentes del evento (inscripción no cancelada) con su estado
  // de registro por checkpoint. Sin documento: el panel del Operador solo
  // necesita nombres para la vista Asistentes.
  asistentes: AsistenteTablero[];
  checkpoints: CheckpointTablero[];
}

export interface TableroOperador {
  eventos: EventoTablero[];
}

// Carga el tablero del Operador en un número constante de consultas: un
// findMany de eventos asignados (con sus checkpoints, ocupantes y el conteo
// filtrado de asistentes vigentes), un único findMany plano de registros
// (checkpointId, asistenteId, metodo) reducido en memoria, la cobertura por
// evento con dos consultas planas (groupBy por asistenteId + findMany de
// Asistente para mapear cada uno a su evento) y un findMany de asistentes
// vigentes con sus registros para la vista Asistentes.
// Nunca se recorre checkpoint por checkpoint (evita N+1, CONTEXT.md §6).
export async function cargarTableroOperador(
  operadorId: string,
): Promise<TableroOperador> {
  const eventos = await prisma.evento.findMany({
    where: { operadores: { some: { operadorId } } },
    orderBy: { fechaInicio: "asc" },
    select: {
      id: true,
      nombre: true,
      lugar: true,
      checkpoints: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          activo: true,
          // Ocupación del cuarto (solo checkpoints de habitación): la
          // relación 1:1 se materializa dentro del mismo findMany. Se traen
          // los IDs de los ocupantes para calcular la base del checkpoint y
          // marcar celdas no aplicables en la vista Asistentes.
          habitacion: {
            select: {
              capacidad: true,
              asistentes: { select: { asistenteId: true } },
            },
          },
        },
        orderBy: { creadoEn: "asc" },
      },
      _count: {
        select: {
          asistentes: {
            where: {
              inscripcion: { estado: { not: EstadoInscripcion.CANCELADO } },
            },
          },
        },
      },
    },
  });

  const eventoIds = eventos.map((evento) => evento.id);

  // Conjunto de ocupantes por checkpoint de habitación. Se construye una sola
  // vez desde el findMany inicial para filtrar los registros históricos de
  // asistentes que ya no pertenecen al cuarto (sin N+1).
  const ocupantesPorCheckpoint = new Map<string, Set<string>>();
  for (const evento of eventos) {
    for (const checkpoint of evento.checkpoints) {
      if (checkpoint.habitacion) {
        ocupantesPorCheckpoint.set(
          checkpoint.id,
          new Set(
            checkpoint.habitacion.asistentes.map(
              (asignado) => asignado.asistenteId
            ),
          ),
        );
      }
    }
  }

  // Registros planos de (checkpointId, asistenteId, metodo) en una sola
  // consulta. Para habitaciones se ignoran las filas cuyo asistente no está
  // en el conjunto de ocupantes; los registros se conservan en la base pero
  // no cuentan para el avance.Para checkpoints manuales se contabilizan todos.
  const registrosBrutos = eventoIds.length
    ? await prisma.registroControl.findMany({
        where: { checkpoint: { eventoId: { in: eventoIds } } },
        select: { checkpointId: true, asistenteId: true, metodo: true },
      })
    : [];
  const manualesPorCheckpoint = new Map<string, number>();
  const registrosPorCheckpoint = new Map<string, number>();
  for (const registro of registrosBrutos) {
    const ocupantes = ocupantesPorCheckpoint.get(registro.checkpointId);
    if (ocupantes && !ocupantes.has(registro.asistenteId)) {
      continue;
    }
    registrosPorCheckpoint.set(
      registro.checkpointId,
      (registrosPorCheckpoint.get(registro.checkpointId) ?? 0) + 1,
    );
    if (registro.metodo === MetodoRegistro.MANUAL) {
      manualesPorCheckpoint.set(
        registro.checkpointId,
        (manualesPorCheckpoint.get(registro.checkpointId) ?? 0) + 1,
      );
    }
  }

  // Cobertura: asistentes distintos que ya registraron en cualquier
  // checkpoint de los eventos asignados. Se agrupa por asistenteId y luego
  // se mapea cada uno a su evento (Asistente.eventoId está desnormalizado),
  // contando en el cliente por evento. Dos consultas planas, sin N+1.
  const registrados = eventoIds.length
    ? await prisma.registroControl.groupBy({
        by: ["asistenteId"],
        where: { checkpoint: { eventoId: { in: eventoIds } } },
      })
    : [];
  const asistentes = registrados.length
    ? await prisma.asistente.findMany({
        where: { id: { in: registrados.map((r) => r.asistenteId) } },
        select: { id: true, eventoId: true },
      })
    : [];
  const asistentesRegistradosPorEvento = new Map<string, number>();
  for (const asistente of asistentes) {
    asistentesRegistradosPorEvento.set(
      asistente.eventoId,
      (asistentesRegistradosPorEvento.get(asistente.eventoId) ?? 0) + 1,
    );
  }

  // Vista Asistentes: nombres de los inscritos vigentes y su estado por
  // checkpoint en una sola consulta. El filtro `eventoId in eventoIds` hereda
  // el guard de asignación del findMany inicial. No se selecciona `documento`.
  const asistentesVista = eventoIds.length
    ? await prisma.asistente.findMany({
        where: {
          eventoId: { in: eventoIds },
          inscripcion: { estado: { not: EstadoInscripcion.CANCELADO } },
        },
        select: {
          id: true,
          nombreCompleto: true,
          eventoId: true,
          registrosControl: {
            where: { checkpoint: { eventoId: { in: eventoIds } } },
            select: { checkpointId: true },
          },
        },
        orderBy: { nombreCompleto: "asc" },
      })
    : [];

  const idsCheckpointsPorEvento = new Map(
    eventos.map((evento) => [
      evento.id,
      new Set(evento.checkpoints.map((checkpoint) => checkpoint.id)),
    ]),
  );
  const asistentesPorEvento = new Map<string, AsistenteTablero[]>();
  for (const asistente of asistentesVista) {
    const idsCheckpoints = idsCheckpointsPorEvento.get(asistente.eventoId);
    const registradoPorCheckpoint: Record<string, boolean> = {};
    for (const registro of asistente.registrosControl) {
      if (idsCheckpoints?.has(registro.checkpointId)) {
        registradoPorCheckpoint[registro.checkpointId] = true;
      }
    }
    const lista = asistentesPorEvento.get(asistente.eventoId) ?? [];
    lista.push({
      id: asistente.id,
      nombreCompleto: asistente.nombreCompleto,
      registradoPorCheckpoint,
    });
    asistentesPorEvento.set(asistente.eventoId, lista);
  }

  return {
    eventos: eventos.map((evento) => ({
      id: evento.id,
      nombre: evento.nombre,
      lugar: evento.lugar,
      totalAsistentes: evento._count.asistentes,
      asistentesRegistrados:
        asistentesRegistradosPorEvento.get(evento.id) ?? 0,
      asistentes: asistentesPorEvento.get(evento.id) ?? [],
      checkpoints: evento.checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        nombre: checkpoint.nombre,
        tipo: checkpoint.tipo,
        activo: checkpoint.activo,
        registros: registrosPorCheckpoint.get(checkpoint.id) ?? 0,
        manuales: manualesPorCheckpoint.get(checkpoint.id) ?? 0,
        baseDestinatarios: checkpoint.habitacion
          ? checkpoint.habitacion.asistentes.length
          : evento._count.asistentes,
        habitacion: checkpoint.habitacion
          ? {
              capacidad: checkpoint.habitacion.capacidad,
              ocupados: checkpoint.habitacion.asistentes.length,
              asignados: checkpoint.habitacion.asistentes.map(
                (asignado) => asignado.asistenteId,
              ),
            }
          : undefined,
      })),
    })),
  };
}
