# Boreal Salud — O.S. 285

**Carga manual · con número de validación del portal**

| | |
|---|---|
| Estado | **Implementada y operativa** |
| Backend | `service.crear_prestacion_manual()` + `OBRAS_MANUALES[285]` |
| Legacy de referencia | `legacy_cmc_php/src/boreal_1.php` |

## Qué hace

El prestador valida en el **portal de Boreal**, que le devuelve un número de
autorización, y después lo registra en el panel. El sistema no consulta a Boreal:
guarda lo que el prestador transcribe. Es la única de las tres manuales que
**permite adjuntar la orden en PDF**.

## Datos que pide

| Campo | Formato |
|---|---|
| Número de validación | hasta 20 dígitos — el que devolvió el portal de Boreal |
| Nombre y apellido del afiliado | hasta 40 caracteres, en mayúsculas |
| Número de afiliado | hasta 20 dígitos, con barra de 2 |
| Coseguro | importe; 0 si la prestación no tiene |
| Código de prestación | del nomenclador del Colegio |

## Parámetros de grabado

Definidos en `OBRAS_MANUALES[285]`:

| Parámetro | Valor | Por qué |
|---|---|---|
| `descuenta_coseguro` | `True` | Boreal descuenta el coseguro del total |
| `requiere_autorizacion` | `True` | sin número de validación no se graba |
| `requiere_nombre` | `True` | el nombre del afiliado es obligatorio |
| `admite_orden` | `True` | se puede subir la orden en PDF |

## Adjuntar la orden

`POST /api/validaciones/prestaciones/{id}/orden` sube el PDF sobre una
prestación ya creada. El archivo va al `UPLOAD_ROOT` común
(`app/common/files.py`), no a una carpeta propia del módulo.

## Cómo termina

Fila en `detalle_facturacion` con `origen_carga='medico'`. El coseguro se resta
del importe total (`valor - coseguro`), replicando el cálculo del legacy.

## Pendiente

- El número de validación se guarda **tal cual lo tipea el prestador**: no hay
  forma de verificarlo contra Boreal. Un número mal copiado se descubre recién
  en el rechazo de la obra social.
- Si Boreal expone un servicio de validación, esto pasa a ser una integración en
  línea y el campo deja de tipearse a mano.
