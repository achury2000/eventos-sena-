# Design

## Context

Ver `proposal.md` para la motivación. El estado actual relevante que condiciona
el enfoque:

- El límite de 10 está duplicado en dos capas con propósitos distintos:
  `MAX_ACOMPANANTES` en el cliente (`form-inscripcion.tsx`) y `.max(10)` en
  `esquemaInscripcion` (Zod, servidor). Solo el segundo protege de verdad.
- `POST /api/inscripciones` sube la firma a S3/MinIO (`subirFirma`) **antes** de
  abrir la transacción, y la borra en el `catch` si algo falla.
- La transacción de cupo ya evalúa varias condiciones en un solo `UPDATE`
  (`cuposOcupados + total <= cupoMaximo`, `estado = 'INSCRIPCIONES_ABIERTAS'`).
  Cuando `filas === 0`, el código re-consulta el evento para distinguir
  `409` cupo lleno de `403` inscripciones cerradas.
- `Evento` ya tiene configuración por evento (`incluyeHotel`, `incluyeBus`) y su
  formulario de creación/edición es un único componente compartido
  (`form-evento.tsx`) que recibe el evento opcional para precargar valores. Es
  además un Client Component que ya usa `useActionState`, así que el estado local
  que necesita el control Sí/No no exige ningún cambio de arquitectura. La
  página de edición le pasa el evento completo de `findUnique` sin `select`, por
  lo que el campo nuevo llega sin tocar esa página.
- La validación de eventos vive en un módulo de servidor que importa Prisma
  (`validations/admin.ts`), por lo que no es importable desde componentes cliente.
- Zod 4 está en uso; `z.coerce.number()` convierte la cadena vacía en `0` y esa
  conversión **pasa** una validación `.min(0).max(10)`. Verificado ejecutando el
  esquema: `z.coerce.number()` sobre `""` produce `0` con `success: true`.

## Goals / Non-Goals

**Goals:**

- Que la política de acompañantes sea configurable por evento, con el mismo
  lenguaje de configuración que `cupoMaximo` / `incluyeHotel`.
- Preservar la garantía de `CONTEXT.md` §7: la regla se evalúa dentro de la
  actualización condicional, no en una comprobación previa que pueda quedar
  desfasada.
- No dejar basura en el bucket de firmas cuando la inscripción se rechaza.
- Que `0` sea un estado soportado y explicado, no un valor que produzca una UI
  rota.

**Non-Goals:**

- No se toca el modelo de `Asistente`, ni la firma por persona, ni el
  `@@unique([eventoId, documento])`. Los acompañantes siguen siendo personas de
  primera clase.
- No se revalida ni se invalida la historia: bajar un límite no toca inscripciones
  existentes.
- No se introduce un porcentaje del cupo ni ninguna regla de reparto justo. El
  campo acota el tamaño del grupo, no la fracción del evento que un grupo puede
  tomar (un evento de cupo 5 con máximo 4 sigue pudiendo ser tomado entero por
  un solo titular; eso es correcto y es una decisión consciente).
- No se toca la lógica de `Asistente`/`Inscripcion` más allá de leer un entero
  adicional, así que el cambio no requiere decisiones sobre el modelo de
  `Asistente`.

## Decisions

### D1. Columna en `Evento`, no tabla de configuración aparte

`maxAcompanantes` es un entero con valor por defecto, versionado junto al evento
y consultado en cada inscripción. Una tabla aparte (`configuracionEvento`) sería
un `JOIN` y una clave foránea más para guardar un entero con default.

**Alternativa descartada:** columna nullable sin default, para "distinguir no
configurado de 0". Rechazada porque obligaría a los clientes a tratar `null`
como un valor distinto en cada lectura, y `0` como un valor real. El default 3
hace que nunca haya estado ambiguo.

### D2. Un solo entero en datos; la elección Sí/No vive en la UI

La decisión "¿este evento admite acompañantes?" es una decisión de **interfaz**,
no un dato adicional. En datos hay un único entero, `maxAcompanantes`, donde `0`
significa "solo titular".

En el formulario el Administrador no escribe un `0`: elige entre **Sí** y **No**
en un control de radio, y si elige **Sí** aparece el campo numérico con la
cantidad. El formulario calcula el entero a enviar. Así se obtiene la claridad
de un booleano sin su costo en el modelo.

**Alternativa descartada: guardar `permiteAcompanantes: boolean` +
`maxAcompanantes: int` en `Evento`.** El booleano es información derivada —es
exactamente `maxAcompanantes > 0`, no hay un tercer significado posible— y
guardar un hecho derivado en dos lugares es la misma forma de divergencia que
`CONTEXT.md` §4 ya rechazó para `numAcompanantes` más la tabla `Acompanante`
("quedaban dos fuentes de verdad que podían desincronizarse"). A eso se suma el
estado contradictorio `(true, 0)`, que obligaría a una regla de validación
adicional solo para descartar un estado que el entero solo hace imposible.

**Por qué no basta con el entero pelado (alternativa A).** Es la opción más
simple, pero obliga al Administrador a saber que tiene que escribir cero para
decir "ninguno", y obliga a esconder ese significado en el texto de ayuda. El
radio no cuesta nada en datos y de paso da un texto natural: "Este evento es de
inscripción individual".

**Por qué el control Sí/No no depende de lo que responda el cliente.** El caso
de uso admite las dos lecturas ("sin acompañantes" como categoría aparte, o como
extremo bajo de un rango de 0 a 10) y todavía no está definido con el SENA. La
opción C rinde bien en ambas: si resulta ser categoría, el control ya existe; si
resulta ser un valor más de la escala, el número se sigue editando igual sin
tocar el modelo.

### D3. Default 3, techo técnico 10

El campo es obligatorio en el formulario y precargado, así que el Administrador
siempre decide; el default de la base solo es la red de seguridad para filas
creadas por migración.

El 3 cubre el caso familiar típico (titular, cónyuge e hijos) sin ser
permisivo. El techo de 10 preserva exactamente la capacidad actual y cumple dos
funciones: impide que una errata de configuración (9999) dispare el tamaño del
array, y evita tener que diseñar la experiencia de alguien llenando 150
formularios en un celular. `cupoMaximo` ya impide que ese grupo se materialice;
el techo protege el caso en que sí cabe, y la experiencia.

**Alternativa descartada:** dejar el límite como un porcentaje del cupo. Más
"justo" en apariencia, pero mezcla dos conceptos (tamaño de grupo vs. reparto) y
complica el mensaje de error para el titular. Queda como funcionalidad futura si
algún día el cliente lo pide.

### D4. Constante del techo en un módulo hoja compartido

`MAX_ACOMPANANTES_TECNICO = 10` debe ser legible desde `validations/admin.ts`
(Zod del evento) y desde `validations/inscripcion.ts` (guarda estructural del
array). `validations/inscripcion.ts` importa Prisma, así que no sirve como
origen compartido si mañana el cliente necesita el valor.

**Decisión:** módulo hoja nuevo, por ejemplo `src/lib/limites.ts`, sin imports,
importable desde cualquier runtime. Evita el acoplamiento raro de que el esquema
de eventos dependa del de inscripción.

### D5. `z.preprocess` para que el campo vacío no se convierta en 0

`z.coerce.number()` sobre `""` devuelve `0`, y como `0` es un valor **válido**
bajo `.min(0)`, el campo vacío pasaría la validación: un evento creado sin tocar
el campo se configuraría silenciosamente como "sin acompañantes". Es el peor
tipo de fallo, porque es invisible y contradice la intención del default.

**Decisión:** normalizar la cadena vacía a `undefined` antes del coercionado, de
modo que Zod lo rechace con el mensaje de campo requerido, más `required` en el
`<input>`. Con el control Sí/No de D2, este caso corresponde al subcampo
numérico cuando la respuesta es "Sí"; ver D11.

**Alternativa descartada:** `z.string().regex(/^\d+$/)` seguido de
`Number()`. Funciona, pero pierde el mensaje de error por rango que da el
coercionado y duplica lógica.

Nota: `cupoMaximo` tiene el mismo patrón `z.coerce.number()`, pero su `min(1)`
lo salva porque `0` es inválido ahí. No se toca en este cambio.

### D6. Pre-chequeo antes de la firma **y** guarda dentro del `UPDATE`

Las dos cosas, y no solo la segunda:

- El `UPDATE` condicional es la autoridad. Es donde la regla se evalúa de forma
  atómica con el cupo, sin ventana TOCTOU, y es lo que exige `CONTEXT.md` §7.
- El pre-chequeo existe por la firma. La subida a S3 ocurre antes de la
  transacción; si la única validación estuviera dentro del `UPDATE`, cada
  petición que exceda el límite subiría un PNG y luego lo borraría. Con el
  pre-chequeo se rechaza sin tocar el bucket.

La secuencia es: Zod → cargar evento → validar estado/periodo → **pre-chequear
acompañantes** → subir firma → transacción con `UPDATE` guardado.

El precio es una lectura duplicada del valor en la ruta de rechazo. Se acepta:
es un entero y la ruta infrecuente.

### D7. Tres causas de `filas === 0`, desambiguadas en una re-consulta

Hoy `filas === 0` significa dos cosas y el código re-consulta para
desambiguar. Con el límite son tres (`403` cerrado, `422` exceso de
acompañantes, `409` cupo lleno). Se resuelve con una sola re-consulta que trae
`estado`, `cupoMaximo`, `cuposOcupados` y `maxAcompanantes`, y una cadena de
comprobaciones. Solo se ejecuta en la ruta de error, así que no añade coste en
el camino feliz.

**Alternativa descartada:** distinguir las causas con dos `UPDATE` distintos
(primero el de acompañantes, luego el de cupo). Evita la re-consulta, pero
duplica la línea crítica de concurrencia y hace el diagnóstico más difícil de
razonar. No compensa.

El `422` se elige por consistencia con cómo el módulo de checkpoints ya tipa un
rechazo de regla de negocio (`CHECKPOINT_NO_ACTIVO` → 422), no por el de un dato
mal formado (`400`).

### D8. `0` no es un centinela de "sin límite"

Es la trampa clásica de un campo numérico con valores especiales. Se mitiga en
tres capas: la especificación fija que ningún valor significa "ilimitado", el
propio esquema no tiene ningún valor con esa semántica, y `CONTEXT.md` §11 lo
declara explícito para que una futura modificación no introduzca el centinela.

### D9. UI: con 0 se oculta la sección, no se deshabilita

Deshabilitar el botón con `0` produce "Acompañantes (0/0)" y el texto "Puedes
agregar hasta 0 acompañantes", que es ilegible. Con `0` la sección se oculta y
se muestra un mensaje informativo. El estado vacío (`acompanantes.length === 0`)
debe distinguirse del evento sin acompañantes, porque hoy ambos renderizan el
mismo texto.

### D10. El `.max(10)` de `esquemaInscripcion` se conserva

No se reemplaza por el valor del evento: es la guarda estructural del array
(sizing, tamaño de la petición) y debe aplicarse antes de tocar la base de
datos. El valor del evento es una regla de negocio y se valida después, con
mensaje propio. Son dos capas con propósitos distintos, no una duplicación.

### D11. Mecánica del control Sí/No en el formulario del Administrador

Consecuencias de D2 que hay que fijar para no improvisar durante la
implementación:

**El servidor deriva el `0`, no lo confía.** La server action lee el radio y el
número como campos separados del `FormData` y calcula el entero. Un cliente
manipulado podría enviar `maxAcompanantes=0` junto con el radio en "Sí"; si el
servidor leyera el entero directamente, aceptaría una configuración que el
formulario nunca produciría. Es el mismo criterio de defensa en profundidad que
ya aplica el route handler de inscripción, que revalida todo en vez de confiar
en lo que le manda el cliente.

**El `z.preprocess` de D5 sigue siendo necesario, aunque ahora haya un radio.**
El radio elimina el caso "campo en blanco" solo cuando la respuesta es No. Con
la respuesta Sí el subcampo numérico sigue existiendo y se puede dejar vacío, y
ahí se reproduce exactamente el fallo verificado: cadena vacía coercionada a `0`,
que bajo `.min(0)` es un valor **válido** y produce en silencio un evento de
inscripción individual. La corrección va sobre el subcampo numérico.

**Precarga en modo edición.** A diferencia del resto de campos, que usan
`defaultValue={evento?.x ?? yyy}`, el control Sí/No necesita estado controlado:
un `useState` inicializado desde el valor guardado, con `0` → "No" y cualquier
valor mayor → "Sí" más ese número. `form-evento.tsx` ya es Client Component con
`useActionState`, así que el `useState` no introduce ninguna dependencia nueva.

**Cambiar de Sí a No y volver a Sí.** El número se conserva en estado local del
componente, no se borra. Si nunca se escribió, el valor de partida es
`MAX_ACOMPANANTES_POR_DEFECTO`. Así el Administrador no pierde una configuración
por tantear el control.

**Consistencia con los controles nativos existentes.** `src/components/ui/` solo
tiene `button`, `input` y `label`; no hay `RadioGroup` de shadcn. El radio se
construye con `<input type="radio">` nativo, igual que los checkboxes de
`form-evento.tsx` y los `<select>` nativos que ya usa el repositorio. No se
agrega componente nuevo ni dependencia.

## Risks / Trade-offs

- **[El default 3 baja el límite efectivo de los eventos existentes de 10 a
  3]** → No hay datos en producción (2 migraciones, uso local), así que el
  impacto es nulo. Si aun así se quiere preservar, la migración puede fijar 10
  en las filas existentes. Se confirma al aplicar.
- **[El pre-chequeo lee el evento fuera de la transacción, así que el valor
  pudo cambiar]** → La guarda del `UPDATE` es la autoridad y rechaza igual. El
  único residuo posible es un mensaje de error algo menos preciso en esa
  ventana patológica; no hay corrupción de datos.
- **[Bajar el límite con inscripciones en curso da un mensaje confuso si el
  grupo se armó justo antes del cambio]** → La desambiguación de D7 cubre la
  causa correcta, y el grupo armado antes del cambio se acepta si aún cabe en el
  `UPDATE` que lo evalúa.
- **[Un valor mal configurado bloquea inscripciones legítimas]** → El techo 10
  es holgado, el formulario muestra el valor, y el admin puede editarlo sin
  reiniciar nada.
- **El `422` es un código nuevo en este endpoint** → Se documenta en la
  especificación y el cliente solo lo ve si manipula la petición, porque la UI
  ya respeta el límite.

## Migration Plan

1. `prisma migrate dev` genera el `ALTER TABLE "eventos" ADD COLUMN
   "maxAcompanantes" INTEGER NOT NULL DEFAULT 3;`.
2. No hay backfill: no hay datos en producción. Si se decide preservar el
   comportamiento actual, cambiar el valor por defecto de la migración a 10 para
   las filas existentes.
3. El código nuevo se despliega después de la migración; una versión anterior del
   código ignora la columna, así que el orden inverso también es seguro durante
   un despliegue progresivo.
4. Rollback: `ALTER TABLE "eventos" DROP COLUMN "maxAcompanantes";` y revertir
   el código. No hay datos propios que perder, solo se pierde la configuración.

## Open Questions

- ¿Debe el formulario de edición advertir cuando el nuevo `maxAcompanantes`
  queda por debajo del tamaño de algún grupo ya inscrito? No cambia las
  especificaciones ni invalida nada (D: la historia se conserva), es solo
  información para el Administrador. Es una mejora opcional de la UI.
- ¿Tiene sentido ofrecer al Administrador una sugerencia de
  `maxAcompanantes` derivada de las capacidades de las habitaciones cuando el
  evento incluye hotel. También es opcional y no bloquea nada.
