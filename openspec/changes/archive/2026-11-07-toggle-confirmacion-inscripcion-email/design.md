# Design

## Context

La confirmación por correo tras una inscripción exitosa es un efecto secundario
(best-effort, design.md archivado D2/D4). El SENA no va a contratar un servicio
de correo, así que el tutor pidió que el envío solo se active desde una variable
de entorno (p. ej. `HABILITAR_CONFIRMACION_EVENTO=true`), sin alterar el flujo
de negocio: la inscripción debe seguir siendo exitosa.

## Decision

**D1: Gate en el módulo (no en el route)**
- El interruptor vive en `programarConfirmacionInscripcion(datos)` en
  `src/lib/email.ts`. Es el único punto que invoca el route
  (`POST /api/inscripciones`), encapsula la política de activación y deja los
  tests del transporte (`email.test.ts`) intactos.

**D2: Variable y parsing**
- `HABILITAR_CONFIRMACION_EVENTO`, case-insensitive. Verdadero solo para
  `true`, `1`, `yes`, `on` (trim + lowercase). Cualquier otro valor o ausencia →
  falso. Por defecto `false` (seguro ante la restricción del SENA).

**D3: Comportamiento deshabilitado**
- No se registra `after()` ni se llama al envío.
- Un único log **informativo** por proceso (`console.info`): es una
  configuración intencional, no un error.
- No se emite el aviso de credenciales incompletas (evita doble logging).

**D4: Comportamiento habilitado**
- Se conserva el comportamiento existente: `after()` tras la respuesta, falla
  abierta si faltan credenciales, ningún error se propaga al route.

**D5: Tests**
- Los tests del flag viven en `tests/integration/email.test.ts` (módulo real,
  mockeando `next/server.after` y el SDK de Resend): deshabilitada (ausente /
  falsa) no programa, no envía y no emite el aviso de credenciales; habilitada
  programa y aplica credenciales.
- `tests/integration/inscripcion-email.test.ts` mockea `@/lib/email` completo,
  así que no cambia: prueba CUÁNDO el route lo invoca, no el flag interno.

## Rationale

- Default `false` cumple la instrucción del tutor y protege contra envíos
  accidentales sin servicio contratado.
- El gate en el módulo mantiene el aislamiento del proveedor ya existente.
- No se toca el transporte: reduce el riesgo de regresión.

## Risks & Mitigations

- **Confundir "credenciales incompletas" con "deshabilitado"**: mensajes
  distintos y niveles distintos (info vs warn).
- **Afectar otros correos futuros**: el nombre del flag es específico
  (`HABILITAR_CONFIRMACION_EVENTO`).

## Non-Goals

- Cambiar proveedor o diseño del correo.
- Reintentos/colas.
- La Parte B (invitaciones con token), descartada por ahora.
