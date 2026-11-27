# Design

## Context

`src/app/admin/eventos/[id]/inscripciones/page.tsx` es un Server Component que consulta las inscripciones con `take: 50` fijo (las últimas por `fechaInscripcion` descendente) y no tiene buscador ni paginación. En Next 16, `searchParams` es una `Promise` que se lee con `await` (ver `node_modules/next/dist/docs/.../page.md`). El repositorio ya tiene un patrón de búsqueda por `q` en `src/app/api/admin/eventos/[eventoId]/asistentes/route.ts` (`contains` + `mode: "insensitive"` para texto, `contains` para documento), que se reutiliza.

## Goals

- Búsqueda en la lista por nombre o documento del titular y por correo de la inscripción.
- Paginación de tamaño fijo con indicador "página X de Y" y controles Anterior/Siguiente.
- Filtros expresados en la URL (`?q=` / `?pagina=`): la búsqueda se preserva al cambiar de página, las URLs son compartibles y funcionan con el botón atrás.

## Non-Goals

- No se agrega filtro por estado ni ordenamientos configurables.
- No se busca por acompañantes (la fila muestra solo al titular).
- No se agregan dependencias ni se toca el esquema de BD.

## Decisions

### D1: Búsqueda y paginación servidas por URL parameters (elegido)

La página lee `q` y `pagina` de `searchParams` y re-renderiza en el servidor. Se eligió sobre:

- *Cliente con fetch a una API*: agrega estado en el cliente, pierde URLs compartibles y duplica lógica ya existente.
- *Librería de tablas (ej. TanStack Table)*: nueva dependencia y estado cliente para un caso simple.

El formulario de búsqueda es un `<form method="GET">` nativo (sin componente cliente): al enviarlo navega a `?q=...` preservando la ruta. La paginación usa `<Link>` con `{ query: { q, pagina } }`.

### D2: Where de búsqueda

El texto `q` se aplica con un `OR` sobre:
- `correo` de la inscripción (`contains` + `mode: "insensitive"`),
- `asistentes: { some: { esTitular: true, OR: [ { nombreCompleto: contains + insensitive }, { documento: contains } ] } }`.

El mismo `where` se comparte entre `count` y `findMany` para que el total refleje el filtro activo.

### D3: Tamaño de página fijo

`PAGINA_TAMANO = 20`, constante local de la página. Se compensa la menor densidad visual vs. el `take: 50` actual con el indicador de posición y el contador de rango.

### D4: Navegación y ajuste de rango

- `pagina` se parsea como entero ≥ 1 (no numérico → 1).
- `totalPaginas = max(1, ceil(total / PAGINA_TAMANO))`; `pagina` se ajusta al rango `[1, totalPaginas]`, de modo que una página fuera de rango cae en la última válida y nunca se muestra una página vacía.
- `skip = (pagina - 1) * PAGINA_TAMANO`, `take = PAGINA_TAMANO`.
- Orden por `fechaInscripcion` descendente, igual que hoy.

## Risks / Trade-offs

- [`contains` insensible sobre nombre/correo sin índice dedicado puede encarecer la consulta en eventos muy grandes] → el cupo máximo por evento acota el volumen (≤ 1000 inscripciones); agregar índices/colación queda fuera del alcance de este change.
- [Con 20 filas por página se ven menos filas a la vez que con `take: 50`] → se mitiga con el contador de rango visible ("mostrando X–Y de Z") y el indicador de página.
- [La página se vuelve dinámica por `searchParams`] → ya era dinámica por `requireAdmin()`; no introduce un costo nuevo de render.

## Migration Plan

Implementación en la rama `feature/paginacion-inscripciones` sobre `main`; PR para merge tras aprobación y verificación en navegador. Rollback = revert del PR (cambio contenido en un único archivo).

## Open Questions

Ninguna.