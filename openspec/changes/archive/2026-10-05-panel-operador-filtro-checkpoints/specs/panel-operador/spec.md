# Spec Delta

## ADDED Requirements

### Requirement: Búsqueda y filtro de checkpoints por nombre o categoría

El panel SHALL permitir al Operador filtrar las tarjetas de checkpoint de todos sus eventos asignados escribiendo un texto libre que se compara, sin distinguir mayúsculas ni tildes, contra el nombre y la categoría del checkpoint (por ejemplo, "60" encuentra "Habitación 601", "habitacion" también, y "alojamiento" encuentra la categoría "Alojamiento"). SHALL ocultar las secciones de eventos sin coincidencias y, si ningún checkpoint coincide, SHALL mostrar un mensaje informativo de "sin resultados" en lugar de las tarjetas. SHALL restaurar el tablero completo al vaciar el filtro. El filtro SHALL operar únicamente sobre los datos ya cargados en el cliente (sin consultas adicionales al servidor) y SHALL conservar intactas las acciones de cada tarjeta visible — activación/desactivación y registro manual — así como el refresco por sondeo.

#### Scenario: El Operador encuentra un checkpoint por texto

- **WHEN** un Operador escribe un fragmento (ej. "60") en el campo de búsqueda
- **THEN** el panel muestra únicamente los checkpoints cuyo nombre o categoría contiene ese fragmento, ocultando el resto de tarjetas y los eventos sin coincidencias

#### Scenario: Búsqueda sin distinguir mayúsculas ni tildes

- **WHEN** un Operador escribe "habitacion" o "ALOJAMIENTO" en el campo de búsqueda
- **THEN** el panel encuentra "Habitación 601" y la categoría "Alojamiento" respectivamente, como si estuvieran escritos sin acentos y en minúsculas

#### Scenario: Sin coincidencias

- **WHEN** un Operador escribe un texto que no coincide con ningún checkpoint
- **THEN** el panel no muestra tarjetas ni secciones de evento y muestra un mensaje indicando que no hay checkpoints que coincidan con la búsqueda

#### Scenario: Vaciar el filtro restaura el tablero

- **WHEN** un Operador borra el texto del campo de búsqueda
- **THEN** el panel vuelve a mostrar todos los eventos asignados con todos sus checkpoints

#### Scenario: Acciones y sondeo activos durante el filtro

- **WHEN** un Operador mantiene un filtro aplicado y usa una tarjeta visible (activar/desactivar o registro manual) o el tablero se refresca por sondeo
- **THEN** las acciones funcionan igual que sin filtro y los conteos actualizados aparecen sin perder el filtro activo