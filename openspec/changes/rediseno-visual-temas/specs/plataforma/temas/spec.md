# Spec Delta

## Purpose

Define cómo la plataforma conserva la identidad visual del SENA, permite elegir entre tema claro, oscuro o del sistema y mantiene legibles las superficies, acciones y estados en ambos temas.

## ADDED Requirements

### Requirement: Selección de tema

El sistema SHALL ofrecer las opciones Claro, Oscuro y Sistema, aplicar la opción elegida y conservarla entre visitas en el mismo navegador.

#### Scenario: Elegir tema oscuro

- **WHEN** una persona selecciona el tema Oscuro
- **THEN** la interfaz cambia a oscuro y esa preferencia se conserva al recargar o volver más tarde

#### Scenario: Elegir tema claro

- **WHEN** una persona selecciona el tema Claro
- **THEN** la interfaz cambia a claro y esa preferencia se conserva al recargar o volver más tarde

#### Scenario: Primera visita sin preferencia

- **WHEN** una persona abre la aplicación sin una preferencia guardada
- **THEN** el sistema usa la opción Sistema como valor inicial

### Requirement: Aplicación antes del primer pintado

El sistema SHALL aplicar el tema resuelto antes de pintar el contenido, de modo que una preferencia oscura guardada no muestre primero una interfaz clara.

#### Scenario: Carga inicial con tema oscuro guardado

- **WHEN** una persona con preferencia Oscuro recarga cualquier página
- **THEN** el documento se presenta directamente en oscuro, sin un destello claro previo

#### Scenario: Almacenamiento no disponible

- **WHEN** el navegador no permite leer la preferencia guardada
- **THEN** el sistema aplica la opción Sistema sin bloquear la carga

### Requirement: Seguimiento del tema del sistema

Cuando la preferencia sea Sistema, el sistema SHALL resolver el tema a partir de la preferencia del sistema operativo y SHALL actualizarse si esta cambia con la aplicación abierta.

#### Scenario: Cambio del tema del sistema operativo

- **WHEN** la preferencia es Sistema y el sistema operativo pasa de claro a oscuro
- **THEN** la interfaz cambia a oscuro sin requerir recargar la página

### Requirement: Identidad institucional en ambos temas

El sistema SHALL mantener la franja institucional en el verde de marca `#25A200` en ambos temas y SHALL conservar el logo oficial sin filtros, recortes ni alteraciones de color.

#### Scenario: Franja en tema oscuro

- **WHEN** la interfaz está en tema oscuro
- **THEN** la franja superior conserva `#25A200` y el logo institucional se muestra sin modificaciones

### Requirement: Contraste de acciones principales

El sistema SHALL usar `#1B7A00` como color de acción principal en tema claro y `#7FD65B` en tema oscuro, con texto de contraste suficiente para cumplir AA en ambos casos.

#### Scenario: Acción principal en tema claro

- **WHEN** se muestra un botón de acción principal en tema claro
- **THEN** el fondo es `#1B7A00` y el texto alcanza al menos 4.5:1 de contraste

#### Scenario: Acción principal en tema oscuro

- **WHEN** se muestra un botón de acción principal en tema oscuro
- **THEN** el fondo es `#7FD65B` y el texto alcanza al menos 4.5:1 de contraste

### Requirement: Tokens visuales compartidos

Las superficies, textos, bordes, foco, estados y gráficos SHALL consumir tokens centralizados que tengan una variante legible para tema claro y otra para tema oscuro.

#### Scenario: Componente en ambos temas

- **WHEN** un componente usa las primitivas visuales de la plataforma
- **THEN** conserva contraste y legibilidad al alternar entre claro y oscuro sin estilos específicos duplicados por página

### Requirement: Estados interactivos accesibles

Las primitivas de botón, campo y etiqueta SHALL mostrar un indicador de foco visible y SHALL distinguir el estado inválido del estado normal en ambos temas.

#### Scenario: Foco por teclado

- **WHEN** una persona navega con teclado hasta un botón o campo
- **THEN** el elemento muestra un anillo de foco visible sobre el fondo del tema activo

#### Scenario: Campo inválido

- **WHEN** un campo se marca como inválido
- **THEN** su borde y anillo usan el token de error y siguen siendo distinguibles en tema claro y oscuro
