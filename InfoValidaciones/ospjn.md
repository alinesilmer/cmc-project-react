# OSPJN · Obra Social del Poder Judicial de la Nación — O.S. 151

**Validación de afiliado en línea · REST/JSON**

| | |
|---|---|
| Estado | **Implementada, corriendo en modo `simulado`** |
| Backend | `app/modules/validaciones/ospjn.py` (cliente) + `service.validar_ospjn()` |
| Tabla nueva | `nm_nomenclador.ospjn_categoria` |
| Legacy de referencia | `legacy_cmc_php/src/judicial/` |

## Qué hace

OSPJN **valida al afiliado**, no autoriza una práctica. Se le manda una
*categoría* de prestación y contesta si el afiliado está en condiciones, con un
`NroConsulta` que acredita la validación.

Consecuencia importante: **no hay nada que anular**. Eliminar la prestación es
una baja local, a diferencia de Sancor y Nobis, donde hay que dar de baja la
autorización del otro lado.

## Los dos pasos

El WCF `PrestadorService.svc` pide autenticarse primero:

1. `POST /Ingresar` con `{"Username","Password"}` → `{"Token","RequestId","Mensaje"}`
2. `POST /ValidarAfiliado` con `Authorization: Bearer <token>` →
   `{"EstadoDescripcion","Mensaje","Nombre","NroAfiliado","NroConsulta","NroDocumento","Resultado"}`

> Las credenciales son **del Colegio**, no del prestador ni del afiliado
> (`api-cmc-test` en pruebas). El token se pide por validación y **nunca sale del
> backend** — en el legacy viajaba por el formulario en un `<input hidden>`.
> No se cachea: el servicio no documenta la vigencia del token, y uno vencido
> falla en silencio con "No se encuentra token de autenticación".

## Datos que pide

| Campo | Formato |
|---|---|
| Número de afiliado | 6 dígitos, con barra de 2 (orden familiar) |
| Código de prestación | del nomenclador del Colegio |

No pide token de credencial: el formulario del panel ya está bien así.

## La categoría, no el código

`CodigoPrestacion` **no es el código del Colegio**: es una categoría de tres
letras. En el nomenclador legacy (`nomenclador.CODIGOJUDICIALES`) hay sólo dos
valores en 1.034 filas:

| Categoría | Qué es | Cuántos |
|---|---|---|
| `CON` | consultas (los `42*`, más `430202`) | 15 |
| `OTR` | todo el resto | 1.019 |

Se guarda en **`nm_nomenclador.ospjn_categoria`** (VARCHAR(3), default `OTR`).
El nombre lleva el prefijo `ospjn_` a propósito: si otra obra social necesita su
propia categorización, va en **su propia** columna.

El precio y lo que se graba usan **siempre el código del Colegio**; a OSPJN sólo
se le manda la categoría.

### ⚠️ Falta marcar los 15 códigos `CON`

Hoy todos los códigos arrancan en `OTR`, así que **una consulta se validaría como
"otras prestaciones"**. Los 15 códigos existen los dos lados, así que es una
sentencia:

```sql
UPDATE nm_nomenclador SET ospjn_categoria = 'CON'
WHERE codigo IN ('420101','420112','420117','420129','420130','420132',
                 '420232','420301','420302','420303','420304','420305',
                 '420351','420352','430202');
```

No la corrí: es un cambio de datos. **Hacerlo antes de salir de `simulado`.**

## Resultado

| Respuesta | `validacion_estado` | ¿Factura? |
|---|---|---|
| `NroConsulta` distinto de 0 | `autorizada` | sí |
| `INACTIVO` / `SUSPENDIDO` | `rechazada` | no — importe 0, `estado='X'` |
| `Afiliado NO encontrado` | `rechazada` | no |
| `No se encuentra token de autenticación` | `rechazada` | no |

El criterio de validez es **`NroConsulta` distinto de 0**. Es el mismo invariante
que sostiene el legacy —que pone `NroConsulta = 0` a mano en cada caso de
falla— pero leído del dato en vez de reconstruido comparando strings.

## Modo de operación

`OSPJN_MODO` arranca en **`simulado`**: no sale ningún request.

| Modo | Endpoint |
|---|---|
| `simulado` | ninguno — respuesta fabricada |
| `test` | `api-test.ospjn.gov.ar` |
| `produccion` | `api.ospjn.gov.ar` — **⚠️ SIN CONFIRMAR** |

> **La URL de producción es una suposición.** Todo el material del legacy apunta
> a `api-test`, incluidas las credenciales. Hay que pedirle a OSPJN el endpoint
> productivo y el usuario de API antes de cambiar el modo. El valor que está en
> `config.py` es el de test con el `-test` sacado, nada más.

Config en `app/core/config.py`: `OSPJN_MODO`, `OSPJN_URL_TEST`,
`OSPJN_URL_PROD`, `OSPJN_USUARIO`, `OSPJN_PASSWORD`, `OSPJN_TIMEOUT`.

## Diferencias contra el legacy

| Legacy | Sistema nuevo |
|---|---|
| `guardar_atencion` | `detalle_facturacion` con `origen_carga='medico'` |
| `nomenclador.CODIGOJUDICIALES` | `nm_nomenclador.ospjn_categoria` |
| Importe de `nomenclador.HONORARIOS` | `resolver_precio` sobre `nm_*` |
| Token en un `<input hidden>` del form | nunca sale del backend |
| JSON armado a mano, **con coma final inválida** | `json.dumps` |
| Reconstruye el fallo comparando strings | lee `NroConsulta` |
| Si falla, igual graba con importe 0 | igual, pero además con `estado='X'` para que no facture |

## Verificado

- Interpretación de las cinco respuestas que maneja el legacy: activo,
  `INACTIVO`, `SUSPENDIDO`, `Afiliado NO encontrado`, `No se encuentra token de
  autenticación`.
- El cuerpo que se manda es JSON válido (el del legacy no lo es).
- Modo simulado: no sale ningún request.

**No probado contra el servicio real** — nunca se salió de `simulado`.

## Pendiente

- **Marcar los 15 códigos `CON`** (SQL arriba). Bloqueante.
- Conseguir el **endpoint y las credenciales de producción**.
- Pasar a `test` y correr un caso real punta a punta.
- El legacy tenía una tabla `validarusuario` para guardar token/RequestId por
  validación; está comentada allá y no se portó. Si OSPJN pide trazabilidad de
  sesiones, hay que agregarla.
