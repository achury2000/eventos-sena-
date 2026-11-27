# Design

## Context

Ver `proposal.md` — Why. El estado actual relevante:

- `src/app/globals.css` ya declara tokens shadcn/Tailwind 4, pero `--primary` es `#25A200` y el bloque `.dark` no tiene activador, persistencia ni un `--primary` institucional.
- La franja institucional usa `bg-primary`, así que separar marca y acción exige un token propio para la franja.
- `src/app/layout.tsx` es un Server Component estático; no lee cookies ni base de datos.
- La CSP ya permite `'unsafe-inline'` en `script-src` (`next.config.ts`), por lo que un script inline de tema es compatible sin nonce.
- Las pruebas E2E dependen de textos, roles y estructuras; el tema no debe cambiar el marcado funcional de formularios ni tablas.
- No se agregan dependencias: `next-themes` queda descartado.

## Goals / Non-Goals

**Goals:**

- Aplicar Claro/Oscuro/Sistema antes del primer pintado, con persistencia local.
- Resolver el tema del sistema mientras la app está abierta.
- Centralizar marca, acción, superficies, texto, bordes, foco, estados y gráficos en tokens.
- Mantener la franja `#25A200` y el logo oficial intactos en ambos temas.
- Dejar las primitivas UI listas para que las etapas posteriores solo consuman tokens.

**Non-Goals:**

- Rediseñar páginas completas, layouts o gráficos en esta etapa.
- Corregir contadores del dashboard o cambiar consultas.
- Tocar validaciones, Server Actions, Route Handlers, esquemas o flujos.
- Añadir un proveedor de temas externo o lectura de tema en el servidor.

## Decisions

**D1: Separar marca de acción**

- `--brand: #25A200` y `--brand-foreground: #FFFFFF` se usan solo para la franja institucional y el logo.
- `--primary` pasa a ser el verde de acción: `#1B7A00` en claro y `#7FD65B` en oscuro.
- En claro, blanco sobre `#1B7A00` da ~5.48:1; en oscuro, `#0B2500` sobre `#7FD65B` da ~9.13:1. Ambos superan AA para texto normal.
- Alternativa descartada: seguir usando `#25A200` para botones. Blanco sobre ese verde da ~3.36:1 y no cumple AA para texto normal.

**D2: `data-theme` como fuente de verdad visual**

- El documento usa `data-theme="light" | "dark"` y la variante CSS `dark` se redefine como `@custom-variant dark (&:is([data-theme="dark"] *));`.
- Los tokens viven en `:root` y en `[data-theme="dark"]`; no se duplican páginas ni componentes por tema.
- Alternativa descartada: clase `.dark`. Funciona, pero obliga a mantener dos representaciones (clase y atributo) y no coincide con la guía de Next.js instalada para temas.

**D3: Script inline en `<head>`**

- `layout.tsx` renderiza un script síncrono antes del `<body>` que lee la preferencia, resuelve Sistema con `matchMedia` y fija `data-theme` y `color-scheme` antes del primer pintado.
- `<html>` lleva `suppressHydrationWarning` porque el script cambia un atributo que el servidor renderizó como claro.
- Alternativa descartada: leer una cookie en el servidor. Opta la app fuera de prerenderizado estático y no es necesaria para una preferencia local.
- La CSP actual permite el script inline; no se introduce nonce ni se cambia la configuración de seguridad.

**D4: Estado del tema sin `useEffect` de inicialización**

- Un `ThemeProvider` cliente usa `useSyncExternalStore` para leer la preferencia guardada y la preferencia del sistema. Así el valor del servidor es estable (`system`/claro) y el cliente se sincroniza sin un `setState` inicial en efecto.
- El selector escribe en `localStorage`, emite un evento local para el mismo tab y escucha `storage` para otros tabs; `matchMedia` dispara la resolución cuando la preferencia es Sistema.
- Si `localStorage` falla, se usa un fallback en memoria durante la sesión y se resuelve Sistema; la app nunca se bloquea.
- Alternativa descartada: inicializar estado con `localStorage` en el primer render. Provoca diferencias entre HTML del servidor y cliente en el control de tema.

**D5: Primitivas alineadas a tokens**

- `Button`, `Input` y `Label` consumen `primary`, `primary-hover`, `background`, `border`, `ring`, `destructive` y `muted-foreground`.
- Se conservan variantes, tamaños y API públicas; solo cambian clases visuales. No se toca el comportamiento de `@base-ui/react` ni los formularios.
- Se añade `--primary-hover` para no repetir cálculos de color en cada primitiva.

**D6: Franja institucional**

- `franja-institucional.tsx` pasa de `bg-primary` a `bg-brand`.
- El logo conserva `src`, dimensiones, `priority` y `unoptimized`; no se aplican filtros, opacidad, máscaras ni recortes.
- El selector de tema se monta a la derecha de la franja, con botones accesibles de 28 px, `aria-pressed` y foco visible.

## Risks / Trade-offs

- **Destello antes de hidratar si la CSP bloquea el script** → la CSP instalada ya permite `'unsafe-inline'`; se verifica en build y no se modifica.
- **Diferencia de estado del selector entre servidor y cliente** → `useSyncExternalStore` usa un snapshot de servidor estable; el color se corrige antes del pintado con el script.
- **Preferencia no disponible por privacidad del navegador** → fallback a Sistema y almacenamiento en memoria; no hay error visible.
- **Cambiar `--primary` afecta todos los enlaces y botones existentes** → es intencional y centralizado; se revisan las variantes de las primitivas y el contraste de los tokens.
- **El logo tiene fondo `#25A200`** → la franja conserva exactamente ese color en ambos temas, por lo que el asset no requiere edición.

## Migration Plan

- No hay migración de datos ni cambios de esquema.
- Despliegue normal del frontend; la preferencia guardada es aditiva y ausente en instalaciones existentes.
- Rollback: revertir el commit del change; no quedan datos persistidos fuera de `localStorage`.

## Open Questions

Ninguna para esta etapa. Las etapas posteriores consumirán los tokens definidos aquí.
