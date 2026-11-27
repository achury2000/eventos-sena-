# Design

## Context

See `proposal.md` for motivation. Hoy el panel mantiene un único texto de filtro en el contenedor principal, lo compara contra nombre y categoría de checkpoint, oculta eventos completos sin coincidencias y tiene una excepción explícita para no tocar `Asistentes` ni `Registros`. Las vistas ya son independientes por evento y sobreviven al sondeo de 5 s. La respuesta de `/api/operador/dashboard` ya trae nombres de asistentes, estados por checkpoint e identificadores de ocupantes por habitación, así que todo el filtrado puede hacerse en cliente.

## Goals / Non-Goals

**Goals**

- Que el texto de búsqueda pertenezca al par evento/vista y se conserve durante el sondeo y los cambios de vista.
- Que `Asistentes` siga mostrando cada habitación como columna individual, pero sin apretar celdas.
- Que filtrar no cambie el significado de `Completados`.

**Non-Goals**

- No cambiar DTO, endpoints, Prisma, esquema ni migraciones.
- No mantener un buscador global ni permitir búsquedas cruzadas entre eventos.
- No añadir un selector de columnas independiente del buscador, ni transponer la tabla, ni promediar habitaciones.
- No persistir los textos tras recargar la página, igual que ocurre hoy con las vistas.

## Decisions

### 1. Quitar el buscador global en lugar de darle dos significados

**Decision**: eliminar el campo global y sus reglas de “sin resultados” y excepción de tablas. Cada vista activa de cada evento muestra su propio campo.

**Alternatives considered**:
- Un buscador global con dos conjuntos de resultados (checkpoints y asistentes) era coherente por sí solo, pero con vistas independientes por evento un mismo texto tendría que significar cosas distintas según qué evento esté en qué vista.
- Un buscador global contextual según la vista activa fue descartado por la misma razón: dos eventos con vistas distintas darían interpretaciones distintas al mismo texto.
- Mantener el global y añadir otro local dejaría dos campos con solapamiento confuso.

Como el Operador acompaña un evento por día, la búsqueda cruzada casi no aporta valor y el coste de varios campos pequeños, uno por vista activa, es bajo.

### 2. Estado de búsqueda por evento y por vista en el contenedor del panel

**Decision**: guardar los textos en el mismo nivel del panel donde ya vive el estado de vistas, indexados por identificador de evento y identificador de vista. Los campos son controlados por ese estado.

**Alternatives considered**:
- Estado local dentro de cada componente de vista: se perdería al cambiar de vista, porque esos componentes se desmontan.
- Un solo texto por evento: cambiar de `Asistentes` a `Cobertura` arrastraría un término que ya no aplica, o habría que limpiarlo al cambiar, rompiendo la expectativa de que cada vista recuerda su estado.

### 3. En `Asistentes`, el buscador filtra filas y columnas

**Decision**: normalizar el texto a minúsculas sin tildes. Si coincide con `nombreCompleto`, filtra filas; si coincide con nombre o categoría de checkpoint, filtra columnas; si coincide con ambos, aplica los dos filtros a la vez.

**Alternatives considered**:
- Filtrar solo filas resuelve encontrar a una persona, pero no reduce el ancho.
- Filtrar solo columnas resuelve el ancho, pero no permite localizar asistentes.
- Transponer la tabla empeora con 100–200 asistentes: las filas se convierten en columnas y el problema se traslada.

### 4. Tabla de datos con scroll horizontal y columnas ancladas

**Decision**: contenedor con desplazamiento horizontal, tabla semántica, columna `Nombre` anclada a la izquierda, columna `Completados` anclada a la derecha, cabecera fija, ancho mínimo por columna de checkpoint y etiqueta corta del cuarto con el nombre completo en `title`/`aria-label`.

**Alternatives considered**:
- Ajustar texto con `wrap` o truncado agresivo reduce legibilidad justo donde se leen estados.
- Scroll sin columnas ancladas pierde la identidad del asistente al desplazarse.
- Resumir o promediar habitaciones fue descartado explícitamente: cada cuarto debe seguir siendo una columna.

### 5. `Completados` mantiene el denominador global

**Decision**: el denominador sigue siendo el total de checkpoints aplicables al asistente, aunque el buscador oculte columnas. Cuando haya columnas ocultas, la celda indica cuántas columnas están visibles.

**Alternatives considered**:
- Recalcular sobre columnas visibles haría que el mismo asistente mostrara `2/4` o `2/2` según el texto escrito, cambiando el significado del indicador.

### 6. Estados vacíos por vista sin ocultar el evento

**Decision**: cada vista muestra su propio mensaje cuando no hay coincidencias. La sección del evento permanece visible.

**Alternatives considered**:
- Ocultar el evento como hacía el filtro global resulta contradictorio cuando el campo de búsqueda está dentro de ese evento.

### 7. Filtrado exclusivamente en cliente

**Decision**: reutilizar el DTO existente del tablero y derivar filas y columnas visibles en el cliente. No se añaden endpoints ni parámetros de consulta.

**Alternatives considered**:
- Filtrar en servidor añadiría tráfico al sondeo de 5 s y nuevos contratos sin beneficio visible.

## Risks / Trade-offs

- **[Riesgo] Varios campos de búsqueda visibles a la vez** → Mitigación: solo aparece el de la vista activa de cada evento y se mantiene compacto.
- **[Riesgo] Pérdida de búsqueda cruzada entre eventos** → Mitigación: aceptado por el flujo real de un evento por día; se puede revisar en el futuro si cambia.
- **[Riesgo] Columnas ancladas que tapan contenido en pantallas estrechas** → Mitigación: ancho mínimo por columna, scroll horizontal explícito y nombre completo disponible en `title`/`aria-label`.
- **[Riesgo] El sondeo provoque pérdida de foco o de texto** → Mitigación: campos controlados por estado estable en el contenedor del panel.
- **[Riesgo] Una búsqueda que coincida con filas y columnas sin intersección real** → Mitigación: mostrar `N/A` en celdas no aplicables y mantener el estado vacío solo cuando no haya coincidencias en absoluto.
- **[Riesgo] Cambio de selectores en pruebas** → Mitigación: tarea explícita de actualización de E2E y verificación completa.

## Migration Plan

1. Desplegar el cambio solo como modificación de interfaz; no hay datos que migrar ni endpoints nuevos.
2. Si es necesario revertir, basta con revertir el commit: no hay estado persistente en base de datos que reconciliar.
3. Tras la implementación, sincronizar el delta con `openspec/specs/panel-operador/spec.md` y archivar el change.

## Open Questions

Ninguna.
