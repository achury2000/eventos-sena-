# Design

## Context

El panel `/operador` es un Client Component (`panel-operador.tsx`) que recibe un DTO de `cargarTableroOperador` y hace polling cada 5 segundos a `/api/operador/dashboard`. Cada evento se renderiza como una tarjeta con cuatro cuadros de indicadores —Asistentes, Cobertura, Checkpoints activos y Registros— seguidos de gráficos y de las tarjetas de checkpoints con toggle y registro manual. El DTO solo traía agregados: no incluía nombres de asistentes ni estados por checkpoint. Para la tabla de asistentes existe un patrón previo en `src/lib/reportes/cargar-reporte.ts` y en `src/app/admin/eventos/[id]/reporte/tabla-desglose.tsx`, pero están acoplados al rol de Administrador.

## Goals / Non-Goals

**Goals:**

- Convertir los cuatro cuadros existentes de cada evento en botones locales a esa tarjeta.
- Mantener Cobertura como vista inicial de cada evento.
- Mostrar nombres de asistentes y su estado por checkpoint sin exponer documentos.
- Reunir activación y registro manual bajo el botón Checkpoints activos.
- Dar contenido propio al botón Registros sin perder su valor agregado.
- Mantener el sondeo, los permisos y la integridad de registros intactos.

**Non-Goals:**

- Botones globales que cambien todos los eventos a la vez, ni una barra de pestañas por encima del listado.
- Nuevas rutas `/operador/cobertura`, `/operador/asistentes` ni `/operador/checkpoints`.
- Modificar los endpoints de activación o registro manual.
- Filtrar las vistas Asistentes y Registros con el buscador de checkpoints; el filtro sigue actuando sobre tarjetas y barras.
- Agregar paginación o exportación a las tablas.
- Cambios de esquema, migraciones o dependencias.

## Decisions

### D1. Estado de vista por evento, no global

Los cuadros de cada tarjeta son botones que actualizan una entrada de `vistasPorEvento: Record<string, VistaEvento>` en `useState`. La vista de un evento no afecta a los demás; cada evento abre en `cobertura` la primera vez que se renderiza. Esto evita que el operador tenga que volver al inicio de la pantalla cuando está revisando el último evento.

**Alternativas consideradas:** un único estado global o pestañas en la cabecera del panel. Se descartan porque justamente obligan a desplazarse y cambian la lectura de varias tarjetas a la vez. Tampoco se usa `?tab=` en la URL: el panel ya hace polling y una navegación completa recargaría el Server Component. El estado se guarda fuera del DTO para que los `setTablero` del sondeo no lo reinicien.

### D2. Cobertura conserva los gráficos y el buscador global

La vista Cobertura de cada evento reutiliza `GraficosEvento` tal cual: el donut sigue siendo global por evento y las barras siguen respetando el buscador de checkpoints. El buscador permanece arriba, como antes, y no se oculta al cambiar de vista. El total de registros se mantiene visible en el botón Registros, por lo que ya no hace falta repetirlo como texto dentro de Cobertura.

### D3. Ampliar el DTO del tablero en lugar de reutilizar el loader de reportes

`cargarTableroOperador` pasa a incluir, por evento asignado:

```ts
asistentes: {
  id: string;
  nombreCompleto: string;
  registradoPorCheckpoint: Record<string, boolean>;
}[]
```

Se construye con `asistente.findMany` filtrando por `eventoId` e `inscripcion.estado !== CANCELADO`, y un `registroControl` anidado por checkpoint, siguiendo el patrón de `cargar-reporte.ts`. El `where` de eventos asignados (`EventoOperador`) se mantiene, por lo que un operador nunca recibe asistentes de otro evento.

**Alternativa considerada:** llamar a `cargarReporteEvento` desde el panel y añadirle un guard de operador. Se descarta porque ese DTO incluye `documento`, `centroFormacion` y rol de titular/acompañante —innecesarios aquí— y acoplaría el panel al módulo de reportes de Administración.

### D4. Tabla de asistentes como componente local

El componente `tabla-asistentes.tsx` muestra columna de nombre, una columna por checkpoint con `SÍ`/`NO` y una columna `Completados`. Se ordena por nombre y se muestra dentro de un contenedor con desplazamiento horizontal. No incluye documento.

**Alternativa considerada:** reutilizar directamente `tabla-desglose.tsx` del reporte. Se descarta porque expone documento y centro de formación; se copia solo la forma visual, no el componente.

### D5. Checkpoints activos reutiliza el listado actual

Las tarjetas con `BotonToggleCheckpoint` y `FormRegistroManual` se muestran al pulsar el cuadro **Checkpoints activos**, sin crear páginas nuevas. El formulario se deshabilita cuando `activo === false` con un mensaje “Active el checkpoint para registrar”. El endpoint sigue validando el estado y devolviendo `422` si se intenta de todas formas.

### D6. Tabla de Registros como componente local

Nuevo componente `tabla-registros.tsx` con columnas Checkpoint, Registrados, Manuales, Autoregistro, Total asistentes y Avance. Usa los agregados que ya trae `CheckpointTablero`, sin consultas adicionales, y muestra estado vacío cuando el evento no tiene checkpoints. El botón Registros conserva el total `registros` calculado en `resumirEvento`.

### D7. Accesibilidad

Los cuatro cuadros son botones con `aria-pressed` y estados de foco visibles. La agrupación por evento se anuncia con `aria-label` que incluye el nombre del evento; las tablas llevan `caption` en `sr-only`.

## Risks / Trade-offs

- [Los E2E actuales esperan ver el formulario manual al entrar] → Actualizar `tests/e2e/operador.spec.ts` y `tests/e2e/checkpoint.spec.ts` para pulsar **Checkpoints activos** del evento antes de registrar; añadir pruebas de vista por evento, asistentes y registros.
- [El polling puede reiniciar la vista] → Mantener `vistasPorEvento` y `filtro` en `useState` del componente, nunca en el DTO ni en estado derivado de él.
- [Tabla grande en eventos con muchos asistentes] → Contenedor con `overflow-x-auto` y orden estable por nombre; se deja paginación fuera de alcance.
- [Fuga de documento] → El DTO no incluye `documento` y se añade una aserción E2E/integración de que no aparece en la respuesta ni en la tabla.
- [Registro manual en checkpoint inactivo] → UI deshabilitada con mensaje, más la validación `422` existente en el servidor.
- [Más botones por tarjeta] → Se conserva exactamente el tamaño y orden de los cuadros originales; solo cambia su comportamiento, por lo que el impacto visual es mínimo.

## Migration Plan

Sin migración de base de datos. El despliegue es el código nuevo; la diferencia perceptible es que los cuadros de cada evento ahora son interactivos y cada evento recuerda su propia vista. Rollback: revertir el commit; no hay datos persistentes nuevos que limpiar.

## Open Questions

Ninguna. La decisión de no filtrar las vistas Asistentes y Registros con el buscador de checkpoints quedó registrada en Non-Goals.
