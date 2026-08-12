# Sancor Salud — O.S. 411

**Validación en línea · SOAP con mensaje HL7 v2.4**

| | |
|---|---|
| Estado | **Implementada, corriendo en modo `simulado`** |
| Backend | `app/modules/validaciones/sancor.py` (cliente) + `service.validar_sancor()` |
| Legacy de referencia | `legacy_cmc_php/src/validarsancor_1.php` |

## Qué hace

El prestador carga número de afiliado, token de la credencial y código. El
backend arma un mensaje **HL7 v2.4**, lo manda dentro de un sobre SOAP al
autorizador de Sancor, y traduce la respuesta a autorizada / rechazada /
pendiente. Salga como salga, **siempre queda una fila** en
`detalle_facturacion` — a diferencia del legacy, que si no entiende la respuesta
no graba nada ni avisa. La traza cruda queda en `validacion_respuesta` para
soporte.

## Datos que pide

| Campo | Formato |
|---|---|
| Número de afiliado | hasta 10 dígitos, con barra de 2 (orden familiar) |
| Token de la credencial | 4 dígitos que muestra la app del afiliado |
| Código de prestación | del nomenclador del Colegio |

## Modo de operación — leer antes de tocar

`SANCOR_MODO` arranca en **`simulado`** y **no sale ningún request** hasta que
alguien lo cambie a propósito. Los tres modos:

| Modo | Endpoint | Processing ID |
|---|---|---|
| `simulado` | ninguno — respuesta fabricada | — |
| `test` | `SANCOR_URL_TEST` (`testservicios.sancorsalud.com.ar`) | `D` |
| `produccion` | `SANCOR_URL_PROD` (`servicios.sancorsalud.com.ar`) | `P` |

Config en `app/core/config.py`: `SANCOR_MODO`, `SANCOR_URL_TEST`,
`SANCOR_URL_PROD`, `SANCOR_CUIT`, `SANCOR_PASAPORTE_TEST`,
`SANCOR_PASAPORTE_PROD`, `SANCOR_TIMEOUT`.

`GET /api/validaciones/sancor/estado` informa contra qué autorizador apunta.

> **Una autorización acá es un efecto real**: consume el token de la credencial
> del afiliado y genera un número de autorización en Sancor. Toda anulación
> (Z04) es igual de real — da de baja la autorización. Con el legacy corriendo
> en paralelo, cuidado con validar dos veces la misma prestación.

## Particularidades del convenio

**Sustitución de códigos por especialidad.** Sancor no acepta ciertos códigos
del nomenclador tal cual; según la especialidad del efector hay que mandar otro.
El precio y lo que se guarda usan **siempre el código del Colegio**; a Sancor se
le manda el sustituto.

| Código Colegio | Especialidad | Se envía |
|---|---|---|
| 420302 | 41 | 420351 |
| 420130 | 33 | 305001 |
| 070660 | 16 | 070715 |

> **Inconsistencia heredada del legacy**: para `420130` + especialidad 33, la
> primera rama de `validarsancor_1.php` manda `420351` (con `305001` comentado)
> y las otras tres mandan `305001`. Acá se unificó en `305001`, que es lo que
> hacen 3 de las 4 ramas. Si Sancor espera `420351`, cambiar `SUSTITUCIONES`.

**Códigos no admitidos por esta vía**: `180127`.

**Gestión presencial**: `070660` no se autoriza en línea — el afiliado tiene que
tramitarlo en oficinas de Sancor. La respuesta vuelve con `requiere_gestion`.

El catálogo del front además marca `codigosBloqueados: ["180164", "180150"]`,
que **no aparecen en el backend**. Vale revisar de dónde salieron y unificar el
criterio en un solo lugar.

## Orden de las operaciones

Importa: `validar_sancor()` corre el gate de período **antes** de hablar con
Sancor. No se pide una autorización que después no se va a poder grabar, porque
el token del afiliado ya se habría consumido.

## Pendiente

- Pasar a `test` y validar contra el entorno de Sancor con casos reales.
- Unificar los códigos bloqueados entre front y backend.
- Confirmar la sustitución `420130`/esp. 33 con la obra social.
