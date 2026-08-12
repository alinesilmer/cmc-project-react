# Omint — O.S. 243

**Carga manual · sin servicio externo**

| | |
|---|---|
| Estado | **Implementada y operativa** |
| Backend | `service.crear_prestacion_manual()` + `OBRAS_MANUALES[243]` |
| Legacy de referencia | `legacy_cmc_php/src/omint_1.php` |

## Qué hace

Omint autoriza por fuera del panel. Acá el prestador **registra una prestación
ya autorizada** para que entre a la liquidación; el sistema no consulta a nadie.
El comprobante se rinde con el período mensual.

No hay llamada a ningún servicio: `omint_1.php` en el legacy tampoco la tiene
(no aparece un solo `curl` ni `soap` en el archivo). Es una pantalla de carga.

## Datos que pide

| Campo | Formato |
|---|---|
| Nombre y apellido del afiliado | hasta 40 caracteres, en mayúsculas |
| Número de afiliado | hasta 20 dígitos |
| Código de prestación | del nomenclador del Colegio |

## Parámetros de grabado

Definidos en `OBRAS_MANUALES[243]`:

| Parámetro | Valor | Por qué |
|---|---|---|
| `descuenta_coseguro` | `False` | Omint no cobra coseguro |
| `requiere_autorizacion` | `False` | no se pide número de validación previo |
| `requiere_nombre` | `True` | el nombre del afiliado es obligatorio |
| `admite_orden` | `False` | no se adjunta la orden en PDF |

## Cómo termina

Fila en `detalle_facturacion` con `origen_carga='medico'`, período del puntero
`periodo_medico_actual`, precio resuelto contra `nm_*`. Como no hay respuesta de
la obra social que interpretar, la fila entra directo con `estado='A'` y factura
normalmente.

## Pendiente

Nada bloqueante. Es la integración más simple de las tres implementadas: si
Omint algún día expone un validador, se convierte en una obra social en línea
como Sancor y deja de estar en `OBRAS_MANUALES`.
