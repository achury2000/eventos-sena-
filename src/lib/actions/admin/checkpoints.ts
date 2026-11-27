"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkpointSchema } from "@/lib/validations/admin";
import { requireAdmin } from "./guard";
import { fieldErrors, type ActionState } from "./types";

async function leerCheckpoint(formData: FormData) {
  const eventoId = formData.get("eventoId");
  if (typeof eventoId !== "string" || !eventoId) {
    return { eventoId: null, checkpoint: null };
  }
  const parsed = checkpointSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
  });
  return { eventoId, parsed };
}

export async function crearCheckpoint(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const { eventoId, parsed } = await leerCheckpoint(formData);
  if (!eventoId || !parsed) {
    return { error: "Evento no identificado." };
  }
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues) };
  }

  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) {
    return { error: "El evento no existe." };
  }

  await prisma.checkpoint.create({
    data: {
      eventoId,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
    },
  });

  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}`);
}

export async function editarCheckpoint(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const eventoId = formData.get("eventoId");
  if (typeof id !== "string" || !id || typeof eventoId !== "string" || !eventoId) {
    return { error: "Checkpoint no identificado." };
  }

  const parsed = checkpointSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
  });
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues) };
  }

  await prisma.checkpoint.update({
    where: { id },
    data: { nombre: parsed.data.nombre, tipo: parsed.data.tipo },
  });

  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}`);
}

export async function eliminarCheckpoint(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const eventoId = formData.get("eventoId");
  if (typeof id !== "string" || !id || typeof eventoId !== "string" || !eventoId) {
    return { error: "Checkpoint no identificado." };
  }

  await prisma.checkpoint.delete({ where: { id } });

  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}`);
}