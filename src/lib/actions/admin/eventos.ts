"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, EstadoEvento } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { estadosSiguientes, eventoSchema } from "@/lib/validations/admin";
import { requireAdmin } from "./guard";
import { fieldErrors, type ActionState } from "./types";

function leerCampoEvento(formData: FormData) {
  // El control Sí/No del formulario es una decisión de interfaz, no un dato
  // (design.md, D2 y D11). El entero se deriva AQUÍ, en el servidor, y no se
  // confía en el valor que mande el cliente:
  //   - "No" produce siempre 0 y descarta cualquier número que venga en el
  //     FormData.
  //   - "Sí" usa el número tal cual; el esquema rechaza que sea 0 o que no
  //     sea un número, así que un `0` inyectado a mano no prospera.
  // El radio se pasa EN CRUDO, sin convertir a booleano, porque un grupo de
  // radio sin ninguna opción marcada no envía el campo. Si lo defaulted a
  // `false` aquí, una petición con el radio ausente se guardaría en silencio
  // como inscripción individual: el mismo fallo invisible que D5 evita en el
  // campo numérico, solo que más difícil de detectar porque el formulario
  // ni siquiera lo muestra. El esquema exige un valor explícito.
  const eleccionAcompanantes = formData.get("permiteAcompanantes");
  const permiteAcompanantes = eleccionAcompanantes === "si";
  const numeroAcompanantes = formData.get("maxAcompanantes");

  return {
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    lugar: formData.get("lugar"),
    fechaInicio: formData.get("fechaInicio"),
    fechaFin: formData.get("fechaFin"),
    inscripcionApertura: formData.get("inscripcionApertura"),
    inscripcionCierre: formData.get("inscripcionCierre"),
    cupoMaximo: formData.get("cupoMaximo"),
    eleccionAcompanantes,
    maxAcompanantes: permiteAcompanantes ? numeroAcompanantes : "0",
    incluyeHotel: formData.get("incluyeHotel") === "on",
    incluyeBus: formData.get("incluyeBus") === "on",
  };
}

export async function crearEvento(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = eventoSchema.safeParse(leerCampoEvento(formData));
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues) };
  }

  const {
    nombre,
    descripcion,
    lugar,
    fechaInicio,
    fechaFin,
    inscripcionApertura,
    inscripcionCierre,
    cupoMaximo,
    maxAcompanantes,
    incluyeHotel,
    incluyeBus,
  } = parsed.data;

  await prisma.evento.create({
    data: {
      nombre,
      descripcion,
      lugar,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      inscripcionApertura: new Date(inscripcionApertura),
      inscripcionCierre: new Date(inscripcionCierre),
      cupoMaximo,
      maxAcompanantes,
      incluyeHotel,
      incluyeBus,
      estado: EstadoEvento.PLANEADO,
      creadoPorId: (await requireAdmin()).user.id,
    },
  });

  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}

export async function editarEvento(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Evento no identificado." };
  }

  const parsed = eventoSchema.safeParse(leerCampoEvento(formData));
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues) };
  }

  const {
    nombre,
    descripcion,
    lugar,
    fechaInicio,
    fechaFin,
    inscripcionApertura,
    inscripcionCierre,
    cupoMaximo,
    maxAcompanantes,
    incluyeHotel,
    incluyeBus,
  } = parsed.data;

  await prisma.evento.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      lugar,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      inscripcionApertura: new Date(inscripcionApertura),
      inscripcionCierre: new Date(inscripcionCierre),
      cupoMaximo,
      maxAcompanantes,
      incluyeHotel,
      incluyeBus,
    },
  });

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  redirect(`/admin/eventos/${id}`);
}

export async function cambiarEstadoEvento(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const estadoNuevo = formData.get("estadoNuevo");
  if (typeof id !== "string" || !id || typeof estadoNuevo !== "string") {
    return { error: "Evento no identificado." };
  }

  const evento = await prisma.evento.findUnique({ where: { id }, select: { estado: true } });
  if (!evento) {
    return { error: "El evento no existe." };
  }

  if (!estadosSiguientes(evento.estado).includes(estadoNuevo as EstadoEvento)) {
    return { error: "Transición de estado no permitida." };
  }

  await prisma.evento.update({
    where: { id },
    data: { estado: estadoNuevo as EstadoEvento },
  });

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  redirect(`/admin/eventos/${id}`);
}

export async function eliminarEvento(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Evento no identificado." };
  }

  try {
    await prisma.evento.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        error:
          "No se puede eliminar: el evento tiene inscripciones o asistentes. Cancélalo en su lugar.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}