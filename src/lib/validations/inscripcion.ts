import { z } from "zod";
import { EstadoEvento } from "@/generated/prisma/client";
import { MAX_ACOMPANANTES_TECNICO } from "@/lib/limites";

// Patrón de CONTEXT.md §7. Módulo de servidor: NO se importa desde
// componentes de cliente (usa el runtime generado de Prisma).

// Centro de formación opcional: la persona lo escribe como texto libre, sin
// catálogo ni lista cerrada. La cadena vacía u omisión equivale a "sin centro".
// Ver change centro-formacion-texto-libre, decisiones D1 y D4.
const centroOpcional = z
  .union([
    z
      .string()
      .trim()
      .min(3, "El centro de formación debe tener al menos 3 caracteres")
      .max(200, "Máximo 200 caracteres"),
    z.literal(""),
  ])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : v));

export const esquemaAsistente = z.object({
  nombreCompleto: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(150, "Máximo 150 caracteres"),
  documento: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "El documento debe tener entre 6 y 12 dígitos"),
  centroFormacion: centroOpcional,
});

const correoOpcional = z
  .union([z.string().trim().email("Correo inválido"), z.literal("")])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : v));

export const esquemaInscripcion = z.object({
  eventoId: z.string().uuid("Evento inválido"),
  titular: esquemaAsistente,
  // Este `.max()` es la guarda ESTRUCTURAL del array (sizing, tamaño de la
  // petición): debe seguir aplicando antes de tocar la base de datos, y por eso
  // se queda en el techo técnico y NO recibe el valor del evento. La regla de
  // negocio --el máximo configurado en cada evento-- se valida después, en el
  // route handler, con su propio mensaje. Son dos capas con propósitos
  // distintos, no una duplicación. Ver design.md, decisión D10.
  acompanantes: z
    .array(esquemaAsistente)
    .max(
      MAX_ACOMPANANTES_TECNICO,
      `Máximo ${MAX_ACOMPANANTES_TECNICO} acompañantes`
    ),
  correo: correoOpcional,
  firmaBase64: z
    .string()
    .startsWith("data:image/png;base64,", "Formato de firma inválido")
    .min(64, "Debes firmar antes de enviar")
    .max(400_000, "La firma es demasiado grande"),
  aceptoTratamientoDatos: z.literal(true, {
    message: "Debes aceptar el tratamiento de datos",
  }),
});

export type DatosInscripcion = z.infer<typeof esquemaInscripcion>;

export type EstadoValidacionInscripcion =
  | { ok: true }
  | { ok: false; razon: "NO_ENCONTRADO" | "NO_ABIERTAS" | "FUERA_PERIODO" };

export function validarEventoParaInscripcion(evento: {
  estado: EstadoEvento;
  inscripcionApertura: Date;
  inscripcionCierre: Date;
}): EstadoValidacionInscripcion {
  if (evento.estado !== EstadoEvento.INSCRIPCIONES_ABIERTAS) {
    return { ok: false, razon: "NO_ABIERTAS" };
  }
  const ahora = new Date();
  if (ahora < evento.inscripcionApertura || ahora > evento.inscripcionCierre) {
    return { ok: false, razon: "FUERA_PERIODO" };
  }
  return { ok: true };
}