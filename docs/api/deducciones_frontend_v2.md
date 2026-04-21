# Deducciones — Guía de API para Frontend

**Base URL:** `http://localhost:8000/api`  
**Auth:** `Authorization: Bearer <token>` en todos los requests.

---

## Índice

1. [Conceptos clave](#1-conceptos-clave)
2. [Deducciones — CRUD unificado](#2-deducciones--crud-unificado)
3. [Generación automática por pago](#3-generación-automática-por-pago)
4. [Socios-Descuento](#4-socios-descuento)
5. [Catálogo de Descuentos](#5-catálogo-de-descuentos)
6. [Errores comunes](#6-errores-comunes)

---

## 1. Conceptos clave

### Estados de una deducción

| Estado      | Descripción                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| `pendiente` | Existe pero no está en ningún pago activo.                                                 |
| `en_pago`   | Incluida en el pago abierto actual. Se cobrará al cierre.                                  |
| `aplicado`  | Cobrada. `monto == saldo_pendiente == 0`. Terminal — no editable.                          |
| `cancelado` | Anulada. Las manuales quedan registradas; las automáticas se borran físicamente. Terminal. |
| `vencida`   | Derivado solo en la respuesta: manual + `pendiente` cuyo período ya pasó.                  |

### Tipos de origen

| `origen`     | Cómo se crea                                 | Cuándo entra al pago                                               |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------ |
| `manual`     | El operador llama a `POST /deducciones`      | Al crearse (si hay pago abierto y no paga por caja) o al refrescar |
| `automatico` | El operador ejecuta `bulk_generar_descuento` | Al generarse, directamente en `en_pago`                            |

### Flag `deducciones_dirty` en el Pago

Cuando cambia algo en el pago (se agrega/quita una liquidación, un lote de ajustes, etc.) el campo `deducciones_dirty` del objeto `Pago` pasa a `true`.

**Acción esperada del front:** mostrar aviso y botón "Refrescar descuentos". Al presionarlo llamar a `POST /{pago_id}/deducciones/refrescar`. El flag vuelve a `false`.

### Saldo pendiente

```
saldo_pendiente = monto - monto_aplicado
```

Si `saldo_pendiente > 0` y el estado es `pendiente`, hubo un pago parcial previo.

---

## 2. Deducciones — CRUD unificado

Prefijo base: `/api/deducciones`

---

### `POST /api/deducciones` — Crear deducción manual

Crea una deducción manual. Si hay cuotas (`cuotas > 1`) genera una fila por cuota, cada una con su período.

**Request body:**

```json
{
  "medico_id": 42,
  "descuento_id": 3,
  "monto_total": "1200.00",
  "cuotas": 3,
  "mes_inicio": 5,
  "anio_inicio": 2026,
  "pagador_medico_id": null
}
```

| Campo               | Tipo       | Req | Descripción                                                                              |
| ------------------- | ---------- | --- | ---------------------------------------------------------------------------------------- |
| `medico_id`         | int        | ✓   | ID interno del médico (`listado_medico.ID`)                                              |
| `descuento_id`      | int        | ✓   | ID del concepto/descuento                                                                |
| `monto_total`       | decimal    | ✓   | Monto total. Se divide equitativamente entre las cuotas.                                 |
| `cuotas`            | int        | —   | Default `1`. Si es > 1, genera una fila por mes consecutivo.                             |
| `mes_inicio`        | int (1–12) | ✓   | Mes de la primera cuota                                                                  |
| `anio_inicio`       | int        | ✓   | Año de la primera cuota                                                                  |
| `pagador_medico_id` | int / null | —   | Si lo paga otro médico, su ID. El disponible del pagador se usa para calcular el límite. |

**Response `201`:** array de `DeduccionRead` (una por cuota).

```json
[
  {
    "id": 101,
    "medico_id": 42,
    "descuento_id": 3,
    "descuento_nombre": "Cuota mutual",
    "origen": "manual",
    "estado": "en_pago",
    "monto_total": "1200.00",
    "monto_cuota": "400.00",
    "calculado_total": "400.00",
    "monto_aplicado": "0.00",
    "cuotas_total": 3,
    "cuota_nro": 1,
    "cuotificado": true,
    "mes_aplicar": 5,
    "anio_aplicar": 2026,
    "pagador_medico_id": null,
    "created_at": "2026-04-09T10:00:00"
  },
  { "id": 102, "cuota_nro": 2, "mes_aplicar": 6, "...": "..." },
  { "id": 103, "cuota_nro": 3, "mes_aplicar": 7, "...": "..." }
]
```

---

### `GET /api/deducciones` — Listar deducciones (paginado)

Lista unificada de todas las deducciones (manuales + automáticas).

**Query params:**

| Param          | Tipo   | Descripción                                                    |
| -------------- | ------ | -------------------------------------------------------------- |
| `page`         | int    | Default `1`                                                    |
| `size`         | int    | Default `50`, máx `50`                                         |
| `medico_id`    | int    | Filtrar por médico                                             |
| `descuento_id` | int    | Filtrar por concepto                                           |
| `estado`       | string | `pendiente` / `en_pago` / `aplicado` / `cancelado` / `vencida` |
| `origen`       | string | `manual` / `automatico`                                        |
| `mes_desde`    | int    | Período desde (mes)                                            |
| `anio_desde`   | int    | Período desde (año)                                            |
| `mes_hasta`    | int    | Período hasta (mes)                                            |
| `anio_hasta`   | int    | Período hasta (año)                                            |

**Response `200`:**

```json
{
  "total": 120,
  "page": 1,
  "size": 50,
  "monto_total": "45800.00",
  "items": [
    {
      "id": 101,
      "origen": "manual",
      "medico_id": 42,
      "medico_nombre": "GARCIA JUAN",
      "descuento_id": 3,
      "descuento_nombre": "Cuota mutual",
      "monto": "400.00",
      "saldo_pendiente": "400.00",
      "mes_periodo": 5,
      "anio_periodo": 2026,
      "estado": "en_pago",
      "cuota_nro": 1,
      "cuotas_total": 3,
      "created_at": "2026-04-09T10:00:00"
    }
  ]
}
```

> `monto_total` es la suma de **todos** los ítems que cumplen el filtro, no solo la página actual. Útil para mostrar totales.

---

### `GET /api/deducciones/export` — Lista completa sin paginar

Mismos filtros que el listado pero devuelve todos los ítems de una vez. Usar para exportar a Excel/PDF.

**Response `200`:** array de `DeduccionHistorialItem` (mismo formato que `items` del listado).

---

### `GET /api/deducciones/{id}` — Detalle de una deducción

**Response `200`:** `DeduccionHistorialItem`

```json
{
  "id": 101,
  "origen": "manual",
  "medico_id": 42,
  "medico_nombre": "GARCIA JUAN",
  "descuento_id": 3,
  "descuento_nombre": "Cuota mutual",
  "monto": "400.00",
  "saldo_pendiente": "400.00",
  "mes_periodo": 5,
  "anio_periodo": 2026,
  "estado": "en_pago",
  "cuota_nro": 1,
  "cuotas_total": 3,
  "created_at": "2026-04-09T10:00:00"
}
```

**Error:** `404` si no existe.

---

### `PATCH /api/deducciones/{id}` — Editar estado y/o monto

Enviar **al menos uno** de los dos campos.

**Request body:**

```json
{
  "estado": "pendiente",
  "monto": null
}
```

| Campo    | Tipo           | Descripción                                                |
| -------- | -------------- | ---------------------------------------------------------- |
| `estado` | string / null  | Nuevo estado. Valores: `pendiente`, `en_pago`, `cancelado` |
| `monto`  | decimal / null | Nuevo monto (gt=0). No aplica a estados terminales.        |

Si se envían ambos, se aplica primero el monto y luego el estado.

**Transiciones de estado válidas:**

| Desde       | Hacia       |
| ----------- | ----------- |
| `pendiente` | `en_pago`   |
| `en_pago`   | `pendiente` |
| `pendiente` | `cancelado` |
| `en_pago`   | `cancelado` |

No se pueden modificar ítems en estado `aplicado` o `cancelado`.

**Response `200`:** `DeduccionHistorialItem` actualizado.

**Errores:**

| Código | Motivo                                                           |
| ------ | ---------------------------------------------------------------- |
| `422`  | No se envió ni `estado` ni `monto`                               |
| `409`  | Transición de estado no permitida / ítem ya aplicado o cancelado |
| `409`  | No hay pago abierto al intentar pasar a `en_pago`                |
| `404`  | Ítem no encontrado                                               |

---

### `DELETE /api/deducciones/{id}` — Eliminar / cancelar una deducción

- **Manual:** cambia estado a `cancelado`. El registro se conserva en el historial.
- **Automática:** borrado físico de la base de datos.

No aplica a ítems ya `aplicado`.

**Response `200`:**

```json
{
  "id": 101,
  "origen": "manual",
  "estado": "cancelado"
}
```

---

## 3. Generación automática por pago

Estos endpoints operan sobre un `pago_id` específico.

---

### `POST /api/deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}` — Generar descuento masivo

Calcula y registra el monto a descontar para cada médico asignado al descuento `desc_id`. Solo aplica a médicos con `paga_por_caja = false` en su `SocioDescuento`.

No requiere body.

**Response `200`:**

```json
{
  "generados": 87,
  "cargado_total": 34800.0
}
```

**Errores:**

| Código | Motivo                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `404`  | Pago o descuento no encontrado                                                                       |
| `409`  | El pago está cerrado                                                                                 |
| `409`  | `reason: "descuento_ya_generado"` — el descuento ya fue generado para ese mes/año. Eliminar primero. |

El `409` por descuento ya generado tiene un body con más detalle:

```json
{
  "detail": {
    "reason": "descuento_ya_generado",
    "message": "El descuento 3 ya fue generado para 5/2026. Elimine los registros existentes antes de regenerar."
  }
}
```

---

### `POST /api/deducciones/{pago_id}/deducciones/refrescar` — Refrescar deducciones del pago

Ejecutar cuando `deducciones_dirty == true` en el pago. Hace tres cosas:

1. Auto-enrola deducciones manuales `pendientes` cuyo período ≤ pago y `paga_por_caja = false`.
2. Recalcula `calculado_total` de las automáticas con porcentaje (en caso de que haya cambiado el bruto).
3. Resetea `deducciones_dirty = false` en el pago.

No requiere body.

**Response `200`:**

```json
{
  "enroladas": 5,
  "recalculadas": 12,
  "dirty_reset": true
}
```

**Errores:** `404` pago no encontrado / `409` pago cerrado.

---

### `POST /api/deducciones/{pago_id}/colegio/aplicar` — Aplicar deducciones al pago

Distribuye las deducciones `en_pago` contra el disponible de cada médico (bruto − débitos + créditos). Las que no entran quedan en `pendiente` con saldo parcial.

No requiere body.

**Response `200`:**

```json
{
  "aplicadas": 80,
  "parciales": 3,
  "sin_disponible": 4,
  "monto_aplicado_total": "32000.00"
}
```

---

### `GET /api/deducciones/por_pago/{pago_id}` — Verificar deducciones de un pago

**Response `200`:**

```json
{
  "existe": true,
  "pago_id": 7,
  "total": 90,
  "monto_total": "36000.00",
  "items": [
    /* array de DeduccionRead */
  ]
}
```

---

### `DELETE /api/deducciones/{pago_id}/colegio/deshacer` — Deshacer descuentos automáticos

Elimina todos los descuentos de `origen='automatico'` y `estado='en_pago'` del pago. Solo opera si el pago está abierto.

**Response `200`:**

```json
{
  "pago_id": 7,
  "eliminadas": 87,
  "monto_revertido": "34800.00"
}
```

---

### `GET /api/deducciones/top-deudores` — Top médicos con mayor deuda

**Query param:** `limit` (int, default `10`, máx `50`).

**Response `200`:**

```json
[
  {
    "medico_id": 42,
    "medico_nombre": "GARCIA JUAN",
    "nro_socio": 1234,
    "saldo_total": "2400.00"
  }
]
```

---

## 4. Socios-Descuento

Un `SocioDescuento` vincula un médico con un concepto de descuento. Es el registro de "este médico tiene este descuento activo".

Prefijo: `/api/deducciones/socios`

---

### `GET /api/deducciones/socios` — Listar

**Query params:**

| Param          | Tipo   | Descripción                             |
| -------------- | ------ | --------------------------------------- |
| `medico_id`    | int    | Filtrar por médico                      |
| `descuento_id` | int    | Filtrar por descuento                   |
| `q`            | string | Busca por nombre del médico (LIKE)      |
| `activos_only` | bool   | `true`: solo registros sin `fecha_baja` |

**Response `200`:** array de `SocioDescuentoRead`

```json
[
  {
    "id": 15,
    "medico_id": 42,
    "medico_nombre": "GARCIA JUAN",
    "medico_nro_socio": 1234,
    "descuento_id": 3,
    "descuento_nombre": "Cuota mutual",
    "descuento_precio": "400.00",
    "descuento_porcentaje": null,
    "pagador_medico_id": null,
    "pagador_nombre": null,
    "pagador_nro_socio": null,
    "fecha_alta": "2025-01-01",
    "fecha_baja": null,
    "paga_por_caja": false
  }
]
```

---

### `GET /api/deducciones/socios/{id}` — Detalle

**Response `200`:** `SocioDescuentoRead` (mismo formato que arriba).

---

### `POST /api/deducciones/socios` — Crear

**Request body:**

```json
{
  "medico_id": 42,
  "descuento_id": 3,
  "pagador_medico_id": null,
  "fecha_alta": "2026-01-01",
  "fecha_baja": null,
  "paga_por_caja": false
}
```

| Campo               | Tipo        | Req | Descripción                                                                         |
| ------------------- | ----------- | --- | ----------------------------------------------------------------------------------- |
| `medico_id`         | int         | ✓   |                                                                                     |
| `descuento_id`      | int         | ✓   |                                                                                     |
| `pagador_medico_id` | int / null  | —   | Otro médico que paga por este                                                       |
| `fecha_alta`        | date / null | —   | Default: hoy                                                                        |
| `fecha_baja`        | date / null | —   | Para dar de baja futura                                                             |
| `paga_por_caja`     | bool        | —   | Default `false`. Si `true`, no entra en el cálculo automático — paga en ventanilla. |

**Response `201`:** `SocioDescuentoRead`

**Error `409`:** el médico ya tiene ese descuento asignado.

---

### `PATCH /api/deducciones/socios/{id}` — Actualizar

Solo se modifican los campos que se envíen explícitamente. Para quitar el pagador enviar `"pagador_medico_id": null`.

**Request body:**

```json
{
  "descuento_id": 5,
  "pagador_medico_id": null,
  "fecha_baja": "2026-12-31",
  "paga_por_caja": true
}
```

**Response `200`:** `SocioDescuentoRead` actualizado.

---

### `PATCH /api/deducciones/socios/{id}/pagador` — Actualizar solo el pagador

Shortcut para cambiar o quitar el pagador delegado.

**Request body:**

```json
{ "pagador_medico_id": 99 }
```

Para quitar el pagador:

```json
{ "pagador_medico_id": null }
```

**Response `200`:** `SocioDescuentoRead`

---

### `DELETE /api/deducciones/socios/{id}` — Eliminar

Desasigna el descuento del médico. Borrado físico.

**Response `204`:** sin body.

---

## 5. Catálogo de Descuentos

Prefijo: `/api/descuentos`

---

### `GET /api/descuentos` — Listar

**Response `200`:**

```json
[
  {
    "id": 3,
    "nombre": "Cuota mutual",
    "nro_colegio": 10,
    "precio": 400.0,
    "porcentaje": 0.0
  }
]
```

---

### `GET /api/descuentos/{id}` — Detalle

**Response `200`:** `DescuentoOut` (mismo formato que arriba). `404` si no existe.

---

### `POST /api/descuentos` — Crear

**Request body:**

```json
{
  "nombre": "Seguro de mala praxis",
  "nro_colegio": 20,
  "precio": 0.0,
  "porcentaje": 2.5
}
```

Solo uno de `precio` o `porcentaje` debe ser > 0. Si `porcentaje > 0`, el monto se calcula sobre el bruto del médico.

**Response `201`:** `DescuentoOut`

---

### `PATCH /api/descuentos/{id}` — Actualizar

```json
{
  "precio": 450.0,
  "porcentaje": null
}
```

**Response `200`:** `DescuentoOut`

---

### `DELETE /api/descuentos/{id}` — Eliminar

**Response `204`:** sin body.

---

## 6. Errores comunes

| Código | Motivo frecuente                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `404`  | Recurso no encontrado (médico, descuento, deducción, socio)                                          |
| `409`  | Pago cerrado / transición de estado inválida / descuento ya generado / médico ya tiene ese descuento |
| `422`  | Body inválido (campo faltante, tipo incorrecto, o `PATCH /deducciones/{id}` sin ningún campo)        |

---

## Flujo típico del operador

```
1.  Crear pago                        POST /api/pagos
2.  Agregar liquidaciones al pago     POST /api/liquidaciones
3.  Generar descuentos automáticos    POST /api/deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}
         (repetir por cada descuento)
4.  Si pago.deducciones_dirty == true:
        Mostrar botón "Refrescar"     POST /api/deducciones/{pago_id}/deducciones/refrescar
5.  Revisar lista                     GET  /api/deducciones?estado=en_pago
6.  Corregir montos o estados         PATCH /api/deducciones/{id}
7.  Aplicar al cierre                 POST /api/deducciones/{pago_id}/colegio/aplicar
8.  Cerrar pago                       POST /api/pagos/{pago_id}/cerrar
```
