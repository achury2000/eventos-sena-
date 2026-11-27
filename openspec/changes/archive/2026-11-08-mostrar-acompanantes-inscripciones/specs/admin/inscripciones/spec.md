# Spec Delta

## ADDED Requirements

### Requirement: Personas visibles por inscripción

El sistema SHALL mostrar en cada fila del listado de inscripciones al titular y a cada acompañante de la inscripción, con nombre completo y documento. La fila SHALL indicar el total de personas de la inscripción, contando titular y acompañantes. Cuando una inscripción no tenga acompañantes, la fila SHALL mostrar únicamente al titular y un total de una persona.

#### Scenario: Inscripción con acompañantes

- **WHEN** un Administrador ve en el listado una inscripción con un titular y uno o más acompañantes
- **THEN** la fila muestra el nombre y documento del titular, el nombre y documento de cada acompañante, y el total de personas de la inscripción

#### Scenario: Inscripción sin acompañantes

- **WHEN** un Administrador ve en el listado una inscripción que solo tiene titular
- **THEN** la fila muestra al titular y el total de una persona, sin acompañantes listados

## RENAMED Requirements

- FROM: `### Requirement: Búsqueda por titular o correo`
- TO: `### Requirement: Búsqueda por persona o correo`

## MODIFIED Requirements

### Requirement: Búsqueda por persona o correo

El sistema SHALL permitir filtrar el listado de inscripciones por un texto que coincida con el nombre o el documento de cualquier persona de la inscripción (titular o acompañante), o con el correo de la inscripción. Cuando la búsqueda no tiene coincidencias, el sistema SHALL mostrar un mensaje que lo indique y no mostrar filas.

#### Scenario: Búsqueda por nombre o documento

- **WHEN** un Administrador escribe un texto en el buscador que coincide con el nombre o el documento de un titular o acompañante, o con el correo de una inscripción
- **THEN** el sistema muestra únicamente las inscripciones que coinciden con el texto

#### Scenario: Búsqueda sin coincidencias

- **WHEN** el texto de búsqueda no coincide con ninguna persona ni correo del evento
- **THEN** el sistema muestra un mensaje de "sin resultados" en lugar de filas, sin fallar
