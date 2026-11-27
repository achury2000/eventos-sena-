# plataforma/ci-cd Specification

## Purpose
Definir la verificación automatizada de cada pull request y el camino de
entrega a producción: qué se corre en cada cambio, contra qué servicios
efímeros, en qué orden se aplican las migraciones respecto al despliegue, y qué
secretos se necesitan.

## Requirements

### Requirement: Verificación automática en cada pull request

El sistema SHALL ejecutar en cada pull request, de forma automática, cuatro
verificaciones: lint, verificación de tipos, pruebas de integración y pruebas
end-to-end. El resultado SHALL quedar visible como estado del commit para que
quien revise sepa si pasó sin tener que pedirlo. El sistema SHALL cancelar la
corrida en curso de una rama cuando llega una corrección nueva de esa misma
rama, de modo que no se malgaste tiempo en un commit que ya fue reemplazado.

#### Scenario: Pull request con un error de lint

- **WHEN** se abre un pull request cuyo código tiene un error de lint
- **THEN** la verificación falla, el estado del commit lo muestra y el pull
  request no queda listo para mergear

#### Scenario: Pull request en verde

- **WHEN** se abre un pull request que pasa lint, tipos, integración y e2e
- **THEN** las cuatro verificaciones quedan en estado exitoso

#### Scenario: Corrección posterior en la misma rama

- **WHEN** se sube un commit nuevo a una rama que ya tiene una verificación en
  curso
- **THEN** la corrida anterior se cancela y solo la última decide el estado

### Requirement: Base de datos de pruebas efímera y separada de producción

El sistema SHALL ejecutar las pruebas contra una base de datos Postgres
efímera, creada por el propio runner para esa corrida, y SHALL recrear en cada
corrida la base dedicada de pruebas aplicando las migraciones del repositorio.
Las verificaciones de pull request SHALL negarse a ejecutarse si la base a la
que apuntan no es la efímera del runner, de modo que ninguna prueba pueda
escribir en la base de producción por un error de configuración.

#### Scenario: Aislamiento en cada corrida

- **WHEN** se ejecuta la suite de integración o la e2e
- **THEN** la base de pruebas se crea vacía, se le aplican las migraciones y se
  destruye al terminar, sin que la base de desarrollo local se entere

#### Scenario: Configuración que apunta a producción

- **WHEN** la variable de base de datos de una verificación apunta a un host que
  no es el del runner
- **THEN** el job se detiene antes de correr cualquier prueba e informa que se
  niega a conectarse a esa base

### Requirement: Almacenamiento de objetos efímero para las pruebas end-to-end

El sistema SHALL levantar un servicio de almacenamiento compatible con S3 en la
corrida de pruebas end-to-end y SHALL crear el bucket de firmas antes de empezar,
de modo que el flujo de inscripción con firma se pruebe contra almacenamiento
real y no contra un doble.

#### Scenario: Firma guardada durante la prueba

- **WHEN** la prueba e2e de inscripción pública completa una firma
- **THEN** el objeto queda escrito en el bucket de la corrida y el flujo termina
  con la misma referencia que en producción

### Requirement: Migraciones aplicadas antes de que el código reciba tráfico

Al desplegar a producción, el sistema SHALL aplicar las migraciones pendientes
antes de desplegar el código nuevo. Si la aplicación de migraciones falla, el
sistema SHALL detenerse y no desplegar.

#### Scenario: Migración exitosa

- **WHEN** hay un push a `main` y todas las migraciones pendientes se aplican
  sin error
- **THEN** el despliegue continúa con el código de ese commit

#### Scenario: Migración fallida

- **WHEN** una migración falla al aplicarse
- **THEN** no se despliega código nuevo y el fallo queda visible en la corrida

### Requirement: Despliegue a producción únicamente desde `main`

El sistema SHALL desplegar a producción solo desde la rama `main`, en el entorno
declarado como `production`, y SHALL usar la versión de Node fijada en `.nvmrc`
para compilar. El sistema SHALL fallar de inmediato, antes de tocar nada, si
falta alguno de los secretos necesarios, nombrando el secreto que falta.

#### Scenario: Push a una rama que no es `main`

- **WHEN** hay un push a una rama de trabajo
- **THEN** no se ejecuta ninguna migración ni ningún despliegue

#### Scenario: Secreto faltante

- **WHEN** el job de despliegue arranca sin uno de los secretos configurados
- **THEN** se detiene en el primer paso indicando cuál falta, sin llegar a
  migrar ni a desplegar

### Requirement: Sin credenciales de producción en los pull requests

El sistema SHALL ejecutar las verificaciones de pull request sin exponer
ninguna credencial de producción, y no SHALL requerir servicios externos
adicionales para pasar: el rate limiting SHALL seguir en falla abierta cuando el
servicio de conteo no está configurado.

#### Scenario: Pull request desde un fork

- **WHEN** un pull request viene de una rama externa y el runner no tiene secretos
  de producción
- **THEN** la suite completa pasa igual, porque los límites no se aplican sin el
  servicio de conteo y las pruebas cubren esa rama

### Requirement: Evidencia de la corrida cuando falla

El sistema SHALL conservar los artefactos de depuración de las pruebas
end-to-end cuando la corrida falla, para poder diagnosticar sin tener que
reproducir el fallo en local.

#### Scenario: Corrida fallida

- **WHEN** una prueba e2e falla
- **THEN** el reporte y las trazas quedan adjuntos a la corrida y se puede leer
  qué paso falló
