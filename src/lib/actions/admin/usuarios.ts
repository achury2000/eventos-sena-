"use server";

import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, RolUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { usuarioSchema } from "@/lib/validations/admin";
import { requireAdmin } from "./guard";
import { fieldErrors, type ActionState } from "./types";

// Agrupa la gestión de usuarios de la plataforma (roles OPERADOR y
// ADMINISTRADOR) desde la sección Cuentas del panel. Reemplaza a
// crearOperador/eliminarOperador: el rol llega en el form y se valida en el
// servidor, nunca se infiere del nombre de la acción (CONTEXT.md §6).

export async function crearUsuario(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = usuarioSchema.safeParse({
    rol: formData.get("rol"),
    nombreCompleto: formData.get("nombreCompleto"),
    documento: formData.get("documento"),
    email: formData.get("email"),
    password: formData.get("password"),
    tipoAfiliacion: formData.get("tipoAfiliacion"),
    centroFormacion: formData.get("centroFormacion"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues) };
  }

  try {
    await prisma.usuario.create({
      data: {
        // usuarioSchema restringe `rol` a OPERADOR|ADMINISTRADOR; el cast es
        // solo para satisfacer el tipo del enum de Prisma con el mismo set.
        rol: parsed.data.rol as RolUsuario,
        nombreCompleto: parsed.data.nombreCompleto,
        documento: parsed.data.documento,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 10),
        tipoAfiliacion: parsed.data.tipoAfiliacion,
        centroFormacion: parsed.data.centroFormacion ?? null,
      },
    });
  } catch (error) {
    // Duck-typing por `code`: PrismaClientKnownRequestError viaja entre
    // instancias del paquete @prisma/client y el adapter, donde instanceof
    // puede fallar (Prisma 7 + PrismaPg). El campo `code` es estable.
    const known = error as {
      code?: string;
      meta?: {
        target?: unknown;
        driverAdapterError?: {
          cause?: { constraint?: { index?: string } };
          constraint?: { index?: string };
        };
      };
    };
    if (known?.code === "P2002") {
      // El identificador del campo único llega en formatos distintos según el
      // adapter: con el driver clásico como ["email"] o "usuarios_email_key"
      // (en meta.target), y con el driverAdapter (Prisma 7 + PrismaPg) como el
      // nombre del constraint en meta.driverAdapterError.cause.constraint.index
      // (y algunas versiones lo exponen también en ...driverAdapterError.constraint.index).
      // Se normaliza y se busca la subcadena "email"/"documento".
      const target = known.meta?.target as string | string[] | undefined;
      const indice =
        known.meta?.driverAdapterError?.cause?.constraint?.index ??
        known.meta?.driverAdapterError?.constraint?.index;
      const texto =
        [Array.isArray(target) ? target.join(" ") : (target ?? ""), (indice ?? "")]
          .join(" ")
          .toLowerCase();
      if (texto.includes("email")) {
        return { error: "Ya existe una cuenta con ese correo." };
      }
      if (texto.includes("documento")) {
        return { error: "Ya existe una cuenta con ese documento." };
      }
    }
    throw error;
  }

  // Regresa al listado en la pestaña del rol creado, para que el nuevo usuario
  // sea visible de inmediato (spec: "regresa al listado mostrando el nuevo
  // usuario"). El rol ya fue validado por usuarioSchema.
  revalidatePath("/admin/cuentas");
  redirect(`/admin/cuentas?rol=${parsed.data.rol}`);
}
// "último admin" del resto de errores que propagan hacia arriba.
const ULTIMO_ADMIN = "NO_SE_PUEDE_ELIMINAR_EL_ULTIMO_ADMINISTRADOR";

export async function eliminarUsuario(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();

  const id = formData.get("id");
  const rol = formData.get("rol");
  if (typeof id !== "string" || !id) {
    return { error: "Usuario no identificado." };
  }
  if (rol !== RolUsuario.OPERADOR && rol !== RolUsuario.ADMINISTRADOR) {
    return { error: "Sección de gestión no válida." };
  }

  // El rol del formulario es solo una pista de la pestaña desde la que se
  // invocó; la verificación real es contra la BD: un id manipulado no puede
  // eliminar un usuario de rol distinto al gestionado en esa sección.
  const objetivo = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, rol: true },
  });
  if (!objetivo) {
    return { error: "El usuario no existe." };
  }
  if (objetivo.rol !== rol) {
    return { error: "La cuenta no pertenece a esta sección." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (objetivo.rol === RolUsuario.ADMINISTRADOR) {
          if (objetivo.id === session.user.id) {
            throw new Error("NO_SE_PUEDE_AUTO_ELIMINAR");
          }
          const admins = await tx.usuario.count({
            where: { rol: RolUsuario.ADMINISTRADOR },
          });
          if (admins <= 1) {
            throw new Error(ULTIMO_ADMIN);
          }
        }
        await tx.usuario.delete({ where: { id: objetivo.id } });
      },
      // Serializable para que dos eliminaciones simultáneas no dejen cero
      // Administradores (write skew): si ambas cuentan y borran, una aborta
      // con serialization failure en Postgres y se reintenta el conteo.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "NO_SE_PUEDE_AUTO_ELIMINAR") {
      return { error: "No puedes eliminar tu propia cuenta." };
    }
    if (error instanceof Error && error.message === ULTIMO_ADMIN) {
      return {
        error: "No se puede eliminar la última cuenta de Administrador activa.",
      };
    }
    // Duck-typing por `code` igual que en crearUsuario (ver nota ahí).
    const known = error as { code?: string; meta?: { target?: unknown } };
    if (known?.code === "P2003") {
      return {
        error: "No se puede eliminar: la cuenta tiene eventos creados que la referencian.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/cuentas");
  redirect(`/admin/cuentas?rol=${rol}`);
}

// Alfabeto de la contraseña temporal SIN caracteres ambiguos (0/O/1/l/I): la
// clave se entrega en persona o por teléfono y debe poder leerse sin error.
const ALFABETO_TEMPORAL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LARGO_TEMPORAL = 14;

function generarClaveTemporal(): string {
  let clave = "";
  // randomInt (node:crypto) es uniforme, a diferencia de bytes % longitud.
  for (let i = 0; i < LARGO_TEMPORAL; i++) {
    clave += ALFABETO_TEMPORAL[randomInt(ALFABETO_TEMPORAL.length)];
  }
  return clave;
}

/**
 * Restablece la contraseña de una cuenta de la plataforma desde Cuentas
 * (spec `admin/operadores` y `plataforma/gestion-claves`). Como no hay
 * correo, la contraseña temporal se muestra UNA sola vez en pantalla para
 * que el Administrador la entregue en persona; al mismo tiempo se activa
 * `debeCambiarClave`, de modo que quien entre con ella quede obligado a
 * definir la propia antes de ver su panel.
 */
export async function restablecerClave(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Usuario no identificado." };
  }

  const objetivo = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!objetivo) {
    return { error: "El usuario no existe." };
  }

  const temporal = generarClaveTemporal();
  await prisma.usuario.update({
    where: { id: objetivo.id },
    data: { passwordHash: await hash(temporal, 10), debeCambiarClave: true },
  });

  revalidatePath("/admin/cuentas");
  return {
    ok: "Contraseña restablecida. Entrega la nueva contraseña al usuario de forma segura: es la única vez que se mostrará.",
    temporal,
  };
}