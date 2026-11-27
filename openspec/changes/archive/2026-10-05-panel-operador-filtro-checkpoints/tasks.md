# Tasks

## 1. Campo de búsqueda y filtrado en el panel

- [x] 1.1 En `src/app/operador/panel-operador.tsx`: agregar estado `filtro` (`useState("")`), una función de normalización (NFD + minúsculas) y un `input` de búsqueda con `<label>` visible ("Buscar checkpoint") y placeholder "Buscar por nombre o categoría (ej. Habitación 601)" arriba de las secciones. Filtrar en el render: cada checkpoint coincide si el texto normalizado de `nombre + " " + etiqueta de tipo` incluye el filtro normalizado; los eventos sin coincidencias se ocultan; si ningún checkpoint coincide, mostrar "Sin checkpoints que coincidan con «{filtro}»" en lugar de las secciones. Con filtro vacío se renderiza el tablero exacto de hoy. Verificar con `npx tsc --noEmit` que tipa.

## 2. Verificación integral del filtro

- [x] 2.1 Probar en dev con el Operador: buscar `60` muestra solo "Habitación 601" y oculta Almuerzo/Bus; buscar `habitacion` (sin tilde) también la encuentra; buscar `alojamiento` la encuentra por categoría; buscar una cadena sin coincidencias (ej. `zzz`) muestra el estado vacío y oculta todos los eventos; vaciar el filtro restaura el tablero completo. Confirmar que con el filtro activo la tarjeta "Habitación 601" conserva su toggle y su formulario de registro manual (duplicado sigue bloqueado) y que el sondeo sigue actualizando conteos/ocupación sin perder el filtro.
- [x] 2.2 Guardar contra regresiones: `GET /api/operador/dashboard` sigue respondiendo `200` sin cambios en el JSON; el tablero sin filtro renderiza idéntico a antes; `openspec validate --changes panel-operador-filtro-checkpoints --strict` pasa y el árbol de trabajo queda limpio de scripts temporales.