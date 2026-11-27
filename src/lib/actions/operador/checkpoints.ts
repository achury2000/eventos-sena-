"use server";

import { revalidatePath } from "next/cache";
import { cambiarEstadoCheckpointDeEvento } from "@/lib/operador/checkpoints";
import { requireOperador } from "./guard";
import type { ActionState } from "@/lib/actions/admin/types";

// Activa o desactiva un checkpoint del evento asignado al Operador. Recibe el
// estado objetivo (no lo invierte en el servidor) para que la operación sea
// idempotente aunque el sondeo haya refrescado el tablero justo antes del
// clic. El campo `activadoPorId` siempre refleja al último Operador que cambió
// el estado (CONTEXT.md §5).
export async function cambiarEstadoCheckpoint(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOperador();

  const checkpointId = formData.get("checkpointId");
  const activoRaw = formData.get("activo");
  if (typeof checkpointId !== "string" || checkpointId.length === 0) {
    return { error: "Checkpoint no identificado." };
  }
  if (activoRaw !== "true" && activoRaw !== "false") {
    return { error: "Estado de checkpoint inválido." };
  }

  const resultado = await cambiarEstadoCheckpointDeEvento(
    checkpointId,
    session.user.id,
    activoRaw === "true",
  );
  if (!resultado.ok) {
    return { error: resultado.error };
  }

  revalidatePath("/operador");
  return undefined;
}
