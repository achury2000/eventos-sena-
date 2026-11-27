import { z } from "zod";
import { EstadoEvento, TipoAfiliacion, TipoCheckpoint } from "@/generated/prisma/client";
import { MAX_ACOMPANANTES_TECNICO } from "@/lib/limites";

export const NACIONALIDAD_DOCUMENTO = /^\d{6,12}$/;

const centroFormacion = z
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

// Schema de creación de usuarios de la plataforma (OPERADOR o ADMINISTRADOR).
// El `rol` se restringe al par de roles que la app gestiona desde la sección
// Cuentas; el valor se envía desde el formulario y se re-valida aquí para que un
// cliente manipulado no pueda inyectar un rol distinto al que la UI ofrece.
// Se conserva el alias `operadorSchema` por compatibilidad de imports históricos.
// El centro de formación es texto libre y solo es obligatorio para
// ADMINISTRADOR: los Administradores son personal del SENA, mientras que un
// Operador puede ser externo (change centro-formacion-texto-libre, D3).
export const usuarioSchema = z
  .object({
    rol: z.enum(["OPERADOR", "ADMINISTRADOR"]),
    nombreCompleto: z.string().trim().min(3).max(150, "Máximo 150 caracteres"),
    documento: z
      .string()
      .regex(NACIONALIDAD_DOCUMENTO, "El documento debe tener entre 6 y 12 dígitos"),
    email: z.string().trim().email("Correo inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    tipoAfiliacion: z.nativeEnum(TipoAfiliacion, {
      message: "Selecciona el tipo de afiliación",
    }),
    centroFormacion,
  })
  .superRefine((datos, ctx) => {
    if (datos.rol === "ADMINISTRADOR" && !datos.centroFormacion) {
      ctx.addIssue({
        code: "custom",
        path: ["centroFormacion"],
        message: "El centro de formación es obligatorio para un Administrador",
      });
    }
  });

export const operadorSchema = usuarioSchema;

const fechaISO = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida");

export const eventoSchema = z
  .object({
    nombre: z.string().trim().min(3).max(150, "Máximo 150 caracteres"),
    descripcion: z.string().trim().max(500).optional(),
    lugar: z.string().trim().min(3).max(150, "Máximo 150 caracteres"),
    fechaInicio: fechaISO,
    fechaFin: fechaISO,
    inscripcionApertura: fechaISO,
    inscripcionCierre: fechaISO,
    cupoMaximo: z.coerce.number().int().min(1, "El cupo debe ser al menos 1"),
    // Solo se usa para validar los invariantes del control Sí/No; NO se
    // persiste. Se mantiene en crudo ("si" | "no") a propósito: un grupo de
    // radio sin opción marcada no envía el campo, y defaulting a `false` en el
    // servidor guardaría el evento en silencio como inscripción individual.
    // Ver design.md, decisión D11.
    eleccionAcompanantes: z.enum(["si", "no"], {
      message: "Indica si el evento permite acompañantes",
    }),
    // `z.coerce.number()` convierte la cadena vacía en `0` (Number("") === 0), y
    // como `0` es un valor VÁLIDO bajo `.min(0)`, un subcampo en blanco
    // pasaría la validación y configuraría el evento en silencio como
    // "inscripción individual" -- el peor modo de fallo posible, porque es
    // invisible y contradice la intención del default. Normalizar el vacío a
    // `undefined` hace que Zod lo rechace. Este `preprocess` sigue siendo
    // necesario aunque el formulario use un control Sí/No: con la respuesta
    // "Sí" el subcampo numérico existe y se puede dejar vacío.
    // Ver design.md, decisiones D5 y D11.
    maxAcompanantes: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.coerce
        .number({ message: "El máximo de acompañantes debe ser un número" })
        .int("El máximo de acompañantes debe ser un número entero")
        .min(0, "El máximo de acompañantes no puede ser negativo")
        .max(
          MAX_ACOMPANANTES_TECNICO,
          `El máximo de acompañantes no puede superar ${MAX_ACOMPANANTES_TECNICO}`
        )
    ),
    incluyeHotel: z.boolean(),
    incluyeBus: z.boolean(),
  })
  .refine((d) => Date.parse(d.fechaInicio) < Date.parse(d.fechaFin), {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["fechaFin"],
  })
  .refine(
    (d) => Date.parse(d.inscripcionApertura) < Date.parse(d.inscripcionCierre),
    {
      message: "El cierre de inscripciones debe ser posterior a la apertura",
      path: ["inscripcionCierre"],
    }
  )
  // Un grupo completo (titular + acompañantes) no puede ser más grande que el
  // propio evento: configurar 10 acompañantes en un evento de cupo 2 es una
  // incoherencia de configuración que conviene rechazar en el alta.
  .refine((d) => d.maxAcompanantes + 1 <= d.cupoMaximo, {
    message:
      "El máximo de acompañantes no puede superar el cupo del evento menos el titular",
    path: ["maxAcompanantes"],
  })
  // El control Sí/No nunca produce "Sí" con 0: si se respondió Sí, el campo
  // numérico estuvo visible y debe traer al menos 1. Rechaza también el `0`
  // inyectado a mano por un cliente que envíe el radio en "Sí" con el número
  // en 0 -- una configuración que el formulario no puede generar.
  .refine((d) => d.eleccionAcompanantes !== "si" || d.maxAcompanantes >= 1, {
    message:
      "Si el evento permite acompañantes, indica al menos 1; usa la opción 'No' si es de inscripción individual",
    path: ["maxAcompanantes"],
  });

export const checkpointSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "Máximo 120 caracteres"),
  tipo: z.nativeEnum(TipoCheckpoint, { message: "Selecciona la categoría" }),
});

export const habitacionSchema = z.object({
  identificador: z
    .string()
    .trim()
    .min(1, "El identificador es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  capacidad: z.coerce
    .number()
    .int("La capacidad debe ser un número entero")
    .min(1, "La capacidad debe ser al menos 1"),
});

// Tabla de transiciones de estado permitidas. Un evento CANCELADO no cambia
// de estado; cancelar es siempre un UPDATE, nunca un DELETE (CONTEXT.md §4).
export function estadosSiguientes(actual: EstadoEvento): EstadoEvento[] {
  switch (actual) {
    case EstadoEvento.PLANEADO:
      return [EstadoEvento.INSCRIPCIONES_ABIERTAS, EstadoEvento.CANCELADO];
    case EstadoEvento.INSCRIPCIONES_ABIERTAS:
      return [EstadoEvento.CERRADO, EstadoEvento.CANCELADO];
    case EstadoEvento.CERRADO:
      return [EstadoEvento.FINALIZADO, EstadoEvento.CANCELADO];
    case EstadoEvento.FINALIZADO:
      return [EstadoEvento.CANCELADO];
    case EstadoEvento.CANCELADO:
      return [];
  }
}