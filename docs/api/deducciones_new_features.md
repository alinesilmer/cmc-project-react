# Deducciones por Pago — Endpoints

Estos dos endpoints permiten al frontend verificar si un pago tiene deducciones generadas y, si es necesario, deshacerlas completamente.

---

## 1. Verificar deducciones de un pago

### `GET /api/deducciones/por_pago/{pago_id}`

Devuelve si existen deducciones asociadas al pago indicado, junto con el listado completo y el monto total acumulado.

#### Path params

| Parámetro | Tipo      | Descripción             |
| --------- | --------- | ----------------------- |
| `pago_id` | `integer` | ID del pago a consultar |

#### Request

No requiere body.

```
GET /api/deducciones/por_pago/42
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "existe": true,
  "pago_id": 42,
  "total": 3,
  "monto_total": "1500.00",
  "items": [
    {
      "id": 101,
      "medico_id": 7,
      "descuento_id": 2,
      "descuento_nombre": "Cuota social",
      "origen": "automatico",
      "estado": "en_pago",
      "monto_total": null,
      "monto_cuota": null,
      "calculado_total": "500.00",
      "cuotas_total": null,
      "cuota_nro": 0,
      "cuotificado": null,
      "grupo_id": null,
      "mes_aplicar": 3,
      "anio_aplicar": 2026,
      "pagador_medico_id": null,
      "pago_id": 42,
      "created_at": "2026-03-15T10:00:00"
    }
  ]
}
```

#### Response cuando no hay deducciones

```json
{
  "existe": false,
  "pago_id": 42,
  "total": 0,
  "monto_total": "0.00",
  "items": []
}
```

#### Errores

| Código | Motivo                 |
| ------ | ---------------------- |
| `404`  | El `pago_id` no existe |

#### Campos del response

| Campo         | Tipo               | Descripción                                  |
| ------------- | ------------------ | -------------------------------------------- |
| `existe`      | `boolean`          | `true` si hay al menos una deducción         |
| `pago_id`     | `integer`          | El ID del pago consultado                    |
| `total`       | `integer`          | Cantidad total de deducciones encontradas    |
| `monto_total` | `string (decimal)` | Suma de `calculado_total` de todos los ítems |
| `items`       | `array`            | Lista de deducciones (ver estructura abajo)  |

#### Estructura de cada ítem en `items`

| Campo               | Tipo                        | Descripción                                                    |
| ------------------- | --------------------------- | -------------------------------------------------------------- |
| `id`                | `integer`                   | ID de la deducción                                             |
| `medico_id`         | `integer`                   | ID interno del médico (PK de `listado_medico`)                 |
| `descuento_id`      | `integer \| null`           | ID del descuento/concepto asociado                             |
| `descuento_nombre`  | `string`                    | Nombre del descuento                                           |
| `origen`            | `"manual" \| "automatico"`  | Cómo fue creada la deducción                                   |
| `estado`            | `string`                    | Estado actual: `pendiente`, `en_pago`, `aplicado`, `cancelado` |
| `monto_total`       | `string \| null`            | Monto total del programa (solo manual)                         |
| `monto_cuota`       | `string \| null`            | Monto de la cuota (solo manual)                                |
| `calculado_total`   | `string`                    | Monto efectivo a descontar en este período                     |
| `cuotas_total`      | `integer \| null`           | Total de cuotas del programa (solo manual)                     |
| `cuota_nro`         | `integer`                   | Número de cuota (0 = automático, ≥1 = manual)                  |
| `cuotificado`       | `boolean \| null`           | Si el programa tiene más de una cuota                          |
| `grupo_id`          | `integer \| null`           | ID del grupo de cuotas (manual multi-cuota)                    |
| `mes_aplicar`       | `integer \| null`           | Mes al que corresponde la deducción                            |
| `anio_aplicar`      | `integer \| null`           | Año al que corresponde la deducción                            |
| `pagador_medico_id` | `integer \| null`           | Médico que paga si es delegado                                 |
| `pago_id`           | `integer \| null`           | ID del pago al que está asociado                               |
| `created_at`        | `string (ISO 8601) \| null` | Fecha de creación                                              |

---

## 2. Deshacer descuentos generados

### `DELETE /api/deducciones/{pago_id}/colegio/deshacer`

Elimina todos los descuentos generados automáticamente (`origen='automatico'`, `estado='en_pago'`) para el pago indicado y **revierte los saldos** acumulados en `DeduccionSaldo`.

> **Precondición**: el pago debe estar abierto (`estado='A'`). Los pagos cerrados no pueden deshacerse.

#### Path params

| Parámetro | Tipo      | Descripción                                      |
| --------- | --------- | ------------------------------------------------ |
| `pago_id` | `integer` | ID del pago cuyos descuentos se quieren eliminar |

#### Request

No requiere body.

```
DELETE /api/deducciones/42/colegio/deshacer
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "pago_id": 42,
  "eliminadas": 3,
  "monto_revertido": "1500.00"
}
```

#### Response cuando no había descuentos generados

```json
{
  "pago_id": 42,
  "eliminadas": 0,
  "monto_revertido": "0.00"
}
```

#### Errores

| Código | Motivo                              |
| ------ | ----------------------------------- |
| `404`  | El `pago_id` no existe              |
| `409`  | El pago está cerrado (`estado='C'`) |

#### Campos del response

| Campo             | Tipo               | Descripción                                        |
| ----------------- | ------------------ | -------------------------------------------------- |
| `pago_id`         | `integer`          | El ID del pago procesado                           |
| `eliminadas`      | `integer`          | Cantidad de registros de deducción eliminados      |
| `monto_revertido` | `string (decimal)` | Suma total del monto revertido en `DeduccionSaldo` |

---

## Flujo de uso recomendado (frontend)

```
1. Antes de regenerar descuentos para un pago:
   GET /api/deducciones/por_pago/{pago_id}
   → Si existe = true, mostrar confirmación al usuario

2. Si el usuario confirma:
   DELETE /api/deducciones/{pago_id}/colegio/deshacer
   → Muestra cuántos registros se eliminaron

3. Ahora se puede llamar nuevamente:
   POST /api/deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}
```

---

## Notas importantes

- El endpoint `DELETE /deshacer` solo afecta registros con `origen='automatico'` y `estado='en_pago'`. Las deducciones manuales **no se tocan**.
- Si un descuento fue aplicado (`estado='aplicado'`), tampoco se elimina — eso implica que el pago ya se cerró, lo cual genera un `409` antes de llegar a ese punto.
- `monto_revertido` puede diferir del monto visible en el historial si algún saldo ya fue parcialmente consumido antes del rollback.
