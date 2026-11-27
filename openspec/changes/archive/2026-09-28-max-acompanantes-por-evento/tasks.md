# Tasks

## 1. Modelo de datos

- [x] 1.1 Agregar `maxAcompanantes Int @default(3)` al modelo `Evento` en
  `prisma/schema.prisma` con un comentario que explique que `0` significa
  inscripción individual y que el campo nunca significa "sin límite" (design D8);
  verificar leyendo el archivo y confirmando que el enum y el resto del modelo
  quedaron intactos
- [x] 1.2 Ejecutar `npx prisma migrate dev --name max_acompanantes_por_evento` y
  verificar que la migración contiene
  `ALTER TABLE "eventos" ADD COLUMN "maxAcompanantes" INTEGER NOT NULL DEFAULT 3`
  y que `npx prisma migrate status` la reporta aplicada
- [x] 1.3 Ejecutar `npx prisma generate` y verificar que
  `src/generated/prisma/models/Evento.ts` expone `maxAcompanantes`

## 2. Constante compartida y validaciones de dominio

- [x] 2.1 Crear `src/lib/limites.ts` sin imports, exportando
  `MAX_ACOMPANANTES_TECNICO = 10` y `MAX_ACOMPANANTES_POR_DEFECTO = 3`, con
  comentarios que expliquen que el primero es el techo estructural y el segundo
  el valor por defecto ante ausencia de configuración (design D3, D4); verificar
  con `npx tsc --noEmit` que el módulo compila
- [x] 2.2 En `src/lib/validations/admin.ts`, agregar `maxAcompanantes` a
  `eventoSchema` usando `z.preprocess` para convertir la cadena vacía en
  `undefined` antes de `z.coerce.number().int().min(0).max(MAX_ACOMPANANTES_TECNICO)`,
  y agregar el `refine` que exige `maxAcompanantes + 1 <= cupoMaximo` (design
  D5); verificar ejecutando el esquema contra `""`, `0`, `3`, `10`, `11` y un
  valor incoherente con el cupo
- [x] 2.3 Confirmar que `esquemaInscripcion` en
  `src/lib/validations/inscripcion.ts` conserva `.max(MAX_ACOMPANANTES_TECNICO)`
  como guarda estructural del array y NO recibe el valor del evento (design
  D10); verificar que el array sigue aceptándose vacío
- [x] 2.4 En `src/lib/actions/admin/eventos.ts`, derivar el entero en el servidor
  a partir de los dos campos separados del `FormData` (la elección Sí/No y el
  número), de modo que la respuesta "No" produzca siempre `0` y el servidor nunca
  acepte un `0` enviado por el cliente con la respuesta "Sí" (design D11);
  verificar enviando a la acción `maxAcompanantes=0` junto al radio en "Sí" y
  confirmar que el valor persistido es el número, no 0

## 3. Endpoint de inscripción

- [x] 3.1 En `src/app/api/inscripciones/route.ts`, agregar el pre-chequeo de
  acompañantes inmediatamente después de `validarEventoParaInscripcion` y antes
  de `subirFirma`, devolviendo `422` con un mensaje que nombre el límite del
  evento; verificar que una petición con exceso de acompañantes devuelve `422`
  y que el bucket no recibe ningún objeto nuevo
- [x] 3.2 Agregar al `UPDATE` atómico la condición
  `AND ${totalPersonas} <= 1 + ${maxAcompanantes}`, en la misma línea
  condicional que ya protege el cupo y el estado (design D6, D7); verificar
  leyendo el SQL generado que las tres condiciones conviven en un solo `WHERE`
- [x] 3.3 Reemplazar la desambiguación actual de `filas === 0` por una única
  re-consulta que traiga `estado`, `cupoMaximo`, `cuposOcupados` y
  `maxAcompanantes`, y decidir en orden: `403` si las inscripciones no están
  abiertas, `422` si el grupo excede el máximo, `409` si el cupo está lleno
  (design D7); verificar los tres caminos con un evento real en cada estado
- [x] 3.4 Verificar que la ruta de éxito no se degrada: una inscripción de
  titular + 1 acompañante en un evento con máximo 2 devuelve `201`, y una
  inscripción de titular solo en un evento con máximo 0 devuelve `201`
  consumiendo exactamente 1 cupo

## 4. Panel de administración

- [x] 4.1 En `src/app/admin/eventos/form-evento.tsx`, reemplazar el concepto de
  "campo numérico" por el control Sí/No + número condicional (design D2, D11):
  agregar un radio "¿Este evento permite acompañantes?" con `<input
  type="radio">` nativo, sin componente nuevo ni dependencia, y mostrar el campo
  numérico con `min={1}`, `max={MAX_ACOMPANANTES_TECNICO}` y `required`
  únicamente cuando la respuesta es "Sí"
- [x] 4.2 Inicializar el estado del control desde el evento recibido: `0`
  selecciona "No" y cualquier valor mayor selecciona "Sí" con el número
  precargado; para el alta sin evento, seleccionar "Sí" con
  `MAX_ACOMPANANTES_POR_DEFECTO` (3) como valor inicial.
  `/admin/eventos/[id]/editar` ya pasa el evento completo de
  `prisma.evento.findUnique` sin `select`, así que `maxAcompanantes` llega sin
  cambios en esa página. Verificar en `/admin/eventos/nuevo` y en el formulario
  de edición de un evento existente con límite 0, que en ambos casos el radio
  refleja el valor guardado
- [x] 4.3 Conserva el número en estado local del componente cuando el
  Administrador cambia de "Sí" a "No" y vuelve a "Sí", sin borrarlo; si nunca se
  escribió, el valor de partida es `MAX_ACOMPANANTES_POR_DEFECTO`. VERIFICADO
  interactivamente en `/admin/eventos/nuevo` (inicial "Sí" con 3; se escribió 5,
  se cambió a "No" — el campo se desmonta — y de vuelta a "Sí" — el 5 reaparece,
  no 3 ni vacío) y en la edición de un evento con límite 0 (radio "No"
  preseleccionado y campo oculto; al pasar a "Sí" aparece 3, nunca 0)
- [x] 4.4 Agregar el texto de ayuda que aclare que la cantidad son personas
  **adicionales** al titular, que el máximo es
  `MAX_ACOMPANANTES_TECNICO` y que "No" deja el evento como inscripción
  individual; verificar visualmente en `/admin/eventos/nuevo` que el copy se lee
  sin necesidad de documentación externa
- [x] 4.5 Mostrar el límite en el detalle de `/admin/eventos/[id]`, junto al
  `<Dato label="Cupo">` que ya existe en ese archivo, redactado según el valor
  ("sin acompañantes" cuando es 0, en vez de un 0 suelto). Verificar que tanto
  un evento con límite 0 como uno con límite 5 se leen sin ambigüedad
- [x] 4.6 Verificar que guardar con la respuesta "Sí" y el número en blanco NO
  crea ni actualiza el evento y muestra un error de validación requiriendo el
  valor, en lugar de guardarlo como `0` (design D5, D11)
- [x] 4.7 Verificar que elegir "No" y guardar persiste `maxAcompanantes = 0` sin
  que el campo numérico aparezca ni sea enviado

## 5. Formulario público de inscripción

- [x] 5.1 En `src/app/inscripcion/[eventoId]/page.tsx`, agregar
  `maxAcompanantes` al `select` del evento y pasarlo a `FormInscripcion` en el
  objeto `evento`; verificar con `npx tsc --noEmit`
- [x] 5.2 En `src/app/inscripcion/[eventoId]/form-inscripcion.tsx`, reemplazar la
  constante `MAX_ACOMPANANTES` por el valor recibido en la prop `evento` en el
  contador del encabezado, en la condición de deshabilitado del botón y en el
  texto del estado vacío; verificar que el límite mostrado es el del evento y no
  10
- [x] 5.3 Ramificar la sección de acompañantes: cuando el evento tenga máximo 0,
  ocultar el encabezado, el botón y la lista, y mostrar en su lugar un mensaje
  de que el evento es de inscripción individual (design D9); verificar que en un
  evento con máximo 0 el texto "Puedes agregar hasta 0 acompañantes" no aparece
  nunca
- [x] 5.4 Verificar el flujo completo de extremo a extremo con un evento de
  prueba: un titular con máximo 2 no puede agregar un tercer acompañante desde la
  UI, uno con máximo 5 sí, y uno con máximo 0 no ve ningún control de
  acompañantes. VERIFICADO interactivamente con eventos de prueba (límites 0/2/5):
  máximo 2 — contador llega a (2/2) y el botón "Agregar acompañante" se
  deshabilita; máximo 5 — llega a (5/5) con el botón deshabilitado en el sexto
  intento; máximo 0 — sin sección ni botón de acompañantes y con el mensaje
  "inscripción individual"

## 6. Verificación integral

- [x] 6.1 Ejecutar `npm run lint` y verificar que termina sin errores
- [x] 6.2 Ejecutar `npx tsc --noEmit` y verificar que no reporta errores de tipos
- [x] 6.3 Ejecutar `npx next build` y verificar que el build de producción
  compila, en particular que el componente cliente acepta la nueva prop
- [x] 6.4 Verificar que `POST /api/inscripciones` con un grupo que excede el
  límite no altera `cuposOcupados` del evento, ni crea inscripción, ni asistentes,
  ni objetos nuevos en el bucket de firmas
- [x] 6.5 Verificar que una vez editado el evento para subir o bajar el límite,
  las inscripciones ya existentes conservan intactos sus asistentes y que solo
  las nuevas quedan sujetas al nuevo límite

## 7. Documentación

- [x] 7.1 Actualizar `CONTEXT.md`: §5 (fila de `EVENTO`, campos de configuración
  por evento) y §7 (la condición adicional en el `UPDATE` atómico junto al
  cupo), y §11 con la nota de que `maxAcompanantes = 0` significa inscripción
  individual y nunca "sin límite"
- [x] 7.2 Actualizar el estado del proyecto en `CONTRIBUTING.md` §8, que hoy
  sigue listando reportes y exportación como pendientes aunque ya se
  implementaron, y registrar aquí este change como completado
- [x] 7.3 Ejecutar `npx openspec validate max-acompanantes-por-evento --strict` y
  `npx openspec validate --specs` y verificar que ambos terminan sin errores
- [x] 7.4 Tras la aprobación del plan, sincronizar los specs y archivar el
  change con `npx openspec archive max-acompanantes-por-evento`

---

Fuera de alcance de este change, pendientes de decisión (ver `design.md`,
Open Questions): el aviso al Administrador cuando el nuevo límite queda por
debajo de un grupo ya inscrito, y la sugerencia de `maxAcompanantes` derivada de
la capacidad de las habitaciones. Ninguno bloquea la implementación.
