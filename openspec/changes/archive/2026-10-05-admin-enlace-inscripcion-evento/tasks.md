# Tasks

## 1. Enlace y QR en el servidor

- [x] 1.1 En `src/app/admin/eventos/[id]/page.tsx`, construir
  `inscripcionUrl` a partir de `urlBase` normalizada (`replace(/\/$/, "")` +
  `/inscripcion/{id}`) y generar su `QRCode.toDataURL` junto al de los
  checkpoints (mismo patrón: `width: 256, margin: 1`) — verificado: `npm run
  lint` y `npx tsc --noEmit` sin errores.

## 2. Botón copiar y presentación

- [x] 2.1 Crear el componente cliente `src/app/admin/eventos/[id]/boton-copiar.tsx`
  con `useState`, `navigator.clipboard.writeText(url)`, feedback visual
  "Copiado" durante ~2 s (con limpieza del `setTimeout` al desmontar) y estado
  de error si el portapapeles no está disponible — verificado: `npm run lint`
  y `npx tsc --noEmit` sin errores; ruta de éxito ("Copiado ✓" con la URL
  capturada) y fallback ("No se pudo copiar") comprobados en navegador.
- [x] 2.2 Integrar el bloque "Enlace de inscripción" en el detalle del evento,
  debajo de la rejilla de datos: URL legible + `BotonCopiar` + `<details>`
  "Ver QR" que muestra el `<img>` del QR y el enlace, reutilizando el patrón de
  los checkpoints — verificado: `npm run lint` y `npx tsc --noEmit` sin
  errores, bloque visible en navegador.

## 3. Verificación de extremo a extremo

- [x] 3.1 Con sesión de Administrador en `/admin/eventos/[id]` del evento de
  dev, verificado en navegador: la URL completa de inscripción
  `http://localhost:3000/inscripcion/{id}` se muestra y carga la página pública
  (título "Inscripción"); "Copiar" copia la URL al portapapeles y muestra
  "Copiado ✓"; el QR bajo "Ver QR" es byte-idéntico (mismo sha256) al generado
  por `qrcode` para esa URL; `npm run lint` + `npx tsc --noEmit` sin errores.