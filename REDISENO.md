# Rediseño visual — Eventos SENA

Solo cambió la capa visual. No se tocó la lógica de negocio, la base de datos, la API,
los textos de la interfaz ni los selectores de las pruebas E2E. Se conservan la
tipografía **Open Sans** y el **logo oficial del SENA** sobre la franja #25A200.

## Qué hay de nuevo
- **Fondo animado** (`components/shared/fondo-animado.tsx`): aurora que deriva, rejilla de puntos y partículas. Solo CSS.
- **Franja SENA**: barra fija con brillo que la cruza, círculos flotantes y línea de colores. El logo conserva su fondo sólido (las formas empiezan después de él).
- **Login**: panel de bienvenida con degradado y tarjetas flotantes (solo pantallas anchas) y tarjeta de acceso con borde de color giratorio.
- **Paneles**: encabezado tipo "héroe" con degradado, navegación en píldoras, tarjetas de vidrio con elevación al pasar el cursor.
- **Indicadores**: conteo animado (`numero-animado.tsx`), icono con degradado, barras de cupo con brillo (ámbar desde el 90 %), punto que late en "Inscripciones abiertas".
- **Transiciones**: cada página entra con fundido y desplazamiento (`app/template.tsx`); las listas entran en cascada.
- **Botones e inputs** más grandes, con brillo al pasar el cursor y foco más claro. Tablas con cabecera teñida y filas que reaccionan.
- **Tema claro y oscuro** reajustados, con acentos de apoyo de la paleta SENA (azul #00304D, celeste, amarillo).
- **Accesibilidad**: `prefers-reduced-motion` desactiva las animaciones; el fondo no se imprime.

## Dónde ajustar
- Colores y movimiento: `src/app/globals.css`.
- Componentes: `src/components/shared/*`, `src/components/ui/{button,input}.tsx`, `src/app/login/page.tsx` y los layouts de `admin` y `operador`.

## Para correrlo
Igual que antes: `cp .env.example .env` y `docker compose --profile full up --build` (ver README.md).
