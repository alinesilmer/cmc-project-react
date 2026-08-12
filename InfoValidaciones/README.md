# InfoValidaciones

Estado de cada integración de obra social que se **valida o carga dentro del
sistema** (las que tienen formulario propio en el panel). Las que se resuelven
en el portal de la obra social —IOSCOR, IOSFA, ISSUNNE, Medifé, Prevención
Salud, Swiss Medical, UPCN— no tienen ficha acá: el panel sólo guarda el enlace,
no interviene en la validación.

Una ficha por obra social:

| Obra social | Nº | Validación | Estado real |
|---|---|---|---|
| [Sancor Salud](./sancor.md) | 411 | En línea (SOAP · HL7 v2.4) | Implementada, **en modo simulado** |
| [Omint](./omint.md) | 243 | Manual | Implementada y operativa |
| [Boreal Salud](./boreal.md) | 285 | Manual | Implementada y operativa |
| [Nobis Salud](./nobis.md) | 402 | En línea (SOAP · Gecros) | Implementada, **en modo simulado** |
| [OSPJN · Poder Judicial](./ospjn.md) | 151 | En línea (REST) | Implementada, **en modo simulado** |
| [OSPM · Personal Municipal](./ospm.md) | 433 | Padrón local | Implementada — **falta importar el padrón** |

## Aviso: "operativa" no quiere decir "conectada"

Las seis obras sociales integradas ya están **implementadas en el backend**,
pero ninguna de las tres en línea habló todavía con su obra social:

- **Sancor, Nobis y OSPJN** corren en **modo `simulado`**: la pantalla funciona
  entera y no sale ningún request. Cada una tiene su `*_MODO` en
  `app/core/config.py` y hay que cambiarlo a propósito.
- **OSPM** no valida hasta que se importe el padrón (devuelve un 422 que lo
  aclara).
- **OSPJN** además necesita que se marquen sus 15 códigos de consulta antes de
  salir de simulado, o va a validar las consultas como "otras prestaciones".

`src/app/pages/Validaciones/validaciones.config.ts` las marca a todas
`estado: "operativa"`, lo cual ahora es cierto en cuanto a que el formulario
responde — pero no dice nada del modo. Conviene que el front lea el modo real
del backend antes de exponer estas pantallas a los socios.

El formulario se dibuja igual porque el catálogo del front es estático y no
consulta al backend qué está conectado. Conviene corregir ese `estado` o hacer
que el front lea la lista real antes de exponer estas pantallas a los socios.

## Cómo funciona el circuito, para todas

Salvo el padrón de OSPM (`padron_ospm`), ninguna integración tiene tablas
propias. Todo termina en el circuito nuevo:

- **La prestación** se graba en `detalle_facturacion` con `origen_carga='medico'`
  — nunca en `guardar_atencion`, que es lo que usa el sistema legacy.
- **El período** sale del puntero `periodo_medico_actual` vía
  `facturacion.service.get_periodo_medico`, que resuelve el override por obra
  social y cae al global si esa O.S. no tiene uno. No se usa `periodos_doctor`.
- **El cierre de período** es el de facturación (`facturacion.estado_doctor` /
  `facturacion.estado`), no una marca propia del módulo.
- **Precio y habilitación del código** salen del nomenclador nuevo (`nm_*`) vía
  `facturacion.service.resolver_precio`. No se leen `valor_prestacion` ni
  `valor_nomenclador_nacional`.
- **La respuesta de la obra social** queda en las columnas `validacion_*` de la
  misma fila.

### Lo que la O.S. no autorizó, no factura

Rechazadas y pendientes se graban con importe 0 y `estado='X'`. El prestador ve
qué pasó, pero la fila no entra a ninguna factura ni liquidación: todo el
circuito filtra `estado='A'`.

### Quién puede operar

El dueño del token es el prestador. El personal del Colegio que carga en nombre
de un médico manda `nro_socio` y necesita el scope `medicos:leer`
(`_socio_objetivo()` en `routes.py`).

## Dónde vive cada cosa

| Capa | Ruta |
|---|---|
| Backend — rutas | `cmc_api/app/modules/validaciones/routes.py` |
| Backend — lógica | `cmc_api/app/modules/validaciones/service.py` |
| Backend — cliente Sancor | `cmc_api/app/modules/validaciones/sancor.py` |
| Backend — cliente Nobis | `cmc_api/app/modules/validaciones/nobis.py` |
| Backend — cliente OSPJN | `cmc_api/app/modules/validaciones/ospjn.py` |
| Front — catálogo | `src/app/pages/Validaciones/validaciones.config.ts` |
| Front — formulario | `src/app/pages/Validaciones/ValidacionOS.tsx` |
| Legacy (referencia) | `legacy_cmc_php/src/` |

El sistema legacy sigue funcionando en paralelo. **Ojo con validar dos veces la
misma prestación desde los dos sistemas**: en las obras sociales en línea cada
autorización es un efecto real (consume el token del afiliado y genera un número
de autorización en el sistema de la O.S.).
