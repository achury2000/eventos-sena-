## Context

El asesor hoy regista asistencia en papel. El schema ya trae `Checkpoint.codigoQr` (token fijo de estación, `uuid()`), `Checkpoint.activo`, `Asistente.documento` y `RegistroControl` con `@@unique([asistenteId, checkpointId])` + `@@index([checkpointId])` y `metodo MetodoRegistro`. La inscripción pública (cambio ya archivado) ya crea `Asistente` con `eventoId` denormalizado y restricción única por evento. No existe autoregistro: ningún código genera el QR, no hay página `/checkpoint/[token]` ni endpoint público de registro. El detalle del evento (`src/app/admin/eventos/[id]/page.tsx`) lista los checkpoints con formularios de alta/edición/eliminación.

## Goals / Non-Goals

**Goals:**
- El Administrador puede imprimir un QR por checkpoint (URL pública `/checkpoint/{codigoQr}`).
- Un asistente registra su propia asistencia escaneando el QR, ingresando solo su documento.
- El registro es atómico y a prueba de duplicados (insertar y capturar P2002).
- Lógica de registro reusable para el dashboard del Operador (cambio `panel-operador`).

**Non-Goals:**
- Activar/desactivar checkpoint (`activo`), tabla `Checkpoint.activadoPorId` y el COUNT agrupado — pertenecen al cambio `panel-operador`.
- Registro manual asistido por el Operador (mismo cambio posterior).
- Rate limiting, captcha o mitigation anti-enumeración del documento (dependencia Upstash/Rafel, fuera de alcance).
- Autenticación de asistentes (no tienen cuenta).

## Decisions

**D1 — Módulo compartido `src/lib/registro-checkpoint.ts`:**
Encapsula toda la lógica de registro en una sola función `registrarAsistenciaEnCheckpoint(checkpoint, documento, opciones)` que recibe el checkpoint ya resuelto y devuelve un `ResultadoRegistro` tipado. Se reutilizará en el endpoint público de este cambio y en el registro manual del dashboard del Operador (`metodo: "MANUAL"`, `operadorId`) del cambio siguiente. Además exporta `ResultadoRegistro = "OK" | "YA_REGISTRADO" | "NO_ENCONTRADO" | "CHECKPOINT_NO_ACTIVO"` como tipo de TypeScript. *Alternativas descartadas:* lógica embebida en el route handler de este cambio (obligaría a duplicarla en el cambio siguiente) y devolver un enum guardado en la base (CONTEXT.md §7 prohíbe la columna "resultado").

**D2 — Resolución del checkpoint (lectura) fuera de la transacción:**
El route handler busca el checkpoint por `codigoQr` y lee `activo` y el `eventoId` ANTES de intentar el registro. Separada de la transacción de escritura: la transacción solo crea `RegistroControl`. Sin sesión y con un solo documento a validar, el costo es mínimo y simplifica el manejo de errores (etapas distintas → espejan los códigos de respuesta del spec).

**D3 — Siempre insertar; P2002 = `YA_REGISTRADO`:**
El registro se intenta con `tx.registroControl.create(...)` dentro de un `try/catch`; si Prisma lanza `P2002` sobre la restricción `@@unique([asistenteId, checkpointId])`, devolver `YA_REGISTRADO`. No hay paso previo de "verificar existencia" (CONTEXT.md §7). En `RegistroControl` no existe ninguna constraint de unicidad sobre documento a nivel de tabla, la restricción es por `asistenteId`: por eso primero se resuelve el `Asistente` por `(eventoId, documento)` — dado que `Asistente` tiene `@@unique([eventoId, documento])`, nunca habrá dos asistentes con el mismo documento en el evento.

**D4 — Ubicación del QR y librería:**
Se añade `qrcode` (generación de imagen) + `@types/qrcode` (dev). El QR se genera como data-URL PNG con `QRCode.toDataURL(URL_BASE + "/checkpoint/" + codigoQr, { width: 256, margin: 1 })` y se incrusta en el detalle del evento en `src/app/admin/eventos/[id]/page.tsx`, en una nueva columna de la tabla de checkpoints existente. *Alternativa descartada:* la librería `qrcode.react` (componente React) también servía, pero `qrcode` basta y es la que se usa si el QR se quisiera una vez desde el servidor.

**D5 — Endpoint en runtime `nodejs`:**
`POST /api/checkpoints/[token]/registro` lleva `export const runtime = "nodejs"` (Edges no soporta Prisma). Estructura del archivo análoga a `src/app/api/inscripciones/route.ts` (helper `error(...)` + `safeParse` de Zod). Schema de validación mínimo: `{ documento: string }` con la misma regla que `inscripcion.ts` (6–12 dígitos). La página pública valida en cliente solo por UX; la autoridad es el servidor.

**D6 — Pagina pública `/checkpoint/[token]`:**
Server component que resuelve el checkpoint por `codigoQr` (incluyendo `evento.nombre`) y define la vista: token inválido → mensaje; `activo === false` → "checkpoint desactivado"; activo → renderiza un formulario cliente que muestra el resultado del POST y permite reintentar con otro documento. *Alternativa considerada:* leer `activo` también en cliente previo al envío; se descarta porque el estado definitivo lo decide el servidor en el momento del POST y duplicar la validación no aporta.

**D7 — URL base dentro de la app:**
La URL que codifica el QR es relativa al entorno (`/checkpoint/{codigoQr}`), no absoluta; el QR impreso se escanea desde un celular, por lo que la imagen debe contener una URL absoluta resoluble desde cualquier red. Se usa una const `URL_PUBLICA` configurada por entorno (variable de entorno `NEXT_PUBLIC_URL`, con fallback a `http://localhost:3000`).

## Risks / Trade-offs

- **Enumeración de documentos:** el endpoint es público y el asistente puede probar documentos ajenos, sabiendo si están inscritos → **Mitigación:** fuera de alcance (rate limiting planificado como cambio separado); el endpoint no expone datos personales, solo "registrado/no encontrado". Documentado en proposal.md.
- **QR impreso reutilizado fuera de la estación:** un QR pertenece a una sola estación (token único por checkpoint) → **Mitigación:** mitigación definitiva es el toggle `activo` del Operador (cambio `panel-operador`); el token fijo por estación ya limita el alcance.
- **Contexto de ejecución de la generación del QR:** codificar a data-URL en el render del server component es síncrono y pesado solo al imprimir → **Mitigación:** se genera en el server component (no en cliente) para que la página del admin siga siendo server-rendered.
- **Coherencia entre página pública y POST en estado `activo`:** un checkpoint puede apagarse entre la carga de la página y el envío → **Mitigación:** el servidor revalida `activo` dentro del POST (D2/D5); la página solo refleja el estado inicial.

## Migration Plan

Sin migración de base de datos: solo dependencias nuevas (`qrcode`, `@types/qrcode`) y código. Despliegue junto con la rama; rollback = revivir la versión anterior (no hay cambio de datos ni de contrato de base).

## Open Questions

Ninguna que cambie speccs, enfoque o descomposición de tareas.