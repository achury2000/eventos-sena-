# Spec Delta

## Purpose

Permite que el Administrador consulte la firma digital del titular de una inscripción de un evento, servida como URL firmada y temporal desde el almacenamiento privado, sin exponer el almacenamiento directamente.

## ADDED Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir consultar la firma de una inscripción únicamente a usuarios autenticados con rol `ADMINISTRADOR`. Una persona sin rol `ADMINISTRADOR` (incluido un Operador) no podrá invocar el visor ni obtener la URL de la firma.

#### Scenario: Admin consulta una firma

- **WHEN** un usuario con rol `ADMINISTRADOR` solicita ver la firma de una inscripción de un evento
- **THEN** el sistema genera una URL firmada temporal y la sirve para que se muestre la firma del titular

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión solicita ver la firma de una inscripción
- **THEN** el sistema rechaza la operación (no autenticado o no autorizado) sin exponer ningún dato de la firma ni del almacenamiento

### Requirement: Firma servida como URL firmada y temporal

El sistema SHALL servir la firma de una inscripción mediante una URL firmada y de expiración corta generada por el servidor sobre el almacenamiento privado, y SHALL generarla de nuevo en cada solicitud en lugar de reutilizar una URL previa. El sistema no expondrá la ruta interna del almacenamiento como recurso público permanente.

#### Scenario: URL firmada temporal

- **WHEN** un Administrador solicita ver la firma de una inscripción
- **THEN** el sistema responde con la firma accesible a través de una URL firmada que expira en un tiempo corto y que fue generada en esa misma solicitud

#### Scenario: Acceso directo al almacenamiento

- **WHEN** se intenta acceder a la firma sin pasar por el visor (por ejemplo, usando la clave interna de almacenamiento directamente)
- **THEN** el sistema no sirve la imagen por una vía pública permanente; la firma solo se obtiene vía URL firmada temporal generada por el visor autenticado

### Requirement: Consulta por evento e inscripción

El sistema SHALL permitir al Administrador consultar la firma de una inscripción indicando tanto el evento como la inscripción, y SHALL devolver la firma únicamente cuando la inscripción exista y pertenezca al evento indicado. Cuando el evento no exista, o cuando la inscripción no exista o no pertenezca a ese evento, el sistema SHALL responder con el mismo resultado de "no encontrado" en ambos casos, sin revelar cuál de los dos identificadores fue inválido.

#### Scenario: Inscripción perteneciente al evento

- **WHEN** un Administrador consulta la firma de una inscripción que pertenece al evento indicado
- **THEN** el sistema sirve la URL firmada temporal con la imagen de la firma del titular

#### Scenario: Inscripción de otro evento o inexistente

- **WHEN** un Administrador consulta la firma de una inscripción que no pertenece al evento indicado, o que no existe
- **THEN** el sistema responde "no encontrado" con el mismo comportamiento en ambos casos y sin fallar

### Requirement: Firma disponible en cualquier estado de la inscripción

El sistema SHALL permitir ver la firma de una inscripción en cualquier estado (`INSCRITO`, `CONFIRMADO`, `NO_ASISTIO`, `CANCELADO`), porque la firma es evidencia del consentimiento y compromiso del titular y se conserva al cancelar la inscripción.

#### Scenario: Firma de inscripción cancelada

- **WHEN** un Administrador consulta la firma de una inscripción que fue cancelada
- **THEN** el sistema sigue sirviendo la firma del titular por URL firmada temporal, ya que la cancelación no elimina la evidencia almacenada