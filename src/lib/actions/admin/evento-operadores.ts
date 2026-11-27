"use server";

import { revalidatePath } from "next/cache";
import { Prisma, RolUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import type { ActionState } from "./types";

export async function asignarOperador(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const eventoId = formData.get("eventoId");
  const operadorId = formData.get("operadorId");
  if (typeof eventoId !== "string" || !eventoId || typeof operadorId !== "string" || !operadorId) {
    return { error: "Faltan datos de la asignación." };
  }

  const operador = await prisma.usuario.findFirst({
    where: { id: operadorId, rol: RolUsuario.OPERADOR },
  });
  if (!operador) {
    return { error: "El Operador seleccionado no existe." };
  }

  try {
    await prisma.eventoOperador.create({ data: { eventoId, operadorId } });
  } catch (error) {
    // P2002: ya está asignado — la operación es idempotente, se ignora.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  revalidatePath(`/admin/eventos/${eventoId}`);
  return undefined;
}

export async function desasignarOperador(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const eventoId = formData.get("eventoId");
  const operadorId = formData.get("operadorId");
  if (typeof eventoId !== "string" || !eventoId || typeof operadorId !== "string" || !operadorId) {
    return { error: "Faltan datos de la asignación." };
  }

  await prisma.eventoOperador.delete({
    where: { eventoId_operadorId: { eventoId, operadorId } },
  });

  revalidatePath(`/admin/eventos/${eventoId}`);
  return undefined;
}