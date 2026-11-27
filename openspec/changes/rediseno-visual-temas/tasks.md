# Tasks

## 1. Etapa 1 — Tokens y sistema de temas

- [x] 1.1 Definir en `src/app/globals.css` los tokens de marca (`#25A200`), acción (`#1B7A00` claro / `#7FD65B` oscuro), superficies, texto, bordes, foco, estados y gráficos para ambos temas; verificar que `bg-brand`, `bg-primary` y `hover:bg-primary-hover` compilen y que la variante `dark:` responda a `[data-theme="dark"]`.
- [x] 1.2 Crear `src/lib/tema.ts` con el tipo de preferencia, la clave de almacenamiento, el script inline de arranque y las utilidades de resolución; verificar con `npx tsc --noEmit`.
- [x] 1.3 Crear el proveedor cliente con `useSyncExternalStore`, persistencia en `localStorage`, seguimiento de `prefers-color-scheme` y fallback en memoria; verificar que cambiar de tema actualice `data-theme` y `color-scheme` sin recargar.
- [x] 1.4 Añadir el script inline en `<head>` de `src/app/layout.tsx`, `suppressHydrationWarning` y `data-theme` inicial; verificar que una recarga con preferencia oscura no muestre un destello claro.
- [x] 1.5 Crear el selector accesible Claro/Oscuro/Sistema y montarlo en la franja institucional; verificar con teclado, `aria-pressed` y que la franja siga en `#25A200` con el logo intacto.
- [x] 1.6 Actualizar `Button`, `Input` y `Label` para consumir los tokens, con foco visible, hover y estado inválido consistentes; verificar visualmente en ambos temas y con `npx tsc --noEmit`.

## 2. Verificación de la Etapa 1

- [x] 2.1 Ejecutar `npm run lint` y corregir cualquier error introducido por el tema o las primitivas.
- [x] 2.2 Ejecutar `npx tsc --noEmit` y confirmar que no hay errores de tipos.
- [x] 2.3 Ejecutar `npm run build` y confirmar que la compilación de producción termina correctamente.
- [x] 2.4 Revisar el diff completo y confirmar que no se tocaron contadores, lógica de negocio, validaciones, APIs ni textos críticos de E2E.
- [x] 2.5 Revisar visualmente login en claro, oscuro, Sistema y viewport móvil; documentar el resultado real y no avanzar si hay errores.

## 3. Etapa 2 — Layouts y navegación

- [ ] 3.1 Unificar los shells de admin y operador con los tokens y una navegación consistente; verificar navegación y cierre de sesión.
- [ ] 3.2 Crear los estados compartidos de carga, error y no encontrado; verificar que rendericen en ambos temas.
- [ ] 3.3 Revisar la franja, el foco y el responsive en los layouts; verificar con teclado y viewport móvil.

## 4. Etapa 3 — Acceso y flujos públicos

- [ ] 4.1 Rediseñar `/login` y `/cambiar-clave` sin cambiar validaciones ni textos E2E; verificar los flujos de acceso y cambio de clave.
- [ ] 4.2 Rediseñar la inscripción pública y el checkpoint público sin alterar la lógica de formularios ni los textos críticos; verificar los flujos E2E de inscripción y checkpoint.

## 5. Etapa 4 — Panel del operador

- [ ] 5.1 Rediseñar el panel del operador y sus estados; verificar los textos y roles que usan las pruebas E2E.
- [ ] 5.2 Migrar los gráficos a tokens de tema; verificar que ambos segmentos sigan siendo distinguibles en claro y oscuro.

## 6. Etapa 5 — Panel de administración

- [ ] 6.1 Rediseñar tablas, formularios y reportes del panel admin sin tocar los contadores ni las consultas; verificar los flujos de administración.
- [ ] 6.2 Revisar el orden de columnas y los textos críticos de las tablas; verificar que las pruebas E2E sigan encontrando las estructuras esperadas.

## 7. Etapa 6 — QA integral

- [ ] 7.1 Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`; confirmar que terminan sin errores.
- [ ] 7.2 Ejecutar `npm test` y `npm run test:e2e` con los servicios requeridos; confirmar el resultado real.
- [ ] 7.3 Revisar visualmente todas las pantallas en claro, oscuro y Sistema; documentar hallazgos y pendientes.
