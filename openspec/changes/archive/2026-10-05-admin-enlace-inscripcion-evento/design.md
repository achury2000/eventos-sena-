# Design

## Context

Ver proposal.md (por qué) y el delta de `admin/eventos` (qué). La ruta pública
de inscripción (`/inscripcion/[eventoId]`) ya existe y está especificada en
`inscripcion-publica`; el detalle admin (`src/app/admin/eventos/[id]/page.tsx`)
ya calcula `urlBase` desde `NEXT_PUBLIC_URL` y genera QR con `qrcode` para los
checkpoints. Este change solo hace visible y compartible ese enlace desde el
detalle.

## Goals / Non-Goals

**Goals:**
- Que el Administrador vea, copie y comparta (QR) el enlace de inscripción de
  un evento desde `/admin/eventos/[id]`.
- Reutilizar el patrón existente de QR de checkpoints (generación en servidor
  con `qrcode`) y la URL base ya usada en la misma página.
- Sin dependencias nuevas, sin cambios de schema ni de ruta pública.

**Non-Goals:**
- No cambiar la ruta ni el formulario público de inscripción.
- No agregar envío por correo ni métricas de visitas al enlace.
- No presentar el enlace en el flujo de creación del evento (el detalle es el
  destino inmediato tras crear).

## Decisions

### D1: URL y QR en el servidor; solo el botón "Copiar" es cliente

La URL se construye en el RSC (`urlBase` + `/inscripcion/{id}`) y el QR se
genera con `QRCode.toDataURL` junto al de los checkpoints. Únicamente la
acción de copiado necesita un componente cliente (el portapapeles no existe en
el servidor).

- **Alternativa descartada**: un endpoint `/api/...` que devuelva la URL o el
  QR → costo innecesario; el servidor ya tiene ambos datos.
- **Alternativa descartada**: componente cliente que construya la URL con
  `window.location` → depende del host del navegador; usar `NEXT_PUBLIC_URL`
  mantiene el enlace canónico igual en dev y prod.

### D2: Botón "Copiar" nativo con feedback temporal

Componente cliente pequeño (`BotonCopiar`) con `useState`: al hacer clic usa
`navigator.clipboard.writeText(url)`, muestra "Copiado" durante ~2 s y
restaura el estado inicial con `setTimeout` (limpiado en un `useEffect` de
desmontaje). Sin librerías.

- **Fallback**: si `navigator.clipboard` no está disponible (contexto no
  seguro), captura el error y muestra "No se pudo copiar"; la URL se muestra
  siempre como texto seleccionable, de modo que el copiado manual sigue siendo
  posible.

### D3: Presentación compacta reutilizando el patrón `<details>` de checkpoints

Se agrega un bloque "Enlace de inscripción" debajo de la celda de datos del
evento (tras la rejilla de `Dato`), con: URL legible + botón "Copiar" +
`<details>` "Ver QR" que muestra el `<img>` del QR y la URL enlazada — el mismo
mecanismo que ya usan los checkpoints, conservando consistencia visual y sin
nuevos estilos.

- **Alternativa descartada**: QR siempre visible en línea → ocupa espacio
  constante; el patrón `details` ya es el idioma visual de la página.

## Risks / Trade-offs

- [Portapapeles requiere contexto seguro] → en `localhost` y con HTTPS
  funciona; en HTTP de producción falla, y el fallback mantiene la URL visible
  y seleccionable manualmente.
- [URL base con barra final o vacía] → se normaliza con
  `urlBase.replace(/\/$/, "")` y existe el fallback `?? "http://localhost:3000"`
  (mismo tratamiento que los checkpoints).
- [QR depende del valor correcto de `NEXT_PUBLIC_URL`] → es la misma variable
  que ya alimenta los QR de checkpoints; si se configura mal afecta a ambos por
  igual, ya documentado en `.env.example`.

## Migration Plan

No aplica (cambio de UI en sitio). Rollback: revert del commit de
implementación; no hay migraciones de BD ni cambios de API.