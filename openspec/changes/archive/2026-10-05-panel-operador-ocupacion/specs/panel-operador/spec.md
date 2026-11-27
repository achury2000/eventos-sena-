# Spec Delta

## MODIFIED Requirements

### Requirement: Tablero de asistencia en tiempo real

El panel SHALL mostrar por cada checkpoint el número de registros acumulados contra el total de asistentes del evento, entendido como los `Asistente` cuya `Inscripcion` no está en estado `CANCELADO` (por ejemplo, "148 / 200"). Para los checkpoints respaldados por una habitación (relación `Checkpoint.habitacionId`), el panel SHALL mostrar además la **ocupación del cuarto** — asistentes asignados a esa habitación frente a su capacidad (por ejemplo, "2 / 2") — como señal distinta del conteo de registrados, que sigue contra el total de asistentes del evento. El componente cliente SHALL refrescar estos conteos por sondeo (polling) cada 5 segundos mediante `GET /api/operador/dashboard`, que SHALL requerir una sesión de Operador y SHALL devolver los conteos agrupados por `checkpointId` — y la ocupación por habitación, cuando el checkpoint esté respaldado por una — únicamente de los eventos asignados a ese Operador.

#### Scenario: Los conteos se actualizan con el sondeo

- **WHEN** un asistente se registra en un checkpoint mientras el Operador mantiene su panel abierto
- **THEN** el conteo de ese checkpoint aumenta en el siguiente sondeo, sin recargar la página

#### Scenario: Ocupación de un checkpoint de habitación

- **WHEN** un evento tiene checkpoints de habitación y un Administrador asigna o desasigna asistentes a esos cuartos
- **THEN** el panel del Operador muestra la ocupación actualizada (asignados/capacidad) de cada cuarto en el siguiente sondeo, sin recargar la página

#### Scenario: Checkpoint sin habitación

- **WHEN** un checkpoint no está respaldado por una habitación (checkpoint manual)
- **THEN** el panel no muestra la línea de ocupación del cuarto y conserva solo el conteo de registrados contra el total de asistentes

#### Scenario: Consulta del tablero sin sesión de Operador

- **WHEN** se llama a `GET /api/operador/dashboard` sin una sesión de rol `OPERADOR`
- **THEN** el sistema responde `401`/`403` y no expone conteos ni ocupaciones