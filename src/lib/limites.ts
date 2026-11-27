// Módulo hoja: sin imports, para poder importarse desde cualquier runtime
// (componentes cliente, esquemas Zod de servidor, actions) sin arrastrar
// dependencias -- en particular sin el runtime generado de Prisma, que sí
// importa `lib/validations/inscripcion.ts`. Ver design.md, decisión D4.

// Techo técnico absoluto del número de acompañantes por inscripción.
// No es la política de ningún evento: es el máximo que el sistema acepta
// configurar, y sirve de guarda estructural del array `acompanantes` antes de
// tocar la base de datos. Cumple dos funciones:
//   1. Impide que una errata de configuración (9999) dispare el tamaño del
//      array o de la petición.
//   2. Evita tener que diseñar la experiencia de alguien llenando 150
//      formularios de acompañante en un celular. `Evento.cupoMaximo` ya impide
//      que ese grupo se materialice; el techo protege el caso en que sí cabe.
// Ningún valor de `Evento.maxAcompanantes` significa "sin límite": el mayor
// valor posible es este.
export const MAX_ACOMPANANTES_TECNICO = 10;

// Valor por defecto de `Evento.maxAcompanantes` ante ausencia de configuración.
// El formulario de evento lo hace explícito y obligatorio, así que el
// Administrador siempre decide; este default solo actúa como red de seguridad
// para filas creadas por migración. Cubre el caso familiar típico (titular,
// cónyuge e hijos) sin ser permisivo.
export const MAX_ACOMPANANTES_POR_DEFECTO = 3;
