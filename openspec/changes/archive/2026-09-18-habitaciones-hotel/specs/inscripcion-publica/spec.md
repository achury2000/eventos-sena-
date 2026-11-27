## MODIFIED Requirements

### Requirement: Cancelación de inscripción por el Administrador

El sistema SHALL expone un endpoint `POST /api/inscripciones/[id]/cancelar` accesible solo para sesiones con rol `ADMINISTRADOR`. Al cancelar, SHALL actualizar `Inscripcion.estado` a `CANCELADO`, decrementar `cuposOcupados` por el total de asistentes activos de esa inscripción y liberar las habitaciones asignadas a los asistentes de esa inscripción, todo ello en la misma transacción. SHALL rechazar con `409` si la inscripción ya está cancelada o si el evento está `FINALIZADO`/`CANCELADO`.

#### Scenario: Cancelación exitosa

- **WHEN** un Administrador cancela una inscripción de 3 personas
- **THEN** la inscripción queda `CANCELADA`, `cuposOcupados` se decrementa en 3 y ninguna de esas personas conserva una habitación asignada en el evento

#### Scenario: Cancelación duplicada

- **WHEN** un Administrador intenta cancelar una inscripción ya cancelada
- **THEN** el sistema responde `409` y no modifica `cuposOcupados` ni las asignaciones de habitación

#### Scenario: Acceso sin rol de Administrador

- **WHEN** una petición a `POST /api/inscripciones/[id]/cancelar` no proviene de una sesión de Administrador
- **THEN** el sistema la rechaza sin modificar la inscripción