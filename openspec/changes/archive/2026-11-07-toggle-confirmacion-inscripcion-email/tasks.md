# Tasks

## 1. Implementación

- [x] 1.1 Leer flag `HABILITAR_CONFIRMACION_EVENTO` en `src/lib/email.ts`
      (case-insensitive: `true`, `1`, `yes`, `on`). Valor por defecto `false`.
- [x] 1.2 Aplicar gate en `programarConfirmacionInscripcion(datos)`: si el flag
      no es verdadero, no registrar `after()` ni llamar al envío. Log
      informativo una sola vez por proceso.
- [x] 1.3 No emitir el aviso de credenciales incompletas cuando está
      deshabilitada.
- [x] 1.4 Mantener el comportamiento existente cuando está habilitada.

## 2. Configuración

- [x] 2.1 Añadir `HABILITAR_CONFIRMACION_EVENTO=false` a `.env.example` con
      comentario explicativo.

## 3. Pruebas

- [x] 3.1 Añadir suite en `tests/integration/email.test.ts` para el flag:
      ausente/falsa no programa ni envía; verdadera (y equivalentes) programa y
      aplica credenciales; no emite aviso de credenciales cuando está
      deshabilitada.

## 4. Verificación

- [x] 4.1 `npm run lint`
- [x] 4.2 `npx tsc --noEmit`
- [x] 4.3 `npm test` (35/35)
- [x] 4.4 `openspec validate --specs --strict` (14/14)
