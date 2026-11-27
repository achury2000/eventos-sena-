# Inscripciones Specification

## Purpose

Permite que el Administrador liste, busque y pagine las inscripciones de un evento en el panel de administración.

## Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir listar, buscar y paginar las inscripciones de un evento únicamente a usuarios autenticados con rol `ADMINISTRADOR`. Una persona sin rol `ADMINISTRADOR` (incluido un Operador) no podrá ver el listado de inscripciones del panel admin.

#### Scenario: Admin accede al listado de inscripciones

- **WHEN** un usuario con rol `ADMINISTRADOR` visita `/admin/eventos/[id]/inscripciones`
- **THEN** el sistema le muestra el listado de inscripciones del evento con su buscador y paginación

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión intenta acceder al listado de inscripciones
- **THEN** el sistema lo redirige a su panel correspondiente (rol `OPERADOR`) o a `/login` (sin sesión), sin mostrar el listado

### Requirement: Listado paginado de inscripciones

El sistema SHALL mostrar las inscripciones de un evento ordenadas por fecha de inscripción descendente, en páginas de tamaño fijo. El listado SHALL indicar el total de inscripciones y la posición actual dentro de la paginación. Cuando el evento no tiene inscripciones, el sistema SHALL mostrar un mensaje que lo indique.

#### Scenario: Listado inicial

- **WHEN** un Administrador visita `/admin/eventos/[id]/inscripciones` sin filtros
- **THEN** el sistema muestra la primera página de inscripciones ordenadas de la más reciente a la más antigua, con el total y el rango visible

#### Scenario: Evento sin inscripciones

- **WHEN** un Administrador visita el listado de inscripciones de un evento que no tiene inscripciones
- **THEN** el sistema muestra un mensaje indicando que el evento aún no tiene inscripciones públicas

### Requirement: Búsqueda por persona o correo

El sistema SHALL permitir filtrar el listado de inscripciones por un texto que coincida con el nombre o el documento de cualquier persona de la inscripción (titular o acompañante), o con el correo de la inscripción. Cuando la búsqueda no tiene coincidencias, el sistema SHALL mostrar un mensaje que lo indique y no mostrar filas.

#### Scenario: Búsqueda por nombre o documento

- **WHEN** un Administrador escribe un texto en el buscador que coincide con el nombre o el documento de un titular o acompañante, o con el correo de una inscripción
- **THEN** el sistema muestra únicamente las inscripciones que coinciden con el texto

#### Scenario: Búsqueda sin coincidencias

- **WHEN** el texto de búsqueda no coincide con ninguna persona ni correo del evento
- **THEN** el sistema muestra un mensaje de "sin resultados" en lugar de filas, sin fallar

### Requirement: Paginación y preservación de filtros

El sistema SHALL permitir navegar entre las páginas del listado con controles de página anterior y siguiente, y SHALL preservar la búsqueda vigente al cambiar de página. Una solicitud con un número de página fuera del rango válido SHALL mostrarse en la última página válida, sin devolver una página vacía.

#### Scenario: Navegar entre páginas preservando la búsqueda

- **WHEN** un Administrador navega a la página siguiente o anterior luego de haber aplicado una búsqueda
- **THEN** el sistema muestra la página correspondiente aplicando la misma búsqueda

#### Scenario: Número de página fuera de rango

- **WHEN** un Administrador visita el listado con un número de página mayor al total de páginas disponibles
- **THEN** el sistema muestra la última página válida, sin mostrar una página vacía

### Requirement: Personas visibles por inscripción

El sistema SHALL mostrar en cada fila del listado de inscripciones al titular y a cada acompañante de la inscripción, con nombre completo y documento. La fila SHALL indicar el total de personas de la inscripción, contando titular y acompañantes. Cuando una inscripción no tenga acompañantes, la fila SHALL mostrar únicamente al titular y un total de una persona.

#### Scenario: Inscripción con acompañantes

- **WHEN** un Administrador ve en el listado una inscripción con un titular y uno o más acompañantes
- **THEN** la fila muestra el nombre y documento del titular, el nombre y documento de cada acompañante, y el total de personas de la inscripción

#### Scenario: Inscripción sin acompañantes

- **WHEN** un Administrador ve en el listado una inscripción que solo tiene titular
- **THEN** la fila muestra al titular y el total de una persona, sin acompañantes listados
