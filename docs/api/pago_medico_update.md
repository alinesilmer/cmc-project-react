# Pago Médico y Recibos — Referencia para el Front

> Prefijo base: `/api/pagos/{pago_id}`

---

## Conceptos clave

| Concepto         | Descripción                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PagoMedico**   | Resumen por médico dentro de un pago. Se genera/actualiza vía `GET /pago_medico_actualizado`. Incluye honorarios, gastos, bruto, débitos, créditos, reconocido, deducciones y neto a pagar. Guarda además un `detalle_json` completo. |
| **Recibo**       | Documento generado a partir del PagoMedico. Copia el `detalle_json` en el momento de su generación (snapshot). Se genera con `POST /recibos/generar`.                                                                                 |
| `medico_id`      | Siempre es el **ID (PK interna)** de `listado_medico`, **no** el NRO_SOCIO.                                                                                                                                                           |
| `pago_medico_id` | FK en Recibo que apunta al PagoMedico del que fue generado.                                                                                                                                                                           |

---

## Flujo típico

```
1. GET  /pago_medico_actualizado          → recalcula y guarda PagoMedico para todos (o uno)
2. POST /recibos/generar                  → genera Recibos desde los PagoMedico
3. PATCH /recibos/estado                  → marcar como "emitido" los recibos confirmados
4. DELETE /recibos                        → eliminar recibos incorrectos si hace falta
```

---

## Estados del Recibo

| Estado        | Cuándo se usa                                           |
| ------------- | ------------------------------------------------------- |
| `en_revision` | Default al generar el recibo con el pago **abierto**    |
| `liquidado`   | Default al generar el recibo con el pago **cerrado**    |
| `emitido`     | El front lo marca explícitamente vía PATCH              |
| `anulado`     | Anulación manual (endpoint de liquidación)              |
| `pagado`      | Recibo efectivamente cobrado — **no se puede eliminar** |

---

## Endpoints

### GET `/api/pagos/{pago_id}/pago_medico_actualizado`

Recalcula y persiste `PagoMedico` para uno o todos los médicos del pago, y devuelve el resultado.

**Query params**

| Param       | Tipo  | Requerido | Descripción                                                             |
| ----------- | ----- | --------- | ----------------------------------------------------------------------- |
| `medico_id` | `int` | No        | PK interna del médico. Si se omite, procesa todos los médicos del pago. |

**Response `200`**

```jsonc
{
  "42": {                          // medico_id (PK interna)
    "info_medico": {
      "id": 42,
      "nro_socio": 1234,
      "matricula": 5678,
      "nombre": "RODRIGUEZ LAUTARO"
    },
    "resumen": {
      "honorarios": 15000.00,
      "gastos": 2500.00,
      "bruto": 17500.00,
      "debitos": 800.00,
      "creditos": 200.00,
      "reconocido": 16900.00,
      "deducciones": 1200.00,
      "neto_a_pagar": 15700.00
    },
    "detalle": {
      "liquidaciones": {
        "7": {                      // liquidacion_id
          "obra_social": "OSDE",
          "periodo": "03/2025",
          "total_honorarios": 10000.00,
          "total_gastos": 1500.00,
          "total_bruto": 11500.00,
          "debitos": {
            "total": 500.00,
            "detalle": [
              { "lote_id": 3, "honorarios": 400.00, "gastos": 100.00, "total": 500.00 }
            ]
          },
          "creditos": {
            "total": 200.00,
            "detalle": [
              { "lote_id": 5, "honorarios": 200.00, "gastos": 0.00, "total": 200.00 }
            ]
          }
        },
        "9": {
          "obra_social": "Swiss Medical",
          "periodo": "03/2025",
          "total_honorarios": 5000.00,
          "total_gastos": 1000.00,
          "total_bruto": 6000.00,
          "debitos": { "total": 300.00, "detalle": [ ... ] },
          "creditos": { "total": 0.00, "detalle": [] }
        }
      },
      "deducciones": {
        "total": 1200.00,
        "detalle": [
          {
            "nro_deduccion": 101,           // Descuentos.nro_colegio
            "nombre_deduccion": "Cuota social",
            "periodo_a_aplicar": "03/2025",
            "total": 800.00
          },
          {
            "nro_deduccion": 102,
            "nombre_deduccion": "Seguro colectivo",
            "periodo_a_aplicar": "02/2025",
            "total": 400.00
          }
        ]
      }
    }
  }
  // ...más médicos si no se pasó medico_id
}
```

> **Nota:** Si el pago está **abierto**, las deducciones muestran `monto_aplicado` de las `Deduccion` en estado `en_pago`. Si está **cerrado**, muestra lo efectivamente aplicado desde `DeduccionAplicacion`.

---

### POST `/api/pagos/{pago_id}/recibos/generar`

Genera o actualiza los recibos a partir del `PagoMedico`. Copia el `detalle_json` del PagoMedico al Recibo en el momento de la generación (snapshot).

- Si ya existe un Recibo con el mismo `pago_medico_id` → lo **actualiza**.
- Si no existe → lo **crea**.

**Body (opcional)**

```json
{
  "medico_ids": [42, 87, 103]
}
```

Si se omite el body (o `medico_ids` es `null`), genera para **todos** los médicos con PagoMedico en el pago.

**Response `200`** — lista de recibos generados/actualizados

```jsonc
[
  {
    "id": 15,
    "nro_recibo": "0001-42",
    "pago_id": 1,
    "medico_id": 42,
    "pago_medico_id": 10,
    "total_neto": 15700.00,
    "estado": "en_revision",        // o "liquidado" si el pago está cerrado
    "emision_timestamp": "2026-04-14T10:30:00",
    "detalle_json": { ... }         // snapshot copiado del PagoMedico
  }
]
```

**Errores**

| Código | Motivo                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------- |
| `404`  | Pago no encontrado                                                                                |
| `404`  | No existe PagoMedico para algún médico indicado (debe ejecutar `pago_medico_actualizado` primero) |

---

### PATCH `/api/pagos/{pago_id}/recibos/estado`

Cambia el estado de una o varias recibos en lote.

**Body**

```json
{
  "recibo_ids": [15, 16, 20],
  "estado": "emitido"
}
```

| Campo        | Tipo     | Valores válidos                               |
| ------------ | -------- | --------------------------------------------- |
| `recibo_ids` | `int[]`  | Al menos 1 ID                                 |
| `estado`     | `string` | `"en_revision"` · `"liquidado"` · `"emitido"` |

**Response `200`** — lista de recibos actualizados (mismo shape que `/recibos/generar`)

**Errores**

| Código | Motivo                                             |
| ------ | -------------------------------------------------- |
| `404`  | Ningún recibo encontrado con esos IDs en este pago |

---

### DELETE `/api/pagos/{pago_id}/recibos`

Elimina una o varias recibos en lote.

**Body**

```json
{
  "recibo_ids": [15, 16]
}
```

| Campo        | Tipo    | Descripción                                                     |
| ------------ | ------- | --------------------------------------------------------------- |
| `recibo_ids` | `int[]` | Al menos 1 ID. No se pueden incluir recibos en estado `pagado`. |

**Response `200`**

```json
{
  "eliminados": [15, 16],
  "total": 2
}
```

**Errores**

| Código | Motivo                                                                              |
| ------ | ----------------------------------------------------------------------------------- |
| `404`  | Ningún recibo encontrado con esos IDs en este pago                                  |
| `409`  | Uno o más recibos están en estado `pagado` — se devuelve la lista de IDs bloqueados |

```jsonc
// 409 body
{
  "reason": "recibos_pagados",
  "recibo_ids": [20],
  "message": "No se pueden eliminar recibos en estado 'pagado'.",
}
```

---

## Shapes de referencia

### PagoMedico (persistido en BD)

```jsonc
{
  "id": 10,
  "pago_id": 1,
  "medico_id": 42,          // ListadoMedico.ID
  "honorarios": 15000.00,
  "gastos": 2500.00,
  "bruto": 17500.00,        // = honorarios + gastos
  "debitos": 800.00,
  "creditos": 200.00,
  "reconocido": 16900.00,   // = bruto + creditos - debitos
  "deducciones": 1200.00,
  "neto_a_pagar": 15700.00, // = max(0, reconocido - deducciones)
  "estado": "liquidado",
  "detalle_json": { ... }   // mismo JSON que devuelve pago_medico_actualizado
}
```

### Recibo (persistido en BD)

```jsonc
{
  "id": 15,
  "nro_recibo": "0001-42",   // formato: "{pago_id:04d}-{medico_id}"
  "pago_id": 1,
  "medico_id": 42,
  "pago_medico_id": 10,      // FK al PagoMedico del que se generó
  "total_neto": 15700.00,
  "estado": "en_revision",
  "emision_timestamp": "2026-04-14T10:30:00",
  "detalle_json": { ... }    // snapshot copiado del PagoMedico al momento de generar
}
```

### Detalle de debito/credito dentro de `detalle_json`

Cada item en `debitos.detalle` o `creditos.detalle` representa un **ajuste individual** de la tabla `ajuste`, con referencia a su lote de origen:

```jsonc
{
  "ajuste_id": 88, // Ajuste.id
  "lote_id": 3, // LoteAjuste.id al que pertenece
  "honorarios": 400.0,
  "gastos": 100.0,
  "total": 500.0,
  "observacion": "Débito por prestación duplicada", // null si no tiene
}
```

### Item de deducción dentro de `detalle_json`

Agrupado por `(nro_deduccion, periodo_a_aplicar)` — clave compuesta:

```jsonc
{
  "nro_deduccion": 101, // Descuentos.nro_colegio
  "nombre_deduccion": "Cuota social",
  "periodo_a_aplicar": "03/2025",
  "total": 800.0,
}
```
