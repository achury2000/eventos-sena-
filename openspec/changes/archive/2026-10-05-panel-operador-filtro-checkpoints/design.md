# Design

## Context

Ver `proposal.md` — Why para la motivación.

Estado actual relevante:

- `PanelOperador` (`src/app/operador/panel-operador.tsx`) es un componente cliente que recibe `TableroOperador` por props y lo refresca por sondeo (polling) cada 5 s contra `GET /api/operador/dashboard`, en el mismo componente (`useState` + `setInterval`). Todo el tablero ya está en memoria en el cliente.
- La estructura de render es: un `<div>` contenedor → secciones por evento (`<section>` con header) → `<ul>` con una tarjeta `<li>` por checkpoint. Cada tarjeta muestra nombre, tipo, `registros/totalAsistentes`, ocupación (si es de habitación), badge de activo, toggle y el formulario de registro manual.
- `ETIQUETA_TIPO_CHECKPOINT` (`src/lib/labels.ts`) mapea el enum a la etiqueta ("ALOJAMIENTO" → "Alojamiento", etc.).
- Sin dependencias de búsqueda en el proyecto; no hay autocomplete ni indexación local que reutilizar.

## Goals / Non-Goals

**Goals:**

- Que el Operador llegue al checkpoint buscado (por nombre o categoría) escribiendo un fragmento de texto, sin salir de la pantalla y sin afectar el sondeo.
- Mantener intactas las acciones por tarjeta (toggle y registro manual) cuando el filtro está activo.
- Cero coste de servidor: el filtro opera sobre el tablero ya cargado.

**Non-Goals:**

- No hacer búsqueda en el servidor (no se agregan parámetros a `/api/operador/dashboard` ni endpoints nuevos).
- No filtrar por estado `activo/inactivo` ni por categoría con dropdown; solo texto libre sobre nombre y categoría (a futuro se puede ampliar).
- No paginar ni "cargar más": el filtro es una vista de los datos en memoria.
- No tocar el tablero de Administrador ni otros flujos.

## Decisions

### 1. Un único campo de búsqueda a nivel de panel, filtro 100 % cliente

Se agrega un `input` (con label visible y placeholder) arriba de las secciones de eventos. El valor del filtro (`useState`) se normaliza y se compara, por cada checkpoint, contra:

```
texto = nombre + " " + ETIQUETA_TIPO_CHECKPOINT[tipo]
```

**Normalización** (acentos + mayúsculas):

```ts
const n = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
```

Así `habitacion` encuentra "Habitación 601", `ALOJAMIENTO`/"alojamiento" encuentra la etiqueta "Alojamiento", y `60`/`601` encuentra el cuarto. La coincidencia es por inclusión de subcadena (`includes`), no prefijo: `muer` encuentra "Almuerzo".

- **Por qué cliente**: el tablero completo ya vive en el estado del componente (sondeo); filtrar es una función pura sobre `tablero.eventos`, sin latencia ni presión a la API. Además el operador puede buscar mientras el sondeo sigue refrescando los datos en segundo plano.
- **Alternativa descartada**: consulta al servidor con `?q=` — round-trip por tecla o debounce innecesarios y el dato ya está disponible; agrega latencia al momento crítico (registro manual).

### 2. Los eventos sin coincidencias se ocultan; estado vacío global

El render proyecta `tablero.eventos` → por evento filtra sus checkpoints:

- Si el evento queda sin coincidencias → no se dibuja su `<section>`.
- Si **ningún** checkpoint de ningún evento coincide → un único mensaje informativo "Sin checkpoints que coincidan con «{filtro}»", y ninguna tarjeta/acción visible.
- Filtro vacío → exactamente el render actual (todas las secciones y tarjetas).

Esto mantiene el panel limpio cuando hay muchos eventos y solo uno tiene el checkpoint buscado.

### 3. La tarjeta filtrada conserva todas sus acciones

El `<li>` renderizado es el mismo de hoy (togggle + `FormRegistroManual`); el filtro solo decide qué `<li>`s entran al `<ul>`. El objetivo operativo señalado por el usuario —registro manual en un cuarto puntual— queda a un solo toque tras buscar.

### 4. Accesibilidad y claridad del campo

- `<label>` visible con texto "Buscar checkpoint".
- `placeholder` orientativo: "Buscar por nombre o categoría (ej. Habitación 601)".
- `autoComplete="off"`, `type="search"` con botón nativo de limpiar del navegador donde aplique; el texto se muestra tal cual se escribe (sin debounce: el conjunto es pequeño).

## Risks / Trade-offs

- [Filtro amplio (incluye categoría) puede traer varios resultados] → Es lo deseado: el operador afina con más texto. El estado vacío comunica cuándo no hay coincidencias.
- [Normalizar elimina tildes también del nombre renderizado? No] → Solo se normaliza la copia de comparación; el texto que se muestra es el original.
- [Sondeo y filtro en combinación] → El sondeo reemplaza `tablero` (estado completo); el filtro se aplica en el render, así que ambas cosas conviven sin conflicto (no se pierde el filtro al refrescar).
- [Sin coincidencias oculta eventos enteros] → Previsto con el estado vacío global; no hay ambigüedad sobre qué pasó.

## Migration Plan

No aplica: sin cambios de schema ni de datos.