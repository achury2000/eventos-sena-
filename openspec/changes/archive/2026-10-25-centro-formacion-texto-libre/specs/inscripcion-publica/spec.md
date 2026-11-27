# Spec Delta

## MODIFIED Requirements

### Requirement: Formulario de inscripción de titular y acompañantes

El formulario SHALL capturar los datos del titular (nombre completo, documento
de 6 a 12 dígitos, centro de formación opcional, correo opcional), donde el
centro de formación SHALL ser un texto libre escrito por el titular y SHALL NOT
requerir elegirlo de una lista cerrada, permitir agregar acompañantes con nombre
completo y documento —sin centro de formación, que solo declara el titular—
hasta un máximo que provenga del evento, exigir una única casilla de aceptación
de tratamiento de datos y una firma digital en el canvas antes de enviar. El
máximo mostrado SHALL ser el configurado en ese evento y SHALL NOT ser un valor
fijo del sistema. Cuando el evento tenga un máximo de 0, el formulario SHALL
ocultar por completo el control para agregar acompañantes y SHALL mostrar un
mensaje informativo de que la inscripción es individual, en lugar de mostrar un
botón deshabilitado sin explicación.

#### Scenario: Inscripción completa y válida

- **WHEN** el titular completa nombre, documento, correo opcional, firma digital,
  acepta el tratamiento de datos y envía con un acompañante válido
- **THEN** el sistema registra la inscripción con `esTitular = true` para el
  titular y un `Asistente` con `esTitular = false` para el acompañante

#### Scenario: Titular sin centro de formación

- **WHEN** el titular completa el resto del formulario y envía sin escribir un
  centro de formación
- **THEN** el sistema registra la inscripción con el centro de formación vacío
  para el titular

#### Scenario: Firma o consentimiento faltante

- **WHEN** el titular intenta enviar sin firmar o sin aceptar el tratamiento de
  datos
- **THEN** el sistema impide el envío y muestra el error correspondiente

#### Scenario: El formulario respeta el límite del evento

- **WHEN** el titular abre el formulario de un evento cuyo máximo de
  acompañantes es 2
- **THEN** el sistema permite agregar hasta 2 acompañantes, muestra ese límite en
  la ayuda y no ofrece una tercera opción de forma utilizable

#### Scenario: Evento de inscripción individual

- **WHEN** el titular abre el formulario de un evento cuyo máximo de
  acompañantes es 0
- **THEN** el sistema no muestra ningún control para agregar acompañantes y
  muestra un mensaje indicando que ese evento es de inscripción individual
