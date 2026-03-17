# Liquidación — Log de Desarrollo y Documentación de API

> Generado: 2026-02-27
> Módulos relacionados: `liquidacion`, `debitos`, `deducciones`

---

## Índice

1. [Log de Cambios](#log-de-cambios)
2. [Arquitectura General](#arquitectura-general)
3. [Endpoints — Resumen de Liquidación](#endpoints--resumen-de-liquidación)
4. [Endpoints — Liquidación por OS](#endpoints--liquidación-por-os)
5. [Endpoints — Débitos y Créditos OS](#endpoints--débitos-y-créditos-os)
6. [Endpoints — Deducciones Internas](#endpoints--deducciones-internas)
7. [Endpoints — Liquidación Médico](#endpoints--liquidación-médico)
8. [Endpoints — Recibos](#endpoints--recibos)
9. [Fórmulas de Cálculo](#fórmulas-de-cálculo)
10. [Reglas de Negocio](#reglas-de-negocio)

---

## Log de Cambios

### v2 — 2026-02-27 (AGENT DO IT)

#### Modelos — `app/db/models/liquidacion.py`

| Campo / Tabla | Antes | Después | Motivo |
|---|---|---|---|
| `Liquidacion.cierre_timestamp` | `String(25)` | `DateTime` | Queries y ordenamiento real por fecha |
| `DetalleLiquidacion.prestacion_id` | `String(16)` | `Integer FK → guardar_atencion.ID` | Integridad referencial directa, sin cast BigInteger |
| `DetalleLiquidacion.debito_credito_id` | FK a `debito_credito` (1:1) | **Eliminado** | Se invirtió la FK para soportar N DCs por detalle |
| `DetalleLiquidacion.debitos_creditos` | No existía | `relationship` a `Debito_Credito` (1:N) | N DCs por prestación |
| `LiquidacionMedico` | No existía | **Nueva tabla** | Resumen por médico para trazabilidad y recibos |
| `Recibo` | No existía | **Nueva tabla** | Emisión de recibos por médico |
| `ReciboItem` | No existía | **Nueva tabla** | Desglose del recibo por OS/liquidación |

#### Modelos — `app/db/models/financiero.py`

| Campo / Tabla | Antes | Después | Motivo |
|---|---|---|---|
| `Debito_Credito.periodo` | `String(7)` ("YYYY-MM") | **Eliminado** → `anio: int + mes: int` | Evitar bugs de formato, mejor indexación |
| `Debito_Credito.detalle_liquidacion_id` | No existía | FK a `detalle_liquidacion.id` | N DCs por detalle (FK invertida) |
| `Debito_Credito.detalles_liquidacion` | Relationship list | **Eliminado** | Reemplazado por `Debito_Credito.detalle` (N→1) |
| `Deduccion.resumen_id` | No existía | FK a `liquidacion_resumen.id` | Vincular deducción con el período de liquidación |
| `Deduccion` unique | `(medico_id, anio, mes, descuento_id)` × 2 | `(resumen_id, medico_id, descuento_id)` | Eliminar redundancia |
| `DeduccionAplicacion.anio/mes` | Columnas enteras | **Eliminadas** → `resumen_id` FK | Queries limpias sin extraer año/mes de `created_at` |
| `DeduccionAplicacion.descuento_id` | FK a descuentos | **Renombrado** → `concepto_id: Integer` | Patrón polimórfico consistente con `DeduccionSaldo` |
| `DeduccionAplicacion.concepto_tipo` | No existía | `Enum("desc","esp")` | Polimorfismo (desc=descuento, esp=especialidad) |
| `DeduccionAplicacion` unique | `(anio, mes, medico_id, descuento_id)` | `(resumen_id, medico_id, concepto_tipo, concepto_id)` | Alineado con nuevo modelo |

#### Bugs corregidos

| Bug | Archivo | Fix |
|---|---|---|
| `liq.nro_liquidacion` no existe en el modelo | `debitos/routes.py` | Cambiado a `liq.nro_factura` |
| `_formatear_nro_factura(punto_venta, nro_factura)` se llamaba con `db` como primer arg | `liquidacion/service.py` | Eliminado `db` del parámetro (no se usaba) |
| `_is_refacturacion` hacía regex frágil que podía lanzar `AttributeError` | `liquidacion/service.py` | Reemplazado por `bool(liq.refacturado_from)` |
| `print()` de debug en `_calc_row_total` | `liquidacion/service.py` | Eliminados |
| `deducciones/routes.py` insertaba `resumen_id` en `Deduccion` (campo no existente) | `deducciones/routes.py` | Modelo actualizado para tener `resumen_id` |
| `deducciones/routes.py` insertaba `concepto_tipo/concepto_id` en `DeduccionAplicacion` (campos no existentes) | `deducciones/routes.py` | Modelo actualizado |
| `recalcular_resumen_liquidacion` filtraba `DeduccionAplicacion` por `extract(year/month FROM created_at)` | `liquidacion/service.py` | Reemplazado por `WHERE resumen_id = ?` |

#### Servicios nuevos

- `generar_liquidacion_medico(db, resumen_id)` — calcula y persiste `LiquidacionMedico` para todos los médicos del resumen
- `emitir_recibos(db, resumen_id)` — genera `Recibo` + `ReciboItem` por médico

#### Migración Alembic

Archivo: `alembic/versions/a3f91c2b8d40_liquidacion_agent_do_it_refactor.py`

---

## Arquitectura General

```
LiquidacionResumen (mes+año)
  └── Liquidacion × N (por OS+periodo)
        └── DetalleLiquidacion × N (por prestación)
              └── Debito_Credito × N  ← FK está en Debito_Credito
                    (anio, mes, tipo d/c, monto)

  └── LiquidacionMedico × N (resumen por médico — generado)
  └── Recibo × N (recibo por médico — emitido al cerrar)
        └── ReciboItem × N (desglose por liquidación/OS)

Deduccion (snapshot por resumen+médico+descuento)
DeduccionSaldo (saldo acumulado por médico+concepto)
DeduccionAplicacion (lo efectivamente descontado en un resumen)
```

**Fórmula base:**
```
bruto_facturado = Σ DetalleLiquidacion.importe
debitos_os      = Σ Debito_Credito.monto WHERE tipo = 'd'
creditos_os     = Σ Debito_Credito.monto WHERE tipo = 'c'
reconocido      = bruto + creditos_os - debitos_os
deducciones     = Σ DeduccionAplicacion.aplicado (del resumen)
neto_a_pagar    = reconocido - deducciones  (mínimo 0)
```

---

## Endpoints — Resumen de Liquidación

Prefijo: `/api/liquidacion/resumen`

---

### `GET /api/liquidacion/resumen`

Lista resumenes de liquidación con totales calculados on-the-fly.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `mes` | int (1-12) | Filtrar por mes |
| `anio` | int | Filtrar por año |
| `skip` | int | Offset paginación |
| `limit` | int (max 500) | Límite paginación |

**Response 200:**
```json
[
  {
    "id": 1,
    "mes": 1,
    "anio": 2026,
    "total_bruto": "300000.00",
    "total_debitos": "20000.00",
    "total_deduccion": "47000.00",
    "total_neto": "233000.00"
  }
]
```

---

### `POST /api/liquidacion/resumen`

Crea un resumen global (período de liquidación).

**Request body:**
```json
{ "mes": 1, "anio": 2026 }
```

**Response 201:**
```json
{
  "id": 1,
  "mes": 1,
  "anio": 2026,
  "total_bruto": "0.00",
  "total_debitos": "0.00",
  "total_deduccion": "0.00",
  "total_neto": "0.00"
}
```

**Response 409** — si ya existe resumen para ese período:
```json
{
  "detail": {
    "reason": "exists",
    "resumen_id": 1,
    "message": "Ya existe un resumen para 2026-01"
  }
}
```

---

### `GET /api/liquidacion/resumen/{resumen_id}`

Obtiene el resumen con sus liquidaciones hijas.

**Response 200:**
```json
{
  "id": 1,
  "mes": 1,
  "anio": 2026,
  "total_bruto": "300000.00",
  "total_debitos": "20000.00",
  "total_deduccion": "47000.00",
  "total_neto": "233000.00",
  "liquidaciones": [
    {
      "id": 10,
      "resumen_id": 1,
      "obra_social_id": 5,
      "mes_periodo": 1,
      "anio_periodo": 2026,
      "estado": "C",
      "nro_factura": "0001-00000123",
      "cierre_timestamp": "2026-01-31T15:30:00",
      "refacturado_from": null,
      "total_bruto": "300000.00",
      "total_debitos": "20000.00",
      "total_neto": "280000.00"
    }
  ]
}
```

---

### `DELETE /api/liquidacion/resumen/{resumen_id}`

Elimina un resumen y todas sus liquidaciones (cascade).

**Response 204** — sin body.

---

### `POST /api/liquidacion/resumen/{resumen_id}/generar_liquidacion_medico`

Calcula y persiste `LiquidacionMedico` para todos los médicos del resumen.
**Es idempotente**: si ya existen, los actualiza.

**Response 200:**
```json
{
  "resumen_id": 1,
  "total_medicos": 45,
  "items": [
    {
      "medico_id": 1234,
      "bruto": 300000.0,
      "debitos": 20000.0,
      "creditos": 0.0,
      "reconocido": 280000.0,
      "deducciones": 47000.0,
      "neto_a_pagar": 233000.0
    }
  ]
}
```

---

### `GET /api/liquidacion/resumen/{resumen_id}/liquidacion_medico`

Lista todos los `LiquidacionMedico` del resumen (paginado) con totales del dataset completo.

**Query params:** `skip`, `limit` (default 200, max 1000)

> Los **totales** siempre reflejan la suma de TODOS los médicos del resumen, independientemente de la paginación.

**Response 200:**
```json
{
  "totales": {
    "total_medicos": 357,
    "total_bruto": "70701861.38",
    "total_debitos": "0.00",
    "total_creditos": "0.00",
    "total_reconocido": "70701861.38",
    "total_deducciones": "0.00",
    "total_neto_a_pagar": "70701861.38"
  },
  "items": [
    {
      "id": 1,
      "resumen_id": 1,
      "medico_id": 1234,
      "bruto": "300000.00",
      "debitos": "20000.00",
      "creditos": "0.00",
      "reconocido": "280000.00",
      "deducciones": "47000.00",
      "neto_a_pagar": "233000.00",
      "estado": "liquidado"
    }
  ]
}
```

---

### `GET /api/liquidacion/resumen/{resumen_id}/liquidacion_medico/{medico_id}`

Obtiene el resumen de un médico específico.

**Response 200:** igual al item de la lista.
**Response 404** — si no existe.

---

### `POST /api/liquidacion/resumen/{resumen_id}/emitir_recibos`

Genera recibos para todos los médicos del resumen.

**Request:** Sin body — solo el path param `resumen_id`.

**Precondiciones (en orden):**
1. Ejecutar `POST /resumen/{id}/generar_liquidacion_medico` primero.
2. Al menos una liquidación del resumen debe estar `estado = "C"` (cerrar con `POST /liquidaciones_por_os/{id}/cerrar`).

**Comportamiento:**
- Idempotente: si el recibo ya existe en estado `"emitido"`, lo ignora. Si está `"anulado"`, lo reactiva.
- Crea un `Recibo` por cada `LiquidacionMedico` del resumen.
- Por cada recibo, genera `ReciboItem` por cada liquidación donde el médico tenga detalles con importe > 0.

**Response 200:**
```json
{
  "resumen_id": 1,
  "total_recibos": 45,
  "recibos": [
    {
      "medico_id": 1234,
      "nro_recibo": "0001-1234",
      "total_neto": 233000.0,
      "estado": "emitido"
    }
  ]
}
```

**Response 409** — sin liquidaciones cerradas (`"No hay liquidaciones cerradas en este resumen"`) o sin `liquidacion_medico` (`"Ejecutar generar_liquidacion_medico antes de emitir recibos"`).

---

### `GET /api/liquidacion/resumen/{resumen_id}/recibos`

Lista los recibos de un resumen.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `estado` | string | Filtrar: `emitido`, `anulado`, `pagado` |
| `skip` | int | Offset |
| `limit` | int | Límite |

**Response 200:**
```json
[
  {
    "id": 1,
    "nro_recibo": "0001-1234",
    "resumen_id": 1,
    "medico_id": 1234,
    "total_neto": "233000.00",
    "emision_timestamp": "2026-02-01T10:00:00",
    "estado": "emitido",
    "items": [
      {
        "id": 1,
        "recibo_id": 1,
        "liquidacion_id": 10,
        "concepto": "OS 5 - 2026/01 - 0001-00000123",
        "importe": "300000.00"
      }
    ]
  }
]
```

---

## Endpoints — Liquidación por OS

Prefijo: `/api/liquidacion/liquidaciones_por_os`

---

### `POST /api/liquidacion/liquidaciones_por_os/crear`

Crea una liquidación para una OS+período dentro de un resumen global.
Automáticamente:
1. Busca el período en `Periodos` (debe estar `CERRADO = "C"`).
2. Toma `nro_factura` de `Periodos.NRO_FACT_1-NRO_FACT_2`.
3. Puebla `detalle_liquidacion` desde `guardar_atencion` (`EXISTE = "S"`).
4. Recalcula totales.

**Request body:**
```json
{
  "resumen_id": 1,
  "obra_social_id": 5,
  "mes_periodo": 1,
  "anio_periodo": 2026,
  "nro_factura": ""
}
```
> `nro_factura` en el body es ignorado; se toma del período.

**Response 201:**
```json
{
  "id": 10,
  "resumen_id": 1,
  "obra_social_id": 5,
  "mes_periodo": 1,
  "anio_periodo": 2026,
  "estado": "A",
  "nro_factura": "0001-00000123",
  "cierre_timestamp": null,
  "refacturado_from": null,
  "total_bruto": "280000.00",
  "total_debitos": "0.00",
  "total_neto": "280000.00"
}
```

**Response 400** — período no existe o no cerrado.

---

### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`

Obtiene una liquidación por ID.

**Response 200:** igual al body de creación.

---

### `PUT /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`

Actualiza campos de una liquidación. **Solo si está abierta (`estado = "A"`).**

**Request body (todos opcionales):**
```json
{
  "obra_social_id": 5,
  "mes_periodo": 1,
  "anio_periodo": 2026,
  "nro_factura": "0001-00000999"
}
```

**Response 200:** `LiquidacionRead` actualizado.
**Response 409** — liquidación cerrada o conflicto de unicidad.

---

### `DELETE /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`

Elimina una liquidación y sus detalles (cascade).

**Response 204** — sin body.

---

### `POST /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/cerrar`

Cierra la liquidación (`estado = "C"`, `cierre_timestamp = now()`).

**Response 204** — sin body.
**Response 409** — ya está cerrada.

---

### `POST /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/reabrir`

Reabre una liquidación cerrada (`estado = "A"`, `cierre_timestamp = null`).

**Response 200:** `LiquidacionRead` actualizado.
**Response 409** — no está cerrada.

---

### `POST /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/refacturar`

Crea una nueva versión de la liquidación (refacturación).
La original **debe estar cerrada**. La nueva queda en `estado = "A"` con `refacturado_from` apuntando a la original.

**Request body:**
```json
{
  "punto_venta": "0001",
  "nro_factura": "00000456"
}
```

**Response 201:**
```json
{
  "id": 11,
  "resumen_id": 1,
  "obra_social_id": 5,
  "mes_periodo": 1,
  "anio_periodo": 2026,
  "estado": "A",
  "nro_factura": "0001-00000456",
  "cierre_timestamp": null,
  "refacturado_from": 10,
  "total_bruto": "0.00",
  "total_debitos": "0.00",
  "total_neto": "0.00"
}
```

**Response 409** — la liquidación original no está cerrada.

---

### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/detalles_vista`

Vista enriquecida de detalles con datos del médico, afiliado y DCs anidados.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `medico_id` | int | Filtrar por médico |
| `search` | string | Búsqueda por NRO_SOCIO, NOMBRE o CODIGO_PRESTACION |

**Response headers:**
- `X-Total-Count`: total de filas
- `Content-Range`: rango

**Response 200:**
```json
[
  {
    "det_id": 101,
    "socio": 1234,
    "nombreSocio": "PÉREZ JUAN CARLOS",
    "matri": 5678,
    "nroOrden": 99001,
    "fecha": "2026-01-15",
    "codigo": "030101",
    "nroAfiliado": "12345678",
    "afiliado": "GARCIA ANA",
    "xCant": "1-1",
    "porcentaje": 100.0,
    "honorarios": 10000.0,
    "gastos": 0.0,
    "coseguro": 0.0,
    "importe": 10000.0,
    "pagado": 0.0,
    "debitos_creditos_list": [
      {
        "dc_id": 55,
        "tipo": "D",
        "monto": 2000.0,
        "obs": "Falta autorización"
      }
    ],
    "total": 8000.0
  }
]
```

---

### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/detalles`

Detalles brutos de la liquidación (datos crudos de `detalle_liquidacion`).

**Query params:** `medico_id`, `obra_social_id`, `prestacion_id` (int), `skip`, `limit`

**Response 200:**
```json
[
  {
    "id": 101,
    "liquidacion_id": 10,
    "medico_id": 1234,
    "obra_social_id": 5,
    "prestacion_id": 99001,
    "importe": "10000.00",
    "pagado": "0.00"
  }
]
```

---

### `GET /api/liquidacion/debitos_creditos`

Lista DCs globales con filtros.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `obra_social_id` | int | Filtrar por OS |
| `anio` | int | Filtrar por año del período |
| `mes` | int (1-12) | Filtrar por mes del período |
| `skip` | int | Offset |
| `limit` | int | Límite |

**Response 200:** lista de `Debito_Credito` serializado como dict.

---

## Endpoints — Débitos y Créditos OS

Prefijo: `/api/debitos`

---

### `POST /api/debitos/by_detalle/{detalle_id}`

**Agrega un NUEVO DC al detalle.** Un detalle puede tener N DCs.

**Reglas:**
- `tipo = "d"` (débito) o `tipo = "c"` (crédito).
- `monto > 0`.
- Si `tipo = "d"`: `Σ(débitos existentes) + monto ≤ det.importe` → si supera, 422.
- Liquidación debe estar abierta (`estado = "A"`).

**Request body:**
```json
{
  "tipo": "d",
  "monto": "2000.00",
  "observacion": "Falta autorización",
  "created_by_user": 99
}
```

**Response 201:**
```json
{
  "det_id": 101,
  "dc_id": 55,
  "row": {
    "det_id": 101,
    "dc_id": 55,
    "tipo": "D",
    "monto": 2000.0,
    "obs": "Falta autorización",
    "importe": 10000.0,
    "pagado": 0.0,
    "total": 8000.0
  },
  "resumen": {
    "liquidacion_id": 10,
    "nro_factura": "0001-00000123",
    "total_bruto": 300000.0,
    "total_debitos": 20000.0,
    "total_neto": 280000.0
  }
}
```

**Response 409** — liquidación cerrada.
**Response 422** — débito supera el importe de la prestación.

---

### `GET /api/debitos/by_detalle/{detalle_id}`

Lista todos los DCs de un detalle.

**Response 200:**
```json
{
  "det_id": 101,
  "importe": 10000.0,
  "pagado": 0.0,
  "total": 8000.0,
  "items": [
    {
      "dc_id": 55,
      "tipo": "D",
      "monto": 2000.0,
      "obs": "Falta autorización"
    },
    {
      "dc_id": 56,
      "tipo": "C",
      "monto": 500.0,
      "obs": "Ajuste posterior"
    }
  ]
}
```

---

### `PUT /api/debitos/dc/{dc_id}`

Actualiza un DC específico.

**Request body:**
```json
{
  "tipo": "d",
  "monto": "1500.00",
  "observacion": "Monto corregido",
  "created_by_user": 99
}
```

**Response 200:** igual a `POST /by_detalle/{detalle_id}`.
**Response 422** — si el débito actualizado supera el importe.

---

### `DELETE /api/debitos/dc/{dc_id}`

Elimina un DC específico y recalcula totales.

**Response 200:**
```json
{
  "det_id": 101,
  "dc_id": null,
  "row": {
    "det_id": 101,
    "dc_id": null,
    "tipo": "N",
    "monto": 0.0,
    "obs": null,
    "importe": 10000.0,
    "pagado": 0.0,
    "total": 10000.0
  },
  "resumen": {
    "liquidacion_id": 10,
    "nro_factura": "0001-00000123",
    "total_bruto": 300000.0,
    "total_debitos": 18000.0,
    "total_neto": 282000.0
  }
}
```

---

## Endpoints — Deducciones Internas

Prefijo: `/api/deducciones`

---

### `POST /api/deducciones/{resumen_id}/colegio/bulk_generar_descuento/{desc_id}`

Calcula y registra el monto a descontar para cada médico asignado al descuento en el resumen.

Hace UPSERT en:
- `Deduccion` — snapshot por resumen+médico+descuento
- `DeduccionSaldo` — saldo acumulado (se suma si ya existe)

**Prioridad:** porcentaje > precio fijo. Si ambos son 0, el médico se omite.

**Response 200:**
```json
{
  "generados": 3,
  "actualizados": 0,
  "cargado_total": 47000.0
}
```

**Response 404** — resumen o descuento no encontrado.

---

### `POST /api/deducciones/{resumen_id}/colegio/aplicar`

Aplica saldos de deducciones al disponible por médico en el resumen.

**Disponible por médico** = `bruto + créditos_OS - débitos_OS`
**Lo que no entra** queda en `DeduccionSaldo` para períodos futuros.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `desc_id` | int | Opcional: aplicar solo este descuento |
| `solo_generado_mes` | bool (default `true`) | Solo saldos generados en este resumen |

**Response 200:**
```json
{
  "resumen_id": 1,
  "medicos_afectados": 3,
  "aplicado_total": 47000.0,
  "nota": "Aplicado respetando el disponible por médico. Remanente queda en saldos."
}
```

**Response 404** — resumen no encontrado.

---

## Endpoints — Liquidación Médico

Prefijo: `/api/liquidacion/resumen/{resumen_id}/liquidacion_medico`

(Documentados en la sección de Resumen de Liquidación arriba)

---

## Endpoints — Recibos

Prefijo mixto: `/api/liquidacion/resumen/{resumen_id}/recibos` y `/api/liquidacion/recibos/{id}`

(Documentados en la sección de Resumen de Liquidación arriba)

### `GET /api/liquidacion/recibos/{recibo_id}`

Obtiene un recibo por ID con sus ítems.

**Response 200:** igual a un item del listado de recibos.
**Response 404** — recibo no encontrado.

---

### `GET /api/liquidacion/recibos/{recibo_id}/detalle`

Detalle completo del recibo para mostrar al médico. Requiere que el recibo esté emitido.

**Response 200:**
```json
{
  "medico": {
    "id": 1234,
    "nro_socio": 2854,
    "nombre": "PÉREZ JUAN CARLOS"
  },
  "recibo": {
    "id": 1,
    "nro_recibo": "0005-1234",
    "emision_timestamp": "2026-02-01T10:00:00",
    "estado": "emitido"
  },
  "liquidaciones": [
    {
      "liquidacion_id": 10,
      "obra_social_id": 411,
      "obra_social_nombre": "IOSCOR",
      "mes_periodo": 8,
      "anio_periodo": 2025,
      "nro_factura": "0001-00000123",
      "bruto": 300000.0,
      "debitos": [
        {
          "dc_id": 55,
          "prestacion_id": 99001,
          "codigo_prestacion": "030101",
          "fecha": "2025-08-15",
          "monto": 2000.0,
          "motivo": "Falta autorización"
        }
      ],
      "total_debitos": 2000.0,
      "creditos": [],
      "total_creditos": 0.0,
      "reconocido": 298000.0
    }
  ],
  "deducciones": [
    {
      "concepto_tipo": "desc",
      "concepto_id": 1,
      "nombre": "Cuota colegiación",
      "aplicado": 10000.0
    }
  ],
  "total_bruto": 300000.0,
  "total_debitos": 2000.0,
  "total_creditos": 0.0,
  "total_reconocido": 298000.0,
  "total_deducciones": 10000.0,
  "neto_a_pagar": 288000.0
}
```

**Response 404** — recibo no encontrado.

---

### `GET /api/liquidacion/resumen/{resumen_id}/liquidacion_medico/{medico_id}/detalle`

Igual que `/recibos/{id}/detalle` pero sin requerir recibo emitido. Útil para previsualizar el desglose antes de emitir recibos (requiere `medico_id` = `listado_medico.ID`).

**Response 200:** mismo formato que `/recibos/{id}/detalle` con `"recibo": null`.
**Response 404** — resumen o médico no encontrado.

---

### `PUT /api/liquidacion/recibos/{recibo_id}/anular`

Anula un recibo emitido.

**Request body:**
```json
{ "motivo": "Error en cálculo" }
```

**Response 200:** `ReciboRead` con `estado = "anulado"`.
**Response 409** — ya anulado o ya pagado.

---

## Fórmulas de Cálculo

### Por prestación (fila)

```
total_fila = importe + Σ(créditos DC) - Σ(débitos DC)
```

### Por liquidación (OS)

```
total_bruto   = Σ(DetalleLiquidacion.importe)
total_debitos = Σ(DC tipo='d' JOIN detalles de la liquidación)
total_creditos = Σ(DC tipo='c' JOIN detalles de la liquidación)
total_neto    = total_bruto - total_debitos + total_creditos
```

### Por resumen global

```
total_bruto_resumen    = Σ(Liquidacion.total_bruto)
total_debitos_resumen  = Σ(Liquidacion.total_debitos)
total_deduccion_resumen = Σ(DeduccionAplicacion.aplicado WHERE resumen_id = ?)
total_neto_resumen     = total_bruto - total_debitos - total_deduccion
```

### Por médico (LiquidacionMedico)

```
reconocido   = bruto + creditos_OS - debitos_OS
neto_a_pagar = max(0, reconocido - deducciones_internas)
```

---

## Reglas de Negocio

| # | Regla | Implementada en |
|---|---|---|
| 1 | Liquidación cerrada (`estado=C`) no se edita → refacturar | `routes.py` (PUT valida estado) |
| 2 | Débito no puede superar el importe de la prestación | `debitos/routes.py` (422) |
| 3 | Neto negativo → neto = 0, remanente en saldo | `service.generar_liquidacion_medico` |
| 4 | Solo emitir recibos con liquidación cerrada | `service.emitir_recibos` (409) |
| 5 | `prestacion_id` único por liquidación+médico | `UniqueConstraint uq_det_prest_en_liq` |
| 6 | `EXISTE='N'` en guardar_atencion → no se incluye en liquidación | `build_detalles_liquidacion` |
| 7 | Deducciones ya pagadas no se re-aplican | `DeduccionSaldo.saldo > 0` en aplicar |
| 8 | Idempotencia en poblar detalles | `build_detalles_liquidacion` (check existentes) |
| 9 | Refacturación apunta a original con `refacturado_from` | `refacturar_service` |
| 10 | Solo períodos cerrados (`CERRADO='C'`) se pueden liquidar | `crear_liquidacion` |
