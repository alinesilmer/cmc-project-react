# Nobis Salud — O.S. 402

**Validación en línea · SOAP (WSGeCROS de Gecros)**

| | |
|---|---|
| Estado | **Implementada, corriendo en modo `simulado`** |
| Backend | `app/modules/validaciones/nobis.py` (cliente) + `service.validar_nobis()` |
| Legacy de referencia | `legacy_cmc_php/src/nobis/` (adapter PHP + README) |

## Qué hace

El prestador carga número de afiliado, token de la credencial, código y
cantidad. El backend arma el `<Orden>` que espera Gecros, lo manda dentro de un
sobre **SOAP 1.2** a `InsertarAutorizacionAmb`, y traduce la respuesta. Salga
como salga, **siempre queda una fila** en `detalle_facturacion`, con la traza
cruda en `validacion_respuesta`.

Se portó a Python en vez de dejar el adapter PHP en el medio: así el panel no
depende del contenedor legacy y sigue el mismo molde que Sancor. `src/nobis/`
queda como referencia mientras se prueba.

## Los tres estados

Nobis devuelve `<Estado>` como `A-Autorizado` / `P-Pendiente` / `R-Rechazada`.
Se compara por la inicial, porque el texto después del guion cambia.

| `<Estado>` | `validacion_estado` | ¿Factura? |
|---|---|---|
| `A-Autorizado` | `autorizada` | sí |
| `P-Pendiente` | `pendiente` | no — importe 0, `estado='X'` |
| `R-Rechazada` | `rechazada` | no — importe 0, `estado='X'` |

> **El pendiente es el caso normal en Nobis, no una excepción.** La orden real
> que quedó documentada en el legacy volvió `P-Pendiente` con su número
> (`Num: 5585364`). Queda esperando resolución de la obra social, así que no
> puede facturarse todavía.

## Datos que pide

| Campo | Formato |
|---|---|
| Número de afiliado | hasta 20 dígitos |
| Token de la credencial | 4 dígitos |
| Código de prestación | del nomenclador del Colegio |
| Cantidad | 1 a 99 |

> **El token no se le manda a Nobis.** El WSGeCROS no tiene dónde recibirlo: en
> el legacy es un requisito de la pantalla y se guarda en la base, nada más. Acá
> se mantiene el requisito para no cambiarle la regla al prestador, y el valor
> queda en `validacion_respuesta.token_ingresado`.

## Modo de operación — leer antes de tocar

`NOBIS_MODO` arranca en **`simulado`** y **no sale ningún request** hasta que
alguien lo cambie a propósito.

| Modo | Endpoint |
|---|---|
| `simulado` | ninguno — respuesta fabricada |
| `test` | `wstest.nobissalud.com:7004` |
| `produccion` | `servicioweb.nobissalud.com.ar` |

Config en `app/core/config.py`: `NOBIS_MODO`, `NOBIS_URL_TEST`,
`NOBIS_URL_PROD`, `NOBIS_USUARIO`, `NOBIS_CLAVE`,
`NOBIS_COD_ENTIDAD_EFECTORA`, `NOBIS_TIPO_SOLIC`, `NOBIS_TIMEOUT`.

> **Insertar una autorización es un efecto real**: genera una orden con su
> número en el sistema de Nobis. Anularla también lo es. Con el PHP corriendo en
> paralelo, cuidado con cargar dos veces la misma prestación.

### Credenciales

El README del legacy documenta las de **prueba** (`CMCORR / nobis2025`), pero
`src/nobis/config/api_config.php` ya apunta a **producción** con
`CMCPROF / Nobis2026` y el WSDL de test comentado. Los defaults del backend
nuevo son los de prueba; las de producción van en el `.env`, no en el código.

## Reglas del convenio

Replicadas del legacy, en `construir_xml_orden()`:

| Campo XML | Valor | Regla |
|---|---|---|
| `MatEfector` | `= MatProv` | solicitante y efector son **siempre el mismo médico** |
| `TipoEfector` | `= TipoSolic` | mismo tipo que el solicitante |
| `CodEntidadEfectora` | `90692` | fijo — "Colegio Medico de Corrientes" |
| `TipoSolic` | `12221` | tipo de solicitante de los profesionales del Colegio |

### La rareza del `<Item>`

`<TipoNomenclador>` y `<CodPractica>` se mandan **vacíos**, y el código real
viaja en `<OrigenPracticaCod>` junto con `<OrigenTipoNomCod>1</OrigenTipoNomCod>`.

Así lo arma `buildOrdenXml()` del legacy —ignorando los `tipo_nomenclador` y
`cod_practica` que su propia API recibe y documenta como obligatorios— y así es
como el WS aceptó las órdenes reales. **No "corregirlo" sin probarlo contra
Nobis.**

### Fechas

`dd/mm/YYYY`. Se valida antes de salir que `fecha_realizacion >=
fecha_prescripcion` y que la diferencia no supere **60 días**, para no gastar un
request en algo que el WS va a rechazar igual.

## Anulación

Al eliminar una prestación de Nobis, primero se anula la orden allá
(`AnularOrdenNroCod`) y recién después se da de baja acá. Si la anulación falla,
**no se elimina**: quedarían descalzadas.

Dos diferencias contra Sancor:

- **También se anulan las `pendiente`**, no sólo las autorizadas: una orden en
  `P-Pendiente` existe igual en Nobis y hay que darla de baja.
- El WS exige **`pCodAut`** (el `Cod` de la respuesta), no el número de orden.
  Se guarda en `validacion_respuesta.cod_autorizacion`. Si por lo que sea una
  fila no lo tiene, la baja local se hace igual —si no la prestación queda
  trabada para siempre— pero se marca `anulacion.pendiente_en_nobis` para que
  alguien la anule a mano.

## Qué se guarda

| Columna | Valor |
|---|---|
| `autorizacion` | `Num` — el número de orden |
| `validacion_estado` | `autorizada` / `pendiente` / `rechazada` |
| `validacion_detalle` | `Estado · Mensaje` de Nobis |
| `validacion_respuesta` | modo, estado, nro_orden, **cod_autorizacion**, coseguro informado, token, XML enviado y recibido |

El **coseguro que informa Nobis** (`Cose_Total`) queda en la traza pero **no se
descuenta** del importe: lo paga el afiliado de su bolsillo, así que a la obra
social se le factura el valor completo del nomenclador. (Distinto de Boreal,
donde el coseguro sí se resta.)

## Verificado

- Armado del `<Orden>`: coincide con el builder del legacy campo por campo,
  incluida la rareza de `CodPractica` vacío.
- Parseo de las tres respuestas de autorización, incluido el caso real
  documentado (`P-Pendiente`, `Num 5585364`, `Cod 2126063`).
- Extracción del XML embebido y escapado dentro del sobre SOAP.
- `ConsultarAfiliado` (activo / inactivo / con cobertura) y `AnularOrden`
  (OK / ERROR).
- Modo simulado: no sale ningún request.
- Validaciones de fecha y el `cod_aut` obligatorio de la anulación.

**No probado contra el WS real** — nunca se salió de `simulado`.

## Pendiente

- Pasar a `test` y correr un caso real punta a punta.
- Confirmar `TipoSolic`. El código usa `12221` (el de `nobis.php`), pero el
  README del legacy ejemplifica con `114`. Los dos aparecen en el material.
- `ConsultarAfiliado` está implementada pero **no se usa** en el alta: se
  inserta la orden directo, como hace el legacy (que tiene su chequeo previo
  desactivado con `$nobis_require_active = false`). Si se quiere avisar antes de
  gastar la orden, hay que llamarla desde `validar_nobis()`.
- `ConsultarOrdenCompleta` no se portó: serviría para refrescar el estado de las
  `pendiente` sin tener que reintentar la carga.
