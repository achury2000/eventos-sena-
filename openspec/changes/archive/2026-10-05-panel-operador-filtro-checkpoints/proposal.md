# Proposal

## Why

El panel del Operador lista todos los checkpoints de cada evento asignado en una sola columna. Con varios eventos y muchos checkpoints — habitaciones de hotel (cada una es un checkpoint) más los manuales (comida, transporte, etc.) — localizar uno concreto es engorroso, especialmente en el día del evento cuando el Operador necesita registrar manualmente a un asistente en un cuarto puntual. Un filtro de búsqueda por nombre elimina el scroll: el Operador escribe parte del nombre (ej. "60", "almuerzo", "habitación") y la tarjeta del checkpoint aparece al instante, lista para togglear o registrar.

## What Changes

- El panel del Operador gana un **campo de búsqueda/filtro** (cliente) que filtra las tarjetas de checkpoint por **nombre y categoría**, sin distinguir mayúsculas ni tildes: escribir `60`, `almuerzo`, `habitacion` o `ALOJAMIENTO` encuentra lo correspondiente.
- Solo cambia **lo que se dibuja**: los eventos con cero coincidencias se ocultan (y se muestra un estado vacío si ninguna tarjeta coincide). Al vaciar el filtro, reaparece todo el tablero tal como hoy.
- La tarjeta que queda visible conserva sus funciones intactas: activar/desactivar y **registro manual** (el objetivo principal: llegar directo al checkpoint buscado).
- **Nada cambia en el servidor**: el sondeo `GET /api/operador/dashboard` sigue trayendo el tablero completo; el filtro es una vista local de los datos ya en memoria, sin queries ni round-trips extra.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `panel-operador`: el panel permite filtrar sus checkpoints por texto (nombre y categoría), resaltando los coincidentes y ocultando los que no, con actualización solo en el cliente.

## Impact

- **UI**: `src/app/operador/panel-operador.tsx` (único archivo): estado de filtro, normalización de texto (NFD, minúsculas), renderizado condicional de secciones/tarjetas y mensaje de "sin resultados".
- **Intactos**: schema y migraciones, `tablero.ts`, API de sondeo, Server Actions de toggle/registro, vistas de Administrador, autoregistro, dependencias (ninguna nueva).