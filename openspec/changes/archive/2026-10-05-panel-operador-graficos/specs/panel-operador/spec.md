# Spec Delta

## ADDED Requirements

### Requirement: Gráficos de estadísticas en vivo del evento

El panel SHALL mostrar, por cada evento asignado, un indicador gráfico de **cobertura** — el número de asistentes distintos que ya registraron en al menos un checkpoint del evento frente al total de asistentes vigentes (por ejemplo, "2 de 5") — y un **gráfico de barras por checkpoint** que muestre el progreso de registros de cada checkpoint (frente al total de asistentes del evento) desglosado por método de registro: **autoregistro vs manual**. Estos gráficos SHALL refrescarse con el mismo sondeo de 5 segundos que alimenta las tarjetas, SHALL calcular las barras sobre el mismo conjunto de checkpoints visibles que aplique el filtro de búsqueda (con el filtro activo solo se grafican los checkpoints que coinciden, y la sección del evento, con sus gráficos, se oculta si ninguno coincide), y SHALL presentar el donut de cobertura dependiendo únicamente del evento, no del filtro. SHALL tolerar los casos extremos sin errores: evento sin asistentes vigentes muestra "0 / 0" sin dividir entre cero, y evento sin checkpoints no muestra barras.

#### Scenario: El Operador ve la cobertura del evento

- **WHEN** un evento asignado tiene 5 asistentes vigentes y 2 de ellos ya registraron en al menos un checkpoint
- **THEN** el panel muestra un gráfico de cobertura indicando "2 de 5" (o su equivalente porcentual) para ese evento

#### Scenario: Barras de progreso por checkpoint

- **WHEN** el Operador ve la sección de un evento asignado con checkpoints
- **THEN** el panel muestra una barra por checkpoint con sus registros frente al total de asistentes del evento, desglosada en los segmentos de autoregistro y registro manual

#### Scenario: El desglose distingue registro manual de autoregistro

- **WHEN** un checkpoint tiene registros creados por ambos métodos (AUTOREGISTRO y MANUAL)
- **THEN** el gráfico de ese checkpoint muestra ambos segmentos de forma distinguible (por color/leyenda), y la suma de ambos es igual al total de registros del checkpoint

#### Scenario: Los gráficos se actualizan con el sondeo

- **WHEN** un asistente se registra (autoregistro o manual) mientras el Operador mantiene su panel abierto y el filtro está vacío
- **THEN** la cobertura y las barras del evento afectado se actualizan en el siguiente sondeo, sin recargar la página

#### Scenario: El filtro de búsqueda también filtra las barras

- **WHEN** el Operador escribe un filtro (ej. "60") que coincide solo con algunos checkpoints del evento
- **THEN** las barras muestran únicamente esos checkpoints coincidentes, junto con las tarjetas visibles, y la sección completa —con sus gráficos— se oculta si ningún checkpoint coincide

#### Scenario: La cobertura no depende del filtro

- **WHEN** el Operador tiene un filtro activo que coincide con checkpoints de un evento
- **THEN** el donut de cobertura de ese evento sigue mostrando el total de asistentes distintos ya registrados, independientemente de qué checkpoints coincidan con el filtro

#### Scenario: Evento sin asistentes vigentes

- **WHEN** un evento asignado no tiene asistentes vigentes
- **THEN** el panel muestra la cobertura como "0 / 0" sin errores de división entre cero

#### Scenario: Evento sin checkpoints

- **WHEN** un evento asignado no tiene checkpoints
- **THEN** el panel no muestra gráfico de barras para ese evento (no hay nada que graficar) y conserva el resto de la sección