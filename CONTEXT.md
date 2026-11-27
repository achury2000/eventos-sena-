# CONTEXT.md — Plataforma de Gestión de Eventos, Bienestar al Aprendiz (SENA)

Este documento da contexto de negocio, arquitectura y reglas del proyecto. Está
pensado tanto para personas nuevas en el equipo como para asistentes de IA
(Claude Code, Copilot, etc.) que trabajen sobre este repositorio. Si eres una
IA generando o modificando código aquí, lee este archivo completo antes de
proponer cambios de arquitectura o de reglas de negocio.

## 1. Qué es este proyecto

Bienestar al Aprendiz (SENA, Colombia) organiza eventos y paseos en los que se
inscriben aprendices y funcionarios. Hoy ese proceso es 100% físico: planillas
en papel y firma manual de cada asistente. Esta plataforma lo digitaliza:
inscripción, firma digital, y control de asistencia en distintos puntos del
evento (comidas, transporte, hotel).

**Aforo esperado:** hasta 1000 personas por evento (titulares + acompañantes).

## 2. Roles

Solo dos roles tienen cuenta de usuario con login. Nadie del lado de los
asistentes (ni titulares ni acompañantes) tiene cuenta.

| Rol | Quién es | Tiene login |
|---|---|---|
| Administrador | Personal de Bienestar al Aprendiz | Sí |
| Operador | Personal SENA o de empresa externa | Sí |
| Asistente (titular o acompañante) | Persona que va al evento | **No** |

**Importante para IA:** no propongas agregar registro/login para asistentes.
Se decidió explícitamente que no tienen cuenta — se identifican con su
documento cada vez, igual en la inscripción que en los checkpoints. Esto fue
una decisión deliberada, no un descuido del modelo.

## 3. Flujo de negocio, de punta a punta

1. **Administrador** crea el evento (fechas, lugar, cupo total en personas,
   si incluye bus/hotel) y define el periodo de inscripción.
2. Administrador configura los **checkpoints** del evento (desayuno, almuerzo,
   refrigerio, bus ida/vuelta, check-in hotel, etc. — son configurables por
   evento: el nombre es libre, `tipo` es solo una categoría amplia para
   agrupar en reportes).
3. Administrador asigna uno o más **Operadores** al evento.
4. **Un titular (Aprendiz/Funcionario) se inscribe**, indicando: su nombre y
   documento, centro de formación (opcional, escrito por él mismo como texto
   libre: no hay catálogo ni lista cerrada), correo (opcional, para
   confirmación), el nombre y documento de cada acompañante que llevará, y
   firma digitalmente
   **una sola vez** — esa firma es una autorización/compromiso que cobija a
   todo el grupo (titular + acompañantes), no una firma por persona. También
   acepta la casilla de tratamiento de datos (cubre datos personales y
   biométricos de todo el grupo).
   - **Cada persona del grupo (titular y cada acompañante) cuenta contra el
     cupo del evento** — si el cupo es 10 y un titular lleva 2 acompañantes,
     quedan 7 disponibles, no 9.
   - **Cada persona del grupo se puede identificar individualmente en los
     checkpoints por su propio documento** — un acompañante no es un dato
     secundario, es una persona más que se autoregistra igual que el
     titular.
   - Se puede **cancelar la inscripción completa** (todo el grupo) para
     liberar esos cupos. **No hay lista de espera**: una vez lleno el cupo,
     simplemente no se puede inscribir más gente.
5. Si el evento incluye hotel, el Administrador asigna habitaciones
   **manualmente** desde su panel, **por persona** (una familia puede
   necesitar más de una habitación).
6. El día del evento, cada checkpoint tiene un **QR fijo de estación**
   (impreso, uno por checkpoint, no uno por persona), que el Operador
   **activa/desactiva** según aplique. Cada persona (titular o acompañante)
   escanea el QR con un celular y es dirigida a un formulario donde ingresa
   **solo su número de documento** (no su nombre). El backend valida que el
   checkpoint esté activo, que el documento corresponda a un asistente real
   de ese evento, y bloquea que el mismo documento reclame el mismo
   checkpoint dos veces.
7. El **Operador** no escanea nada: su rol es de vigilancia/supervisión. Ve un
   panel con indicadores en tiempo real (ej. "148/200 almuerzos"), activa/
   desactiva checkpoints, y puede hacer un **registro manual asistido** para
   alguien sin celular o con problemas de conexión.
8. Al cerrar el evento, el Administrador exporta el reporte de asistentes
   esperados vs. asistencia real por checkpoint. **Cancelar un evento es
   siempre cambiar su estado a `CANCELADO`, nunca borrarlo** — se conserva
   todo el historial de inscripciones y registros.

## 4. Decisiones de diseño clave (y por qué)

Estas decisiones tuvieron alternativas consideradas y descartadas. Si una IA
propone "mejorar" algo revirtiendo a la alternativa descartada, probablemente
está equivocada — lee el porqué antes de cambiarlo.

- **QR fijo por checkpoint, no QR personal por asistente.** Se evaluó primero
  un QR personal escaneado por el Operador (más seguro contra fraude, pero
  crea cuello de botella con 1000 personas y un solo operador escaneando). Se
  decidió cambiar a QR fijo + autoregistro para eliminar ese cuello de
  botella, aceptando a cambio que ya no hay verificación visual del Operador
  — por eso el Operador mantiene presencia física de vigilancia, y por eso
  existe la activación/desactivación manual del checkpoint.
- **Solo documento de identidad en el autoregistro, sin nombre.** El nombre no
  aporta a la validación (la búsqueda es por documento).
- **Sin cuenta de usuario para asistentes** (ni titulares ni acompañantes).
  Evita fricción de registro para miles de personas que usan la app una vez
  cada tanto, y es consistente con que los checkpoints tampoco usan cuenta.
- **`Inscripcion` (el trámite) y `Asistente` (la persona) son entidades
  separadas, no una tabla `Acompanante` colgando de `Inscripcion`.** Se
  descartó tener `numAcompanantes` (un simple contador) más una tabla
  `Acompanante` secundaria, porque quedaban dos fuentes de verdad que podían
  desincronizarse, y porque los acompañantes necesitan identificarse por
  documento en los checkpoints exactamente igual que el titular — no pueden
  ser un dato secundario. `Asistente` unifica titular y acompañantes: el
  titular es el `Asistente` con `esTitular = true` de esa `Inscripcion`. Si
  ves un campo `numAcompanantes` o una tabla `Acompanante` separada en el
  código, es una regresión al diseño descartado.
- **La firma es del titular, una vez por inscripción, no una por persona.**
  Se decidió así porque, a diferencia del proceso en papel (donde cada
  asistente firmaba como prueba de asistencia física — rol que ahora cumplen
  los checkpoints), la firma digital en la inscripción es una autorización
  que el titular da por todo el grupo, incluyendo acompañantes que
  normalmente ni siquiera están presentes al momento de inscribirse online.
  Por eso `firmaUrl` vive en `Inscripcion`, no en `Asistente`.
- **Los acompañantes cuentan contra el cupo del evento**, igual que el
  titular — el cupo representa personas totales (relevante para dimensionar
  comida, buses, habitaciones), no trámites de inscripción. El `UPDATE`
  atómico de cupo (sección 7) incrementa por el total de personas del grupo,
  no siempre por 1.
- **Comportamiento offline "tipo Facebook", no offline-first completo.** Se
  puede ver la app sin conexión: el service worker guarda el HTML y los
  payloads RSC de las páginas visitadas y los sirve cuando la red falla o no
  responde en 3 s; si no hay copia, muestra `/offline`. Las copias vencen a las
  24 h, hay un máximo de 40 documentos y se borran al iniciar y cerrar sesión.
  Registrar (inscripción o checkpoint) requiere internet en el momento: no hay
  IndexedDB, guardado local ni sincronización diferida, y el envío sin red se
  bloquea con un aviso. La API y la firma nunca se cachean. **Trade-off
  aceptado:** si no hay señal en el sitio del evento, no se puede registrar a
  nadie hasta que vuelva. Ver pendiente de conectividad en la sección 10.
- **PWA instalable, no apps nativas.** Manifest e iconos propios, modo
  `standalone`, botón de instalación permanente en la franja institucional
  (prompt nativo en Chrome/Android, instrucciones en iOS y, si Chrome/Edge no
  expone el prompt, instrucciones para instalar desde el menú) y actualización
  automática del service worker sin recargar la pestaña. Las decisiones de
  cacheo y privacidad están en `openspec/changes/pwa-offline/design.md`
  (D1–D11).
- **Next.js monolítico, no frontend/backend separados** — excepto que
  inscripción y autoregistro por checkpoint se implementan como Route
  Handlers, no Server Actions, para poder probarlos aislados contra
  condiciones de carrera (ver sección 6).
- **Sin restricciones de despliegue del SENA** — confirmado con el cliente.
- **Una sola casilla de consentimiento** (no dos separadas) en la
  inscripción, cubriendo datos personales y biométricos (firma) de todo el
  grupo. Texto exacto pendiente de jurídica SENA (sección 10).
- **`RegistroControl` no tiene campo `resultado`.** Solo el caso exitoso
  (`OK`) puede persistirse como fila real — los demás casos
  (`YA_REGISTRADO`/`NO_ENCONTRADO`/`CHECKPOINT_NO_ACTIVO`) se rechazan antes
  de insertar (por la restricción única o por validación previa), así que
  guardarlos como columna sería redundante y engañoso. Viven como un tipo de
  TypeScript en la capa de API, no en la base de datos.
- **Cancelar un evento es un `UPDATE` de `estado` a `CANCELADO`, nunca un
  `DELETE`.** Por eso `Inscripcion.evento` usa `onDelete: Restrict`: impide
  borrar un evento que tiene inscripciones, a propósito, para conservar
  historial y evidencia (firmas, aceptación de tratamiento de datos,
  registros de checkpoint).

## 5. Modelo de datos (entidades principales)

| Entidad | Notas clave |
|---|---|
| `USUARIO` | Solo Administrador y Operador. Tiene login. Los asistentes NO están aquí. `centroFormacion` es texto libre: obligatorio para Administrador y opcional para Operador. |
| `EVENTO` | `cupoMaximo`/`cuposOcupados` cuentan personas totales (titulares + acompañantes), no trámites. `maxAcompanantes` es el tope de acompañantes **por inscripción**, configurable por el Administrador: `0` significa "inscripción individual" y es un valor de configuración legítimo, **no** un centinela de "sin límite" (ningún valor de este campo equivale a ilimitado; el techo es `MAX_ACOMPANANTES_TECNICO` en `src/lib/limites.ts`). No hay un campo booleano que lo acompañe: `maxAcompanantes > 0` ya es el hecho derivado, y guardar el derivado en dos lugares es la divergencia que la sección 4 ya rechazó. Bajar el límite nunca invalida las inscripciones existentes. `estado` incluye `CANCELADO` — cancelar nunca es un `DELETE`. |
| `CHECKPOINT` | Configurable por evento (`nombre` libre). `tipo` es solo una categoría amplia (enum), no la lista específica de checkpoints. Tiene `codigoQr` (token fijo de la estación) y `activo` (lo controla el Operador). `activadoPorId` guarda quién hizo el último cambio de `activo` — es el último Operador que lo tocó, no un historial completo de cada activación/desactivación. |
| `INSCRIPCION` | El **trámite/grupo**, no la persona: fecha, `firmaUrl` (una sola, del titular, cubre a todo el grupo), `aceptoTratamientoDatos`, `estado`. Ya NO tiene `nombreCompleto`/`documento`/`centroFormacion`/`numAcompanantes` — esos viven en `Asistente`. |
| `ASISTENTE` | Cada **persona** física del grupo (titular o acompañante), con el mismo tratamiento: `nombreCompleto`, `documento` (obligatorio, único por evento), `esTitular`, `eventoId` (denormalizado desde `Inscripcion` para el `@@unique([eventoId, documento])` y para indexar checkpoints). No hay tabla `Acompanante` separada. |
| `REGISTRO_CONTROL` | Un registro por autoregistro/registro manual en un checkpoint, apunta a `Asistente` (no a `Inscripcion`) — titular y acompañantes se autoregistran igual. `operadorId` opcional (solo si fue manual). Restricción única `(asistenteId, checkpointId)` + índice en `checkpointId` para el dashboard. No tiene campo `resultado` (ver sección 4). |
| `HABITACION` | Solo si el evento incluye hotel. Asignación M:N con `Asistente` (no con `Inscripcion`) — una familia puede necesitar varias habitaciones. Siempre manual, por el Administrador. |

**Importante para IA:** no le agregues `codigoQr` a `Inscripcion` ni a
`Asistente` (el QR vive en `Checkpoint`), no le agregues `usuarioId` a
`Inscripcion`/`Asistente` (los asistentes no tienen cuenta), y no
reintroduzcas `numAcompanantes` ni una tabla `Acompanante` separada (ver
sección 4).

## 6. Arquitectura técnica

- **Patrón:** monolito modular. Un solo proyecto Next.js, organizado
  internamente por dominios (eventos/checkpoints, inscripciones,
  autenticación, reportes), no microservicios.
- **Generación de QR:** token único y aleatorio por checkpoint
  (`crypto.randomUUID()` o `nanoid`), codificado en una imagen QR (librería
  `qrcode`) que apunta a `/checkpoint/[token]`.
- **Dashboard del Operador:** polling cada 5-10s a un endpoint con `COUNT`
  agrupado por `checkpointId`. Requiere el índice `@@index([checkpointId])`
  en `RegistroControl` (el índice de la restricción única no sirve para esto
  porque `asistenteId` va primero — regla del prefijo izquierdo). No usar
  WebSockets/pub-sub salvo que el cliente pida actualización instantánea.
- **Firma digital:** captura en canvas (`react-signature-canvas`) durante la
  inscripción (una vez, del titular), se sube a almacenamiento de archivos
  **privado** (Vercel Blob o S3-compatible), y en `Inscripcion` solo se
  guarda la referencia — nunca la imagen en base64 en la base de datos.
  Acceso solo vía URL firmada y temporal, generada para el Administrador.
- **Autenticación:** Auth.js v5 (`next-auth@beta`, versión fijada exacta en
  `package.json` — ver sección 8), Credentials Provider, contraseñas
  hasheadas (bcrypt/argon2), sesión JWT en cookie `httpOnly`. Las cuentas de
  Operador las crea/invita el Administrador — no hay autorregistro.
- **Offline:** service worker propio en `public/sw.js` (sin dependencias).
  Red primero con timeout de 3 s para HTML y payloads RSC, con respaldo en
  caché versionada; caché primero para `/_next/static/`, iconos y logo;
  stale-while-revalidate para el resto de assets. Nunca se cachean `/api/*`,
  métodos distintos de GET ni prefetch. Las copias de documentos llevan
  `x-pwa-guardado-en` y vencen a las 24 h. El registro del service worker solo
  ocurre en producción. La lógica compartida vive en `src/lib/pwa/` y los
  componentes de aviso en `src/components/pwa/`.
- **Middlewares — importante distinguir dónde vive cada validación:**
  `middleware.ts` corre en Edge Runtime, con acceso limitado (Prisma con
  Postgres normalmente no funciona ahí sin un driver especial). Por eso:
  - **En `middleware.ts` (Edge, global):** validar sesión de Auth.js (JWT y
    rol), y rate limiting con Upstash Redis (ver sección 7).
  - **En el route handler específico (Node runtime, no Edge):** verificar
    que el Operador tenga el evento asignado, y que el checkpoint esté
    `activo` — ambas requieren consultar la base de datos con Prisma.
- **Headers de seguridad:** `Content-Security-Policy`, `X-Frame-Options` y
  `Strict-Transport-Security` — hay formularios públicos sin autenticación
  recibiendo datos personales.
- **Route Handlers, no Server Actions, para inscripción y autoregistro por
  checkpoint.** Para poder probarlos aislados contra condiciones de carrera
  (peticiones concurrentes con `curl`/pruebas de integración). El resto de
  los módulos puede usar Server Actions libremente.
- **shadcn/ui como librería de componentes base**, para que el trabajo
  posterior de diseño visual sea principalmente cambiar tokens (colores,
  tipografía, espaciados), no reescribir la estructura de formularios ya
  construidos y probados.

## 7. Concurrencia, integridad de datos y protección de endpoints

Estos puntos importan porque fallan solo bajo concurrencia real (1000
personas), no en pruebas manuales de una sola persona.

**Cupo del evento — condición de carrera, y cuenta personas, no trámites.**
Nunca "verificar cupo, luego insertar" desde la aplicación. El incremento es
por el **total de personas del grupo** (titular + acompañantes), y la
condición debe validar que la suma quepa exactamente, no solo que quede algo
de cupo:

```ts
const totalPersonas = 1 + acompanantes.length; // titular + acompañantes

const inscripcion = await prisma.$transaction(async (tx) => {
  const filas = await tx.$executeRaw`
    UPDATE "eventos" SET "cuposOcupados" = "cuposOcupados" + ${totalPersonas}
    WHERE id = ${eventoId}
      AND "cuposOcupados" + ${totalPersonas} <= "cupoMaximo"
      AND "estado" = 'INSCRIPCIONES_ABIERTAS'
      AND ${totalPersonas} <= 1 + "maxAcompanantes"
  `;
  if (filas === 0) throw new Error("EVENTO_RECHAZO_INSCRIPCION");

  const inscripcion = await tx.inscripcion.create({ data: { eventoId, ...datosInscripcion } });
  await tx.asistente.create({
    data: { inscripcionId: inscripcion.id, eventoId, esTitular: true, ...datosTitular },
  });
  for (const a of acompanantes) {
    await tx.asistente.create({
      data: { inscripcionId: inscripcion.id, eventoId, esTitular: false, ...a },
    });
  }
  return inscripcion;
});
```

Al cancelar una inscripción, decrementar `cuposOcupados` por el mismo total
de personas del grupo, en la misma transacción que actualiza `estado`.

**Límite de acompañantes — misma línea, por la misma razón.** El `WHERE` de
arriba combina tres condiciones (cupo, estado abierto, tope de acompañantes)
porque las tres son compuertas del mismo `UPDATE`: si el tope se comprobara
aparte, quedaría una ventana entre la comprobación y el incremento. Cuando
`filas === 0` hay **tres** causas posibles y el `WHERE` no dice cuál, así que
hace falta una re-consulta que las distinga en orden: `403` si las inscripciones
ya no están abiertas, `422` si el grupo excede el tope del evento, `409` si el
cupo está lleno. Fuera de esa re-consulta puede haber un **pre-chequeo** que
evite subir la firma al bucket para una petición que va a ser rechazada igual
(`422`); no es la autoridad, la autoridad es la condición del `UPDATE`.

**Nada de centrinelas numéricos.** `0` en `maxAcompanantes` significa
"inscripción individual", no "sin límite". Un valor que significa "ilimitado"
y otro que significa "ninguno" no pueden convivir en el mismo campo, y un
centinela obligaría a cada cliente a interpretarlo.

**Duplicados en checkpoints.** No "verificar si existe, luego insertar":
usar la restricción única `@@unique([asistenteId, checkpointId])` en
`RegistroControl`, e intentar insertar siempre, capturando el error de
duplicado (`P2002` en Prisma) en vez de prevenirlo con una consulta previa.
`RegistroControl` no tiene un campo `resultado` en la base de datos (ver
sección 4) — los cuatro resultados posibles viven como tipo de TypeScript en
la capa de API.

**Rate limiting.** Con Upstash Redis (compatible con Edge y con instancias
serverless sin memoria compartida):
- Login: estricto (ej. 5 intentos/15 min por IP) contra fuerza bruta.
- Autoregistro en checkpoint: más permisivo (ej. 30/min por IP) — el sitio
  del evento puede tener una sola red wifi con cientos de personas
  compartiendo la misma IP pública (NAT). El propósito aquí es también
  evitar enumeración de documentos inscritos, no solo abuso genérico.

**Validación de entrada (Zod).** Los formularios de inscripción y
autoregistro son públicos y sin autenticación. Validar siempre en el
servidor (la validación de cliente es solo UX):

```ts
// El centro de formación es texto libre (no hay catálogo): solo el titular lo
// declara y es opcional. Los acompañantes envían nombre y documento.
export const esquemaAsistente = z.object({
  nombreCompleto: z.string().min(3).max(150),
  documento: z.string().regex(/^\d{6,12}$/),
  centroFormacion: z.string().trim().min(3).max(200).optional(),
});

export const esquemaInscripcion = z.object({
  titular: esquemaAsistente,
  acompanantes: z.array(esquemaAsistente).max(10),
  correo: z.string().email().optional(),
});
```

## 8. Stack y versiones fijadas

| Tecnología | Versión |
|---|---|
| Node.js | 24.x LTS (ver `.nvmrc`) |
| Next.js | 16.x |
| PostgreSQL | 18.x |
| Prisma | 7.x — requiere un archivo de config en la raíz (en este repo es `prisma7.config.ts`, que Prisma 7 autodetecta; ya no se usa `env()`/`url` en el `datasource` de `schema.prisma`) y un driver adapter explícito (`@prisma/adapter-pg` para Postgres) al crear el cliente. |
| Auth.js | v5 (`next-auth@beta`, fijado exacto con `--save-exact`, no usar `^`) |

Instalación de Auth.js: `npm install next-auth@beta --save-exact`.
Dependencias adicionales por el cambio de Prisma 7: `npm install dotenv @prisma/adapter-pg pg` y `npm install -D @types/pg`.

## 9. Infraestructura, Docker, notificaciones, testing y CI/CD

**Docker — cinco servicios:** `db` (PostgreSQL 18), `storage` (MinIO compatible
con S3, solo para desarrollo), `storage-init` (crea el bucket) y, en el
profile `full`, `migrate` (aplica migraciones + seed) y `app`.
- Desarrollo normal: solo `db` y `storage` en Docker; la app corre local con
  `npm run dev` (`scripts/dev.sh`).
- Entorno completo dockerizado: `scripts/docker-full.sh`
  (`docker compose --profile full up --build`). Requiere un `.env` en la raíz
  (copia de `.env.example`): `app` y `migrate` lo cargan con `env_file`.
- Imagen de MinIO: antes se usaba `quay.io/minio/minio`/`quay.io/minio/mc`,
  cuyos tags fueron eliminados del registro. Hoy se usa `cgr.dev/chainguard/minio`
  (fijada por digest en `docker-compose.yml`), que incluye el cliente `mc`;
  el healthcheck y `storage-init` ya no dependen de `curl`.
- Producción probable: Next.js en Vercel. La base de datos en producción
  **todavía no está decidida** entre proveedor gestionado o el contenedor
  `db` autogestionado — ver pendientes (sección 10).

**Notificación de confirmación:** `correo` opcional en `Inscripcion`. El envío
está implementado en `src/lib/email.ts` y el transporte se resuelve en
`src/lib/email/transporte.ts`: si existe al menos una variable `SMTP_*` usa
SMTP; si no existe ninguna, usa Resend cuando están `RESEND_API_KEY` y
`EMAIL_FROM`. Una configuración SMTP parcial no cae a Resend. El route de
inscripción programa el envío con `after()` **únicamente después** de que la
transacción con cupo atómico se confirma exitosamente, y solo si el titular dejó
correo. Falla abierta: sin transporte configurado no envía y advierte una vez por
proceso; un fallo del proveedor nunca se propaga a la respuesta (la persona ya
vio la confirmación en pantalla, así que el correo es una cortesía). Credenciales
y remitente por variables de entorno; ver `.env.example`.

**Backups:** depende de la decisión pendiente de proveedor de base de datos
(sección 10). Si es gestionado: confirmar point-in-time recovery y probar
restauración. Si es autogestionado: `pg_dump` programado a almacenamiento
externo, retención definida, restauración probada explícitamente.

**Testing:** priorizar pruebas de integración contra Postgres real para los
escenarios de concurrencia de la sección 7 (cupo con inscripciones de varias
personas simultáneas; duplicados en checkpoint), más pruebas end-to-end
(Playwright) de los flujos críticos completos.

**CI/CD (GitHub Actions sugerido):** en cada PR, lint + typecheck + tests; al
hacer merge a `main`, build y despliegue a Vercel. Las migraciones
(`prisma migrate deploy`) deben aplicarse antes de que el código nuevo reciba
tráfico.

**Auditoría:** no se construye una tabla de historial de cambios (nadie la ha
pedido). Sí se agrega `actualizadoEn DateTime @updatedAt` en `Evento`,
`Checkpoint` e `Inscripcion` — lo mantiene Prisma automáticamente, sin lógica
adicional, útil para ordenar/depurar aunque no exista auditoría formal.
`Checkpoint` además tiene `activadoPorId`, que sí se justifica como caso de
uso operativo concreto (saber qué Operador activó/desactivó un checkpoint,
relevante con varios Operadores en el mismo evento) — pero registra solo el
último cambio, no un historial de cada activación/desactivación. Si en el
futuro se necesita saber "quién cambió qué" de forma más completa, eso es una
funcionalidad nueva con su propio alcance, no algo a resolver ahora.

## 10. Pendientes conocidos (no resueltos aún con el cliente/equipo)

- **Confiabilidad de la señal/internet en los sitios de evento.** Crítico
  porque el comportamiento offline simple (sección 4) significa que sin
  señal no se puede registrar a nadie.
- **Proveedor de base de datos en producción:** aún no decidido entre
  proveedor gestionado (Neon, Supabase, etc.) o el contenedor `db`
  autogestionado. Afecta la estrategia de backups (sección 9).
- **Texto del aviso de tratamiento de datos (Ley 1581, Habeas Data):**
  pendiente de que jurídica del SENA lo redacte, incluyendo el tratamiento
  del dato biométrico (firma) y que cubre a todo el grupo (titular +
  acompañantes). El modelo ya reserva los campos necesarios.

## 11. Notas para asistentes de IA trabajando en este repo

- No reintroduzcas login para asistentes (titulares o acompañantes) — fue
  descartado deliberadamente (sección 4).
- No agregues sincronización offline (IndexedDB, Background Sync API,
  colas de reintento) sin que alguien lo pida explícitamente.
- No caches respuestas de `/api/*`, firmas ni flujos de autenticación en el
  service worker: `public/sw.js` debe seguir siendo "solo red" para eso
  (sección 4). Tampoco agregues escrituras offline: el guardia global bloquea el
  envío sin red y la persona reintenta manualmente.
- Si cambias la lógica o los nombres de caché, incrementa `VERSION` en
  `public/sw.js` y `PWA_VERSION` en `src/lib/pwa/constantes.ts`. Conserva el
  `sw.js` de baja documentado en el encabezado del archivo durante al menos un
  release: un service worker ya instalado no desaparece solo porque el archivo
  deje de existir.
- No agregues de vuelta un campo `resultado` a `RegistroControl` — solo
  `OK` puede persistirse como fila real (sección 7). Maneja los demás casos
  como tipo de TypeScript en la capa de API.
- No reviertas `Asistente` a un `numAcompanantes` + tabla `Acompanante`
  separada — fue descartado a propósito porque generaba dos fuentes de
  verdad y no permitía identificar a cada acompañante por documento en los
  checkpoints (sección 4).
- No muevas `firmaUrl` a `Asistente` — es del titular, una vez por
  `Inscripcion`, cubre a todo el grupo (sección 4).
- No cambies el `UPDATE` atómico de cupo para que incremente siempre `+1`
  — debe incrementar por el total de personas del grupo (titular +
  acompañantes), con la condición `cuposOcupados + total <= cupoMaximo`
  (sección 7).
- No implementes "cancelar evento" como un `DELETE` — es un `UPDATE` de
  `estado` a `CANCELADO` (sección 4). `Inscripcion.evento` usa
  `onDelete: Restrict` a propósito para impedir el borrado accidental.
- No cambies las versiones fijadas en la sección 8 sin confirmarlo.
- No trates `Evento.maxAcompanantes === 0` como "sin límite" ni le restes uno.
  `0` es "inscripción individual" (sección 5), y el techo absoluto es
  `MAX_ACOMPANANTES_TECNICO` en `src/lib/limites.ts` — un módulo hoja sin imports
  justamente para que tanto el esquema del evento como el de inscripción puedan
  leerlo.
- No agregues un `permiteAcompanantes: boolean` a `Evento` para representar "no
  admite acompañantes". El radio Sí/No del formulario es una decisión de
  interfaz: el servidor deriva el entero y persiste solo `maxAcompanantes`
  (sección 4). Un booleano guardado sería un hecho derivado duplicado, con un
  estado contradictorio `(true, 0)` que el entero solo hace imposible.
- No confíes en el entero que manda el cliente desde el formulario de evento.
  `leerCampoEvento` lo deriva de la elección Sí/No; un `0` enviado a mano
  junto al radio en "Sí" debe rechazarse, igual que un radio ausente (un grupo
  de radio sin opción marcada no envía el campo, y defaultarlo a `false`
  guardaría el evento en silencio como inscripción individual).
- No quemes el tope del evento con el `.max()` de `esquemaInscripcion`: ese
  `.max()` es la guarda estructural del array y se queda en el techo técnico; la
  regla de negocio se valida en el route handler, con su propio mensaje y su
  propio código de estado (sección 7).
- No bajes el límite de un evento invalidando lo ya inscrito — bajar el tope
  solo afecta las inscripciones nuevas (sección 5).
- No pongas validaciones que requieran Prisma/base de datos dentro de
  `middleware.ts` — van en el route handler correspondiente (sección 6).
- **En tareas de rediseño o pulido visual:** modifica solo el marcado y los
  estilos. No toques la lógica de validación (Zod), el manejo de estado del
  formulario, ni las llamadas a la API/Route Handlers en el mismo cambio —
  especialmente en inscripción y autoregistro por checkpoint. Si un cambio
  visual parece requerir tocar esa lógica, pregunta antes.
- Si vas a tomar una decisión de arquitectura no cubierta aquí, es libre de
  decidir siguiendo el patrón de monolito modular ya establecido — pero si
  la decisión afecta reglas de negocio (cupos, checkpoints, roles, datos
  personales), pregunta primero.
