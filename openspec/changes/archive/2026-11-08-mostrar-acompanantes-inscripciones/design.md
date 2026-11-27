# Design

## Context

La página de inscripciones es un Server Component que consulta las inscripciones de un evento y las presenta en una tabla. Cada `Inscripcion` tiene un correo, una firma, un estado y una lista de `Asistente`; exactamente uno de ellos es el titular (`esTitular = true`) y los demás son acompañantes. La consulta actual solo selecciona al titular y usa `_count.asistentes` para mostrar el total. El buscador filtra por correo y por nombre/documento del titular. No se requiere cambiar el esquema ni ningún Route Handler. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**

- Mostrar a todas las personas de cada inscripción sin consultas adicionales por fila.
- Conservar la tabla agrupada por inscripción, la paginación, el orden, el estado, la firma y la cancelación.
- Permitir que la búsqueda encuentre titulares y acompañantes por nombre o documento.
- Mantener la legibilidad de la tabla en pantallas estrechas.

**Non-Goals:**

- Crear una fila por persona o separar la inscripción en varias filas.
- Editar acompañantes, consultar su firma individual o agregar datos personales nuevos.
- Cambiar cupos, checkpoints, reportes, API, base de datos o reglas de negocio.

## Decisions

### D1: Traer todos los asistentes en la consulta existente

En el `findMany` de la página se incluirán todos los `asistentes` con `nombreCompleto`, `documento` y `esTitular`, ordenados con el titular primero y luego por `creadoEn`. El total se obtiene de `asistentes.length`.

- **Por qué:** evita N+1 y aprovecha que una inscripción tiene un máximo acotado de personas.
- **Alternativa descartada:** una consulta por fila para traer acompañantes; agrega latencia y complejidad innecesaria.

### D2: Columna de acompañantes separada del titular

La tabla conservará la columna `Titular` y añadirá `Acompañantes`. La columna que hoy se llama `Asistentes` pasará a llamarse `Total` para expresar que cuenta al titular y a sus acompañantes. Cada acompañante se mostrará en una línea con nombre y documento; si no hay acompañantes se mostrará `Sin acompañantes`.

- **Por qué:** mantiene al titular como referencia principal y hace visibles a los acompañantes sin duplicar su información.
- **Alternativa descartada:** filas expandibles o un modal; requieren estado de cliente y no aportan valor para este caso.

### D3: Búsqueda por cualquier persona de la inscripción

El filtro `asistentes.some` dejará de exigir `esTitular: true`. El correo se seguirá buscando a nivel de inscripción.

- **Por qué:** si un acompañante es visible, el administrador debe poder encontrarlo por nombre o documento.
- **Alternativa descartada:** mantener la búsqueda limitada al titular; produciría resultados incoherentes con la tabla.

### D4: Desplazamiento horizontal en pantallas estrechas

El contenedor de la tabla permitirá desplazamiento horizontal cuando el ancho disponible no alcance para las columnas.

- **Por qué:** la nueva columna aumenta el ancho y no se debe recortar información.
- **Alternativa descartada:** convertir la tabla en tarjetas apiladas; es un rediseño mayor y fuera del alcance.

## Risks / Trade-offs

- **Filas más altas por la lista de acompañantes** → Se usa una lista compacta y se conserva el resto de columnas sin cambios; el máximo de acompañantes por inscripción ya está acotado por la regla de negocio.
- **Búsqueda por nombre de acompañante sin índice dedicado** → Es la misma estrategia que ya se usa para el titular y el volumen por evento es acotado; no se agrega un índice en este change.
- **Datos personales visibles en la tabla** → El acceso sigue protegido por `requireAdmin()`; no se expone la información a otros roles ni se agregan endpoints.
- **Inscripción sin titular por datos inconsistentes** → La fila muestra `—` en titular y sigue listando a los acompañantes; no se altera la base de datos.

## Migration Plan

No hay migración de datos ni de esquema. El cambio se despliega con la aplicación y se revierte revirtiendo la página y su prueba. No requiere variables de entorno nuevas.

## Open Questions

Ninguna.
