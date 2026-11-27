# Proposal

## Why

Un Administrador que crea o administra un evento no tiene ninguna manera de
conocer o compartir la URL pública por la que los funcionarios se inscriben
(`/inscripcion/[eventoId]`). La ruta existe y funciona, pero es invisible para
el equipo que debe difundirla. Sin este cambio, cada evento requiere saber la
URL "de memoria" o construirla a mano.

## What Changes

- Mostrar en `/admin/eventos/[id]` el enlace público de inscripción completo
  del evento (`{NEXT_PUBLIC_URL}/inscripcion/{id}`), calculado en el servidor
  igual que ya se hace para los QR de checkpoints.
- Agregar un botón "Copiar" junto al enlace que copia la URL al portapapeles
  con feedback visual nativo, sin dependencias.
- Agregar un código QR del enlace de inscripción, reutilizando el patrón que ya
  usan los checkpoints (generación en servidor con `qrcode`, ya presente en el
  repo), útil para imprimir o proyectar.
- Sin cambios de schema, sin cambios en la ruta pública ni en la lógica de
  inscripción.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `admin/eventos`: el detalle de evento pasa a exponer el enlace público de
  inscripción (ver, copiar y QR) para que el Administrador pueda difundirlo.

## Impact

- Código:
  - `src/app/admin/eventos/[id]/page.tsx` (server component): construir la URL
    de inscripción y el QR con `qrcode` (dependencia ya existente).
  - Componente cliente nuevo para el botón "Copiar" (p. ej.
    `src/app/admin/eventos/[id]/boton-copiar.tsx`), con `useState` para el
    feedback y `navigator.clipboard`.
- Configuración: usa `NEXT_PUBLIC_URL` ya declarado en `.env`/`.env.example`.
- Sin dependencias nuevas, sin migraciones, sin cambios de API.