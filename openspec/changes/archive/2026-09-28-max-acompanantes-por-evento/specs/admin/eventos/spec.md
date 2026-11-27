# Spec Delta

## MODIFIED Requirements

### Requirement: El Administrador puede crear un evento

El sistema SHALL permitir crear un evento con nombre, lugar, descripción
opcional, `fechaInicio` y `fechaFin`, `inscripcionApertura` y
`inscripcionCierre`, `cupoMaximo` (personas totales), `maxAcompanantes`
(máximo de acompañantes por inscripción, adicional al titular), `incluyeHotel` e
`incluyeBus`. El evento SHALL crearse en estado `PLANEADO` y con
`maxAcompanantes` igual a 3 si el Administrador no especifica otro valor. La
validación SHALL exigir `cupoMaximo >= 1`, `maxAcompanantes` entero entre 0 y 10
inclusive, `maxAcompanantes + 1 <= cupoMaximo`, `fechaInicio < fechaFin` e
`inscripcionApertura < inscripcionCierre`.

#### Scenario: Creación exitosa

- **WHEN** un Administrador envía un formulario de evento válido
- **THEN** el sistema crea el evento en estado `PLANEADO` con `cuposOcupados`
  en 0 y regresa al listado mostrando el nuevo evento

#### Scenario: Cupo inválido

- **WHEN** `cupoMaximo` es menor a 1
- **THEN** el sistema no crea el evento y muestra el error de validación

#### Scenario: Límite de acompañantes coherente con el cupo

- **WHEN** se envía un evento con `maxAcompanantes` mayor que 9, o con un grupo
  titular más acompañantes que no cabe en `cupoMaximo`
- **THEN** el sistema no crea el evento y muestra el error de validación
  indicando el rango permitido o la incoherencia con el cupo

#### Scenario: Fechas inconsistentes

- **WHEN** `fechaInicio >= fechaFin` o `inscripcionApertura >=
  inscripcionCierre`
- **THEN** el sistema no crea el evento y muestra los errores de validación

#### Scenario: Crítico de negocio preservado

- **WHEN** la acción de creación recibe datos incompletos (nombres vacíos,
  lugar vacío, fechas faltantes)
- **THEN** el sistema no crea el evento y muestra los errores de validación

### Requirement: El Administrador puede editar un evento

El sistema SHALL permitir editar los datos de un evento (sin tocar
`cuposOcupados`), aplicando las mismas reglas de validación de la creación.
Reducir `maxAcompanantes` en un evento que ya tiene inscripciones SHALL NOT
invalidar, modificar ni cancelar esas inscripciones ni sus asistentes: los grupos
ya registrados se conservan tal como fueron inscritos y solo se aplica el nuevo
límite a las inscripciones posteriores al cambio.

#### Scenario: Edición exitosa

- **WHEN** un Administrador modifica campos válidos de un evento existente
- **THEN** el sistema persiste los cambios y los refleja en el detalle y el
  listado

#### Scenario: Edición con validación fallida

- **WHEN** la edición viola alguna regla de validación (por ejemplo, fechas
  inconsistentes)
- **THEN** el sistema no persiste los cambios y muestra los errores

#### Scenario: Reducir el límite no altera lo ya inscrito

- **WHEN** un Administrador reduce `maxAcompanantes` de 5 a 2 en un evento que
  ya tiene una inscripción de titular más 3 acompañantes
- **THEN** esa inscripción y sus 4 asistentes se conservan intactos, y el nuevo
  límite solo restringe las inscripciones que se creen después del cambio

## ADDED Requirements

### Requirement: El cero de acompañantes significa inscripción individual

El valor `maxAcompanantes = 0` SHALL significar que el evento admite
únicamente al titular, sin acompañantes. El sistema SHALL tratar `0` como un
valor de configuración legítimo y completo, y en ningún caso como "sin límite",
como ausencia de valor o como un valor por defecto implícito: ningún valor
aceptado equivale a un límite ilimitado, y el valor mayor permitido es el techo
técnico. Un límite enviado vacío SHALL ser rechazado por validación de campo y
nunca interpretado como `0`.

#### Scenario: Evento de inscripción individual

- **WHEN** un Administrador configura un evento con `maxAcompanantes = 0`
- **THEN** el sistema persiste el valor 0 y el evento queda configurado para
  admitir solo al titular

#### Scenario: Límite enviado vacío

- **WHEN** un Administrador envía el formulario de creación o edición de evento
  con el campo de máximo de acompañantes vacío o sin completar
- **THEN** el sistema rechaza el evento y muestra un error de validación
  requiriendo un valor, sin interpretarlo como `0`

#### Scenario: No existe un modo ilimitado

- **WHEN** se revisan los valores que el sistema acepta para el máximo de
  acompañantes
- **THEN** ninguno de ellos significa "sin límite"; el mayor valor aceptado es el
  techo técnico de 10
