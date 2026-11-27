"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, EstadoInscripcion } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { habitacionSchema } from "@/lib/validations/admin";
import { requireAdmin } from "./guard";
import { type ActionState } from "./types";

async function leerHabitacion(formData: FormData) {
  const eventoId = formData.get("eventoId");
  const identificador = formData.get("identificador");
  const capacidad = formData.get("capacidad");
  if (typeof eventoId !== "string" || !eventoId) {
    return { eventoId: null, parsed: null };
  }
  const parsed = habitacionSchema.safeParse({ identificador, capacidad });
  return { eventoId, parsed };
}

async function eventoConHotel(eventoId: string) {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: { id: true, incluyeHotel: true },
  });
  if (!evento) return null;
  if (!evento.incluyeHotel) return { hotel: false as const };
  return { hotel: true as const };
}

export async function crearHabitacion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const { eventoId, parsed } = await leerHabitacion(formData);
  if (!eventoId || !parsed) {
    return { error: "Evento no identificado." };
  }
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const evento = await eventoConHotel(eventoId);
  if (!evento) {
    return { error: "El evento no existe." };
  }
  if (!evento.hotel) {
    return { error: "Este evento no incluye hotel." };
  }

  try {
    await prisma.habitacion.create({
      data: {
        eventoId,
        identificador: parsed.data.identificador,
        capacidad: parsed.data.capacidad,
        // La habitación nace como checkpoint del evento (estación de control
        // con QR propio): ALOJAMIENTO y activa desde el inicio.
        checkpoint: {
          create: {
            evento: { connect: { id: eventoId } },
            nombre: `Habitación ${parsed.data.identificador}`,
            tipo: "ALOJAMIENTO",
            activo: true,
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya existe una habitación con ese identificador en este evento." };
    }
    throw error;
  }

  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}`);
}

export async function editarHabitacion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const eventoId = formData.get("eventoId");
  if (typeof id !== "string" || !id || typeof eventoId !== "string" || !eventoId) {
    return { error: "Habitación no identificada." };
  }

  const parsed = habitacionSchema.safeParse({
    identificador: formData.get("identificador"),
    capacidad: formData.get("capacidad"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const habitacion = await prisma.habitacion.findUnique({
    where: { id },
    select: { eventoId: true, _count: { select: { asistentes: true } } },
  });
  if (!habitacion || habitacion.eventoId !== eventoId) {
    return { error: "La habitación no existe en este evento." };
  }
  if (parsed.data.capacidad < habitacion._count.asistentes) {
    return {
      error: `No se puede bajar la capacidad a ${parsed.data.capacidad}: la habitación tiene ${habitacion._count.asistentes} ocupante(s).`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.habitacion.update({
        where: { id },
        data: {
          identificador: parsed.data.identificador,
          capacidad: parsed.data.capacidad,
        },
      }),
      // Sincroniza el nombre del checkpoint del cuarto. updateMany es un
      // no-op seguro si la fila no existiera (estado legacy defendido).
      prisma.checkpoint.updateMany({
        where: { habitacionId: id },
        data: { nombre: `Habitación ${parsed.data.identificador}` },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya existe una habitación con ese identificador en este evento." };
    }
    throw error;
  }

  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}`);
}

export async function eliminarHabitacion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const eventoId = formData.get("eventoId");
  if (typeof id !== "string" || !id || typeof eventoId !== "string" || !eventoId) {
    return { error: "Habitación no identificada." };
  }

  const habitacion = await prisma.habitacion.findUnique({
    where: { id },
    select: { eventoId: true, _count: { select: { asistentes: true } } },
  });
  if (!habitacion || habitacion.eventoId !== eventoId) {
    return { error: "La habitación no existe en este evento." };
  }
  if (habitacion._count.asistentes > 0) {
    return {
      error: `No se puede eliminar: la habitación tiene ${habitacion._count.asistentes} ocupante(s). Desasigna primero.`,
    };
  }

  await prisma.habitacion.delete({ where: { id } });

  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}`);
}

type ResultadoAsignacion = { tipo: "OK" } | { tipo: "ERROR"; error: string };

export async function asignarAsistente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const eventoId = formData.get("eventoId");
  const habitacionId = formData.get("habitacionId");
  const asistenteId = formData.get("asistenteId");
  if (
    typeof eventoId !== "string" || !eventoId ||
    typeof habitacionId !== "string" || !habitacionId ||
    typeof asistenteId !== "string" || !asistenteId
  ) {
    return { error: "Faltan datos de la asignación." };
  }

  const resultado = await prisma.$transaction(async (tx): Promise<ResultadoAsignacion> => {
    const habitacion = await tx.habitacion.findUnique({
      where: { id: habitacionId },
      select: {
        eventoId: true,
        capacidad: true,
        _count: { select: { asistentes: true } },
      },
    });
    if (!habitacion || habitacion.eventoId !== eventoId) {
      return { tipo: "ERROR", error: "La habitación no existe en este evento." };
    }
    if (habitacion._count.asistentes >= habitacion.capacidad) {
      return { tipo: "ERROR", error: "La habitación ya está llena." };
    }

    const asistente = await tx.asistente.findUnique({
      where: { id: asistenteId },
      select: {
        eventoId: true,
        inscripcion: { select: { estado: true } },
        habitaciones: { include: { habitacion: { select: { eventoId: true } } } },
      },
    });
    if (!asistente || asistente.eventoId !== eventoId) {
      return { tipo: "ERROR", error: "El asistente no pertenece a este evento." };
    }
    if (asistente.inscripcion.estado === EstadoInscripcion.CANCELADO) {
      return { tipo: "ERROR", error: "El asistente tiene la inscripción cancelada." };
    }
    const yaTieneCuarto = asistente.habitaciones.some(
      (h) => h.habitacion.eventoId === eventoId
    );
    if (yaTieneCuarto) {
      return { tipo: "ERROR", error: "Ese asistente ya tiene una habitación en este evento." };
    }

    try {
      await tx.asistenteHabitacion.create({ data: { asistenteId, habitacionId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { tipo: "ERROR", error: "Ese asistente ya está asignado a esa habitación." };
      }
      throw error;
    }

    return { tipo: "OK" };
  });

  if (resultado.tipo === "ERROR") {
    return { error: resultado.error };
  }

  revalidatePath(`/admin/eventos/${eventoId}`);
  return undefined;
}

export async function desasignarAsistente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const eventoId = formData.get("eventoId");
  const habitacionId = formData.get("habitacionId");
  const asistenteId = formData.get("asistenteId");
  if (
    typeof eventoId !== "string" || !eventoId ||
    typeof habitacionId !== "string" || !habitacionId ||
    typeof asistenteId !== "string" || !asistenteId
  ) {
    return { error: "Faltan datos de la asignación." };
  }

  await prisma.asistenteHabitacion.delete({
    where: { asistenteId_habitacionId: { asistenteId, habitacionId } },
  });

  revalidatePath(`/admin/eventos/${eventoId}`);
  return undefined;
}