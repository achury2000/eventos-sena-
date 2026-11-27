# Proposal

## Why

El máximo de acompañantes por inscripción (10) está fijado en el código y es
idéntico para todos los eventos, sin ninguna justificación de negocio
documentada. Los eventos del Bienestar al Aprendiz son heterogéneos: un congreso
técnico admite 0-1 acompañante y un paseo familiar admite 5 o más. Además, el
límite actual es permisivo en el extremo: una sola inscripción puede consumir
hasta 11 cupos, y si unas pocas personas se registran temprano pueden agotar
una parte importante del evento antes de que el resto tenga oportunidad.

El `cupoMaximo` por evento ya resuelve la integridad (el `UPDATE` atómico rechaza
grupos que no caben completos), pero no la distribución: no existe ninguna
configuración que permita al Administrador fijar la política de acompañantes de
cada evento según su naturaleza.

## What Changes

- Se agrega `Evento.maxAcompanantes` como configuración por evento, editable por
  el Administrador al crear y al editar el evento, junto a `cupoMaximo`.
- El formulario público de inscripción toma el límite del evento en lugar de una
  constante de código, y lo refleja en el contador y en la ayuda al usuario.
- El valor `0` se convierte en un estado de primera clase: significa
  "inscripción individual, sin acompañantes". La UI oculta la sección de
  acompañantes y lo explica, en vez de mostrar un botón permanentemente
  deshabilitado.
- La validación en servidor rechaza una inscripción que exceda el límite del
  evento **antes** de subir la firma al almacenamiento, y el `UPDATE` atómico de
  cupo incluye además la condición del límite como red de seguridad frente a
  una carrera de configuración.
- Se mantiene un techo técnico absoluto (10) para que el campo nunca pueda
  configurarse como ilimitado ni como un valor disparatado.
- **BREAKING (comportamiento)**: los eventos existentes pasarán a un límite
  efectivo de 3 acompañantes en lugar de 10. El proyecto no tiene datos en
  producción (2 migraciones, uso local), por lo que el impacto es nulo; si se
  quisiera preservar exactamente el comportamiento actual, la migración podría
  fijar el valor inicial de las filas existentes en 10.

## Capabilities

### New Capabilities

Ninguna. El comportamiento encaja en capacidades ya existentes.

### Modified Capabilities

- `admin/eventos`: la creación y la edición de eventos incluyen ahora
  `maxAcompanantes`, con su propia validación (entero entre 0 y el techo técnico,
  y coherente con `cupoMaximo`).
- `inscripcion-publica`: el máximo de acompañantes deja de ser un valor fijo del
  sistema y pasa a ser una política por evento, aplicada en el formulario, en la
  validación del servidor y en la actualización atómica del cupo.

## Impact

- **Base de datos**: nueva columna en `Evento` + una migración
  (`ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT 3`).
- **Validación de dominio**: `src/lib/validations/admin.ts` (esquema de evento) y
  `src/lib/validations/inscripcion.ts` (guarda estructural del techo técnico).
- **API**: `src/app/api/inscripciones/route.ts` (pre-chequeo antes de subir la
  firma, condición adicional en el `UPDATE` atómico y desambiguación de una
  tercera causa de fallo).
- **UI**: `src/app/admin/eventos/form-evento.tsx` (campo nuevo en crear y editar),
  `src/app/inscripcion/[eventoId]/page.tsx` (cargar y pasar el valor) y
  `src/app/inscripcion/[eventoId]/form-inscripcion.tsx` (límite como prop en lugar
  de constante, y ramificación de la UI para el caso `0`).
- **Contratos**: `openspec/specs/admin/eventos/spec.md` y
  `openspec/specs/inscripcion-publica/spec.md`.
- **Documentación**: `CONTEXT.md` (§5 modelo de datos, §7 concurrencia, §11
  notas para IA) y el estado en `CONTRIBUTING.md`.
- **Dependencias**: ninguna nueva. No toca el modelo de `Asistente` ni la
  transacción de cupo existente, solo los agrega una condición.
