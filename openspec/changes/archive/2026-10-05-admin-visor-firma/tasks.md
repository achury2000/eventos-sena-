# Tasks

## 0. Rama de trabajo

- [ ] 0.1 Crear la rama `feature/visor-firma` desde `main` y verificar con `git branch --show-current` que está activa y el árbol limpio

## 1. Dependencia y utilitario de storage

- [x] 1.1 Avisar a la Persona B y acordar la instalación de `@aws-sdk/s3-request-presigner` (versión alineada con `@aws-sdk/client-s3`, ejemplo `@3.1132.0`), luego instalar y verificar con `npm ls @aws-sdk/s3-request-presigner` que la versión presente coincide y `npm run dev` sigue levantando
- [x] 1.2 En `src/lib/storage.ts`: agregar `EXPIRACION_FIRMA_SEG = 300` y la función `urlFirma(claveFirma: string): Promise<string>` que devuelve la URL firmada (presigned GET) sobre el bucket con ese TTL, y verificar con `npx tsc --noEmit` que compila y que la función rechaza una clave vacía sin llamar al cliente S3

## 2. Route handler del visor

- [x] 2.1 Crear `src/app/api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma/route.ts` con `export const runtime = "nodejs"` que rechaza con 401 sin sesión y con 403 si el rol no es `ADMINISTRADOR` (patrón de `api/admin/eventos/[eventoId]/asistentes/route.ts`), y verificar con una petición no autenticada que responde `401 {"error":"No autenticado."}`
- [x] 2.2 Implementar la consulta `prisma.inscripcion.findFirst({ where: { id, eventoId } })`: si no hay resultado responder 404 (misma respuesta para evento inexistente e inscripción inexistente o de otro evento), si hay resultado generar la URL firmada y responder `NextResponse.redirect(url)`, y ante un error de firma de URL responder 500 sin exponer internos; verificar en el navegador que un evento/inscripción inválido responde 404 y una combinación válida redirige a la imagen de la firma

## 3. UI en el panel admin

- [x] 3.1 En `src/app/admin/eventos/[id]/inscripciones/page.tsx` agregar, por fila de inscripción, un enlace "Ver firma" (variante `outline size="sm"`, `target="_blank" rel="noopener noreferrer"`) apuntando a `/api/admin/eventos/{eventoId}/inscripciones/{inscripcionId}/firma`, al lado de `BotonCancelar`, y verificar en el navegador con sesión de Administrador que el botón aparece en todas las filas y abre la firma en una pestaña nueva

## 4. Verificación de integración y accesos

- [x] 4.1 Correr `npm run lint` y `npx tsc --noEmit` y verificar que terminan sin errores ni warnings nuevos
- [x] 4.2 Verificar con sesión de `OPERADOR` (o sin sesión) que el endpoint responde 403/401 sin exponer datos, y que documentos/eventos inválidos responden 404 con el mismo cuerpo
- [x] 4.3 Verificar con una inscripción cancelada que "Ver firma" sigue mostrando la imagen del titular (la cancelación no borra la firma)
- [x] 4.4 Validar los artefactos con `openspec validate admin-visor-firma --strict`, confirmar que la URL firmada expira (revisar al volver a abrir la pestaña después de la expiración), crear el PR con la rama `feature/visor-firma` hacia `main` y verificar el diff para que no incluya cambios fuera del módulo (solo storage, route handler, página de inscripciones y `package.json`/lock)