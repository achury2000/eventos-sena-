# Design

## Context

`admin/visor-firma` (archivado el 2026-10-05) resolvió el acceso del
Administrador a la firma del titular con una **redirección 302 a una URL firmada
y temporal** generada con `@aws-sdk/s3-request-presigner` sobre el mismo
`S3Client` de `src/lib/storage.ts`. Esa decisión asumía que el endpoint del
almacenamiento es alcanzable **desde el navegador del Administrador**; su sección
de riesgos lo dejó anotado como verificación pendiente de producción.

En el despliegue con Docker esa condición no se cumple. `docker-compose.yml`
define `S3_ENDPOINT: http://storage:9000` para el servicio `app` porque el
almacenamiento vive en la red interna (correcto para `PutObject`/`DeleteObject`),
pero la URL firmada conserva ese host y el navegador no puede resolverlo. El
endpoint del visor responde `302` hacia `http://storage:9000/…` y la pestaña
abierta queda en un error de carga. La causa es de topología, no de lógica: el
visor nunca se probó (el e2e de inscripción no hace clic en "Ver firma") y en
`npm run dev` fuera del contenedor funciona por casualidad, porque `.env` apunta
a `http://localhost:9000`.

Se descartó "documentar y no tocar": la aplicación se revisa en el contenedor, y
más adelante el bucket debería poder vivir privado, sin endpoint público.

## Goals / Non-Goals

**Goals:**

- Que el Administrador vea la firma en el contenedor y en cualquier topología de
  red, sin depender de que el navegador alcance el almacenamiento.
- Mantener el bucket privado y el acceso restringido a rol `ADMINISTRADOR`, con
  el `404` uniforme actual.
- Cerrar el hueco de pruebas del visor para que una regresión como esta no vuelva
  a pasar inadvertida.
- Cero cambios de configuración y cero migraciones.

**Non-Goals:**

- No se cambia el esquema ni la lógica de inscripción/cancelación.
- No se expone el bucket ni se hacen públicos los objetos.
- No se sirven firmas por CDN ni se implementa descarga masiva o empaquetado.
- No se re-codifican ni se re-suben las firmas ya almacenadas.
- No se retira la dependencia `@aws-sdk/s3-request-presigner` (archivo compartido
  con la Persona B, CONTRIBUTING §4); solo se deja de usar.

## Decisions

### D1. El visor sirve los bytes de la firma; no hay URL firmada

La ruta del visor lee el objeto con las credenciales del servidor y devuelve la
imagen en su propia respuesta, en el mismo origen de la aplicación:

```
navegador ──GET /api/admin/…/firma──► app (Next)
                                        app ──GetObject──► storage:9000 (red interna)
navegador ◄── 200 image/png ────────── app
```

La app ya habla con `storage:9000` para subir y borrar firmas, así que el host
interno deja de ser un problema y el `302` desaparece. Es el mismo camino que ya
existe para el resto de la evidencia: el navegador solo ve el origen de la app.

*Alternativas consideradas:*

- **Endpoint público solo para firmar** (`S3_ENDPOINT_PUBLICO` usado por
  `urlFirma`): cambio menor y conserva el diseño archivado, pero mantiene la
  dependencia de que el navegador alcance el bucket, obliga a exponer MinIO/S3 al
  cliente (en producción, HTTPS público) y deja la URL firmada en el historial del
  navegador. Rechazada.
- **Proxy con streaming del objeto** para tamaños grandes: innecesario; la firma
  es un PNG acotado por la validación de inscripción
  (`firmaBase64` ≤ 400 000 caracteres ≈ 300 KB) y se ve de a una por clic.
- **Mantener el 302 y reescribir el host** de la URL firmada: rompería la firma
  SigV4, que cubre el encabezado `Host`. Descartada.

### D2. Contrato HTTP del visor

- `401` sin sesión y `403` sin rol `ADMINISTRADOR`: sin cambios.
- `404` "La inscripción no existe." cuando la inscripción no existe o no
  pertenece al evento: sin cambios (misma respuesta en ambos casos).
- `200` con `Content-Type: image/png`, `Content-Disposition: inline` y
  `Cache-Control: private, no-store` cuando la firma se sirve. `private, no-store`
  porque es evidencia de una persona concreta y no debe quedar en cachés
  intermedias ni en el disco del navegador más de lo necesario; con el `302`
  anterior esa ventana la controlaba la expiración de la URL.
- `404` "La firma no está disponible." cuando la inscripción existe pero la clave
  no está en el bucket (hoy el navegador recibía un `403` del propio bucket). No
  filtra nada: quien pregunta ya está autenticado como Administrador y conoce la
  inscripción.
- `500` solo si el almacenamiento falla de verdad, manteniendo el mensaje
  genérico actual.

### D3. `leerFirma` sustituye a `urlFirma`

`src/lib/storage.ts` gana `leerFirma(clave): Promise<{ bytes; contentType } | null>`
con `GetObjectCommand`, devolviendo `null` cuando el objeto no existe
(`NoSuchKey`/`NotFound`/`HTTP 404`) y relanzando cualquier otro error para que la
ruta responda `500`. `subirFirma` y `eliminarFirma` no se tocan. Se retiran
`urlFirma`, `EXPIRACION_FIRMA_SEG` y el import de `getSignedUrl` para no dejar
código muerto. La dependencia `@aws-sdk/s3-request-presigner` queda instalada y
sin uso.

### D4. El enlace "Ver firma" no se precarga

El `<Link>` de la fila apunta a un route handler, no a una página: la precarga de
Next dispara una `GetObject` por fila visible sin beneficio (se comprobó la
petición en la consola del navegador antes del arreglo). Se añade
`prefetch={false}` conservando `target="_blank"` y `rel`.

### D5. La spec se ajusta en la misma change

El requisito "Firma servida como URL firmada y temporal" deja de describir el
sistema, así que se retira y se reemplaza por "Firma servida por el visor
autenticado"; los requisitos "Acceso solo para Administradores", "Consulta por
evento e inscripción" y "Firma disponible en cualquier estado de la inscripción"
se modifican solo en los escenarios que nombraban la URL firmada. El `Purpose` de
la spec también deja de ser cierto y se actualiza **directamente en
`openspec/specs/admin/visor-firma/spec.md`**, no en la delta: OpenSpec ignora con
un aviso el `Purpose` de una delta cuando la capacidad ya existe, y así se hizo ya
en el change `gestion-de-claves` (Purpose de `admin/operadores` actualizado en el
commit de planificación).

## Risks / Trade-offs

- **La imagen pasa por el proceso Node.** Es un PNG acotado (≈300 KB) servido de
  a uno por clic de Administrador; el costo es despreciable. Si en el futuro se
  sirvieran muchas firmas a la vez (exportación masiva), habría que volver a
  evaluar el streaming o las URLs firmadas.
- **Se pierde la entrega por URL firmada.** Con ella se podía delegar el tráfico
  del objeto al almacenamiento (CDN incluida); hoy no hay caso de uso, pero si
  aparece uno, habría que reintroducir una vía de URL firmada —con un endpoint
  público de bucket— además del visor.
- **Dependencia sin uso** (`@aws-sdk/s3-request-presigner`) hasta acordar su
  retiro con la Persona B; es ruido de `package.json`, no un riesgo funcional.
- **Distinguir "objeto ausente"** con un `404` propio agrega una respuesta nueva;
  se acepta porque el llamador ya es Administrador y ya conoce la inscripción, y
  porque un error de almacenamiento disfrazado de `404` sería peor para operación.
- **Pruebas e2e y de integración no cubren topología**: en el harness la app corre
  en el host y el almacenamiento sí es alcanzable. Este change justamente elimina
  esa dependencia, pero la verificación en el contenedor (tarea 4.2) sigue siendo
  la que valida el caso reportado.
