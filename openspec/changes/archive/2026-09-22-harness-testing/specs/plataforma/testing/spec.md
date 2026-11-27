## Purpose

Brindar verificación automatizada de la plataforma garantizando los escenarios de concurrencia y los flujos críticos de negocio. Cubre dos capas: pruebas de integración contra la base de datos Postgres real (Docker) para los casos de `CONTEXT.md` §7 (cupo atómico, duplicados en checkpoint, cancelación que libera cupos) y pruebas end-to-end (Playwright) de los flujos completos que usan personas reales. Es infraestructura de Persona B y no altera ninguna capability de negocio existente.

## ADDED Requirements

### Requirement: Ejecución de pruebas como script de npm

El sistema SHALL exponer scripts de npm `test` (pruebas de integración) y `test:e2e` (Playwright) que permitan correr la suite completa y cada subset de forma aislada, y que fallen con código de salida distinto de cero ante cualquier test fallido.

#### Scenario: Suite de integración

- **WHEN** se ejecuta `npm test` con la base `db` de Docker disponible
- **THEN** la suite de integración corre contra Postgres y reporta el número de tests y su resultado

### Requirement: Contención de datos de prueba

El harness SHALL crear y limpiar sus propios datos dentro de transacciones o con identificadores únicos, sin borrar ni modificar datos de desarrollo ni de producción.

#### Scenario: Pruebas sin residuos

- **WHEN** la suite de integración termina (pase o falle)
- **THEN** no quedan inscripciones, checkpoints, eventos ni registros creados por las pruebas en la base persistente

### Requirement: Prueba de cupo atómico bajo concurrencia

El harness SHALL probar que el `UPDATE` atómico de cupo (`cuposOcupados + totalPersonas <= cupoMaximo`) nunca excede el máximo cuando varias inscripciones compiten simultáneamente por los últimos cupos, incluidos grupos de más de una persona.

#### Scenario: Competencia por el último cupo

- **WHEN** se envían N inscripciones concurrentes (con grupos de 1 y 3 personas) contra un evento con cupo pequeño (ej. 5)
- **THEN** la suma de personas inscritas correctamente es exactamente el cupo y el resto recibe rechazo, sin que `cuposOcupados` supere jamás `cupoMaximo`

#### Scenario: Grupo que no cabe completo

- **WHEN** una inscripción concurrente es de 3 personas y solo quedan 2 cupos
- **THEN** la inscripción se rechaza íntegramente y el cupo queda intacto (sin personas a medias)

### Requirement: Prueba de duplicados en checkpoint

El harness SHALL probar que el autoregistro/registro manual en un checkpoint respeta la restricción única `@@unique([asistenteId, checkpointId])` y que bajo peticiones simultáneas solo se persiste un único `RegistroControl` por asistente y checkpoint.

#### Scenario: Doble registro simultáneo en el mismo checkpoint

- **WHEN** dos peticiones concurrentes registran el mismo documento en el mismo checkpoint activo
- **THEN** solo una se persiste (el resto captura el conflicto `P2002`) y el dashboard muestra un único registro

### Requirement: Prueba de cancelación que libera cupos

El harness SHALL probar que cancelar una inscripción decrementa `cuposOcupados` por el total de personas del grupo de forma atómica y que una cancelación duplicada no vuelve a liberar cupos.

#### Scenario: Cancelación libera el grupo completo

- **WHEN** se cancela una inscripción de 3 personas
- **THEN** `cuposOcupados` baja exactamente en 3 y el evento vuelve a aceptar esa cantidad de personas

#### Scenario: Doble cancelación no libera dos veces

- **WHEN** se intenta cancelar una inscripción ya cancelada
- **THEN** la segunda cancelación se rechaza y `cuposOcupados` no cambia

### Requirement: Pruebas end-to-end de flujos críticos

El harness SHALL probar con Playwright los flujos completos: login de Administrador y Operador, inscripción pública de un titular con acompañantes y firma, autoregistro en checkpoint por documento, y registro manual del Operador desde su panel.

#### Scenario: Flujo completo de inscripción

- **WHEN** un usuario recorre el flujo de inscripción pública de punta a punta (datos, acompañante, firma, consentimiento y envío)
- **THEN** la inscripción queda registrada y visible para el Administrador en el evento

#### Scenario: Flujo completo de autoregistro

- **WHEN** un asistente escanea el QR del checkpoint (abre `/checkpoint/[token]`) e ingresa su documento
- **THEN** el checkpoint registra su asistencia y el dashboard del Operador refleja el incremento

#### Scenario: Registro manual del Operador

- **WHEN** un Operador usa el formulario de registro manual del panel para una persona sin celular
- **THEN** el registro se persiste y el dashboard refleja el incremento

### Requirement: Segregación de la base de pruebas

El harness SHALL configurar su conexión de Prisma de forma explícita para apuntar a la base de datos de integración (misma instancia local de Docker) y SHALL ser ejecutable en CI sin intervención manual.

#### Scenario: Ejecución en CI

- **WHEN** el harness corre en un entorno de CI con la base levantada
- **THEN** no requiere pasos manuales adicionales más allá de levantar la base con Docker y correr el script de npm