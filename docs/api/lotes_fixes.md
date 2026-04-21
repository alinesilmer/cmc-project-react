# Lotes — Fixes y Nuevos Endpoints

## Cambios realizados

### 1. Crear lote cuando la factura ya está en un pago

**Problema:** `POST /api/lotes/snaps/obtener_o_crear` devolvía el lote existente aunque estuviese en estado `C` (cerrado) o `L` (en un pago), impidiendo agregar ítems.
**Fix:** Si el lote encontrado no está en estado `A`, se crea uno nuevo automáticamente.

**Problema:** `POST /api/lotes/snaps/crear_refacturacion` devolvía 409 aunque el lote de refacturación ya hubiese sido incluido en un pago.
**Fix:** Solo bloquea si hay un lote de refacturación en estado `A` (abierto). Si el existente está en `C` o `L`, permite crear uno nuevo.

---

### 2. Nuevo endpoint: búsqueda de atenciones

**Problema:** No existía ningún endpoint para buscar prestaciones en `guardar_atencion` por OS + período antes de crear un ajuste.

---

### 3. Crear ajuste derivando médico desde la atención

**Problema:** El payload de crear ajuste requería `medico_id` explícito. Ahora se puede pasar solo `id_atencion` y el backend deriva `medico_id` (via `NRO_SOCIO → listado_medico`) y `obra_social_id` (via `NRO_OBRA_SOCIAL`) automáticamente.

---

## Endpoints

### `POST /api/lotes/snaps/obtener_o_crear`

Busca un lote de tipo `normal` abierto (`estado='A'`) para la OS + período. Si no existe o el existente ya no está abierto, crea uno nuevo.

**Request body:**
```json
{
  "obra_social_id": 1,
  "mes_periodo": 3,
  "anio_periodo": 2025
}
```

**Response `200 OK`:**
```json
{
  "id": 42,
  "obra_social_id": 1,
  "mes_periodo": 3,
  "anio_periodo": 2025,
  "tipo": "normal",
  "snap_origen_id": null,
  "estado": "A",
  "pago_id": null,
  "total_debitos": "0.00",
  "total_creditos": "0.00",
  "ajustes": []
}
```

---

### `POST /api/lotes/snaps/crear_refacturacion`

Crea un lote de tipo `refacturacion`. Solo rechaza si ya existe uno **abierto** (`estado='A'`) para la misma OS + período.

**Request body:**
```json
{
  "obra_social_id": 1,
  "mes_periodo": 3,
  "anio_periodo": 2025,
  "snap_origen_id": 10
}
```

| Campo          | Tipo    | Requerido | Descripción                              |
|----------------|---------|-----------|------------------------------------------|
| obra_social_id | int     | ✓         |                                          |
| mes_periodo    | int     | ✓         | 1–12                                     |
| anio_periodo   | int     | ✓         |                                          |
| snap_origen_id | int     |           | ID del lote normal que se está corrigiendo |

**Response `201 Created`:** igual a `LoteAjusteRead` (ver arriba).

**Errores:**
| Status | reason                                                  |
|--------|---------------------------------------------------------|
| 409    | Ya existe un lote de refacturación **abierto** para esa OS y período |

---

### `GET /api/lotes/snaps/buscar_atenciones`

Busca prestaciones en `guardar_atencion` filtrando por OS + período, con búsqueda opcional por nombre, nro socio o nro de orden.

**Query params:**

| Param          | Tipo   | Requerido | Descripción                                              |
|----------------|--------|-----------|----------------------------------------------------------|
| obra_social_id | int    | ✓         |                                                          |
| mes_periodo    | int    | ✓         | 1–12                                                     |
| anio_periodo   | int    | ✓         |                                                          |
| q              | string |           | Busca en NOMBRE_PRESTADOR, NRO_SOCIO, NRO_CONSULTA       |
| limit          | int    |           | Default 50, máx 200                                      |

**Ejemplo:**
```
GET /api/lotes/snaps/buscar_atenciones?obra_social_id=1&mes_periodo=3&anio_periodo=2025&q=garcia
```

**Response `200 OK`:** array de `AtencionSearchRow`
```json
[
  {
    "id": 1001,
    "nro_socio": 2345,
    "nombre_prestador": "GARCIA JUAN",
    "nombre_afiliado": "PEREZ MARIO",
    "nro_consulta": "000123",
    "codigo_prestacion": "050101",
    "fecha_prestacion": "2025-03-15",
    "valor_cirujia": 1500.00,
    "mes_periodo": 3,
    "anio_periodo": 2025,
    "nro_obra_social": 1
  }
]
```

---

### `POST /api/lotes/snaps/{lote_id}/items`

Crea un ajuste (débito o crédito) dentro del lote.

**Path param:** `lote_id` — ID del lote en estado `A`.

**Request body:**

| Campo       | Tipo           | Requerido          | Descripción                                                   |
|-------------|----------------|--------------------|---------------------------------------------------------------|
| tipo        | `"d"` \| `"c"` | ✓                  | `"d"` = débito, `"c"` = crédito                               |
| monto       | decimal        | ✓ (> 0)            |                                                               |
| medico_id   | int            | Condicional*       | ID interno de `listado_medico`                                |
| id_atencion | int            | Condicional*       | ID de `guardar_atencion` — deriva `medico_id` automáticamente |
| observacion | string         |                    |                                                               |

> **\*Regla:** Proveer `medico_id` **o** `id_atencion`. Si se provee `id_atencion` sin `medico_id`, el backend:
> 1. Busca el registro en `guardar_atencion` por ese ID
> 2. Deriva `medico_id` via `guardar_atencion.NRO_SOCIO → listado_medico.NRO_SOCIO → listado_medico.ID`
> 3. Deriva `obra_social_id` via `guardar_atencion.NRO_OBRA_SOCIAL`

**Ejemplo — ajuste manual (medico_id explícito):**
```json
{
  "tipo": "d",
  "medico_id": 88,
  "monto": 500.00,
  "observacion": "Descuento por error"
}
```

**Ejemplo — ajuste desde atención (derivado):**
```json
{
  "tipo": "c",
  "id_atencion": 1001,
  "monto": 1500.00,
  "observacion": "Crédito por prestación no liquidada"
}
```

**Response `201 Created`:**
```json
{
  "id": 7,
  "lote_id": 42,
  "tipo": "c",
  "medico_id": 88,
  "obra_social_id": 1,
  "monto": "1500.00",
  "observacion": "Crédito por prestación no liquidada",
  "id_atencion": 1001,
  "origen": "manual"
}
```

**Errores:**
| Status | Descripción                                                 |
|--------|-------------------------------------------------------------|
| 404    | Lote no encontrado                                          |
| 404    | Atención no encontrada (cuando se usa id_atencion)          |
| 404    | Médico no encontrado por NRO_SOCIO (cuando se usa id_atencion) |
| 409    | El lote no está en estado 'A'                               |
| 422    | Ni medico_id ni id_atencion fueron provistos                |

---

### `PUT /api/lotes/snaps/{lote_id}/items/{ajuste_id}`

Actualiza un ajuste existente. Solo funciona si el lote está en estado `A`.

**Request body:**
```json
{
  "tipo": "d",
  "monto": 750.00,
  "observacion": "Corrección de monto"
}
```

Todos los campos son opcionales.

---

### `DELETE /api/lotes/snaps/{lote_id}/items/{ajuste_id}`

Elimina un ajuste. Solo funciona si el lote está en estado `A`.

**Response:** `204 No Content`

---

## Estados del lote

| Estado | Descripción                              | Puede agregar/editar ajustes |
|--------|------------------------------------------|------------------------------|
| `A`    | Abierto                                  | ✓                            |
| `C`    | Cerrado                                  | ✗                            |
| `L`    | En liquidación (asignado a un pago)      | ✗                            |

## Transiciones de estado (`PATCH /snaps/{lote_id}/estado`)

```
A → C   cerrar
C → A   reabrir
C → L   pasar al pago abierto (asigna pago_id automáticamente)
L → C   quitar del pago
```