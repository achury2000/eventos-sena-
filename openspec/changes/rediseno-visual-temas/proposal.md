# Proposal

## Why

La interfaz usa hoy el mismo verde institucional (`#25A200`) para la marca y para acciones, lo que deja varios textos e interacciones por debajo del contraste AA. Además, el modo oscuro existe solo como un bloque CSS sin activación, sin preferencia persistida y con un `--primary` casi blanco que no representa la identidad SENA. Esto hace que la experiencia no sea consistente ni accesible al cambiar de tema.

## What Changes

- Introducir un sistema de temas **Claro / Oscuro / Sistema** sin dependencias nuevas, con persistencia en `localStorage` y aplicación antes del primer pintado.
- Separar los tokens de **marca** (`#25A200`, franja institucional) de los tokens de **acción** (`#1B7A00` en claro y `#7FD65B` en oscuro).
- Centralizar en `globals.css` los colores de superficies, texto, bordes, foco, estados y gráficos para ambos temas.
- Actualizar las primitivas `Button`, `Input` y `Label` para consumir los tokens y mantener foco, hover y estados inválidos consistentes.
- Mantener intactos la franja `#25A200`, el logo institucional, los textos accesibles y las estructuras que usan las pruebas E2E.
- **No** modificar contadores del dashboard, lógica de negocio, validaciones, APIs ni flujos funcionales.

## Capabilities

### New Capabilities

- `plataforma/temas`: preferencia de tema Claro/Oscuro/Sistema, persistencia, aplicación sin parpadeo y contrato de tokens visuales de marca y acción.

### Modified Capabilities

<!-- Ninguna capacidad existente cambia su comportamiento funcional en esta etapa. -->

## Impact

- `src/app/globals.css`: tokens de ambos temas y variante `dark` basada en `data-theme`.
- `src/app/layout.tsx`: atributo de tema, `suppressHydrationWarning` y script inline previo al pintado.
- `src/lib/tema.ts`: constantes, tipos y utilidades compartidas del tema.
- `src/components/tema/`: proveedor y selector de tema.
- `src/components/shared/franja-institucional.tsx`: franja con token de marca y selector.
- `src/components/ui/{button,input,label}.tsx`: primitivas alineadas a los tokens.
- Sin dependencias nuevas, sin cambios de esquema, APIs ni pruebas E2E.
