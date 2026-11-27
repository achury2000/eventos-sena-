# Tasks

## 1. Filtro de Operadores en el formulario de asignación

- [x] 1.1 En `src/app/admin/eventos/[id]/form-asignar-operador.tsx`, agregar un estado `filtro` (`useState`) y un `<Input>` de búsqueda que filtre `operadores` por substring insensible a mayúsculas sobre `nombreCompleto` o `email` — verificar que `npm run lint` y `npx tsc --noEmit` no reportan errores.
- [x] 1.2 Rendereizar solo las opciones filtradas en el `<select>`, mostrar "No hay operadores que coincidan con “X”." cuando no queden opciones visibles y deshabilitar el botón "Asignar" en ese caso — verificar en navegador escribiendo un texto sin coincidencias.
- [x] 1.3 Conservar el mensaje existente "No hay operadores disponibles para asignar." cuando no exista ningún Operador sin asignar al evento — verificar en navegador o por revisión de la rama previa al filtro (verificado en vivo: sin disponibles, se muestra el mensaje y no el input).
- [x] 1.4 Verificación final de extremo a extremo con sesión de Administrador: filtro por nombre, filtro por correo, filtro sin coincidencias, y asignación real de un Operador filtrado (debe desaparecer de los disponibles y aparecer en "Operadores asignados") — además `npm run lint` y `npx tsc --noEmit` sin errores.