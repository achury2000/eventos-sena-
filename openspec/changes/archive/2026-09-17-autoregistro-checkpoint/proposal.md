## Why

El día del evento, la asistencia en cada punto (comidas, transporte, hotel) se controla con checkpoints físicos que hoy no tienen soporte digital. El modelo de datos ya define `Checkpoint.codigoQr` (token fijo de estación), `Checkpoint.activo` y `RegistroControl` con su restricción única e índice, pero no existe ni la imagen QR ni el autoregistro por documento que describe CONTEXT.md §3/§6 — sin esa pieza, el Operador no tiene datos de asistencia que supervisar en su panel (módulo `panel-operador`, cambio posterior).

## What Changes

- **Imagen QR por checkpoint**: generar con la librería `qrcode` una imagen que codifica la URL pública `/checkpoint/{codigoQr}`, y mostrarla al Administrador en el detalle del evento para que la imprima por estación.
- **Módulo compartido de registro** `src/lib/registro-checkpoint.ts`: encapsula la lógica de registrar a un asistente en un checkpoint (validar `activo`, resolver por documento, insertar `RegistroControl` capturando el duplicado `P2002`). Expone el tipo de resultado `ResultadoRegistro = "OK" | "YA_REGISTRADO" | "NO_ENCONTRADO" | "CHECKPOINT_NO_ACTIVO"` como tipo de TypeScript de la capa de API — **nunca** como columna/enum en la base de datos (CONTEXT.md §4/§7).
- **Página pública `/checkpoint/[token]`**: formulario que pide **únicamente** el documento de identidad (sin nombre, sin sesión), siguiendo la decisión de diseño de CONTEXT.md §4.
- **Route Handler `POST /api/checkpoints/[token]/registro`** (runtime `nodejs`): autoregistro por QR, validando que el checkpoint exista y esté `activo`, y que el documento pertenezca a un asistente inscrito en ese evento. Rechaza el mismo documento dos veces en el mismo checkpoint (restricción única ↔ `YA_REGISTRADO`).

## Capabilities

### New Capabilities
- `autoregistro-checkpoint`: autoregistro de asistencia por QR de estación — generación y visualización del QR, página pública `/checkpoint/[token]` con captura del documento, y registro atómico por checkpoint con manejo de duplicados.

### Modified Capabilities
<!-- Ninguna capability existente cambia sus requisitos. -->

## Impact

- **Código:** nueva ruta pública `src/app/checkpoint/[token]/`, nuevo route handler en `src/app/api/checkpoints/[token]/registro/`, nuevo módulo `src/lib/registro-checkpoint.ts`, y modificación del detalle del evento en `src/app/admin/eventos/[id]/page.tsx` para mostrar el QR.
- **Dependencias nuevas:** `qrcode` (generación de imagen) y `@types/qrcode` (dev).
- **Base de datos:** sin migración; usa las entidades `Checkpoint` y `RegistroControl` existentes.
- **Seguridad:** el endpoint de autoregistro es público (sin auth, por diseño — los asistentes no tienen cuenta). No requiere cambios de schema. La protección contra abuso/enumeración (rate limiting, sección 7 de CONTEXT.md) queda fuera de alcance y se aborda en un cambio separado.
- **Fuera de alcance:** activación/desactivación de checkpoint, dashboard del Operador, registro manual asistido (cambio `panel-operador`, rama propia), rate limiting, headers de seguridad.