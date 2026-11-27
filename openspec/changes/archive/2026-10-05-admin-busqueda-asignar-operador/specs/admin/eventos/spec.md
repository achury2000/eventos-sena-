# Spec Delta

## ADDED Requirements

### Requirement: Búsqueda de Operadores al asignar a un evento

El sistema SHALL permitir al Administrador filtrar la lista de Operadores disponibles para asignar a un evento mediante un texto que coincida con el nombre o el correo del Operador. Cuando el texto no coincide con ningún Operador disponible, el sistema SHALL mostrar un mensaje que lo indique y no ofrecer opciones para asignar que no coincidan con el filtro. La asignación de un Operador luego de filtrar SHALL comportarse igual que sin filtro.

#### Scenario: Filtrar Operadores por nombre o correo

- **WHEN** un Administrador escribe un texto en el filtro que coincide con el nombre o el correo de uno o más Operadores disponibles
- **THEN** el sistema muestra únicamente esos Operadores en la lista de asignación

#### Scenario: Filtro sin coincidencias

- **WHEN** el texto del filtro no coincide con ningún Operador disponible para asignar
- **THEN** el sistema indica que no hay Operadores que coincidan con el texto y no permite asignar una opción que no esté visible

#### Scenario: Asignar un Operador tras filtrar

- **WHEN** un Administrador filtra la lista y asigna un Operador que coincide con el filtro
- **THEN** el sistema asigna el Operador al evento y deja de ofrecerlo como disponible, igual que sin filtro