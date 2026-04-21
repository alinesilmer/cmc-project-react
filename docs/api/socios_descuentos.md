# API — Socios Descuento (`/api/deducciones/socios`)

Gestión completa de la asignación de descuentos/conceptos a médicos (`socio_descuento`).

---

## Schema de respuesta — `SocioDescuentoRead`

Todos los endpoints que devuelven un SocioDescuento usan este schema enriquecido:

```json
{
  "id": 1,
  "medico_id": 88,
  "medico_nombre": "GARCIA JUAN CARLOS",
  "medico_nro_socio": 2345,
  "descuento_id": 3,
  "descuento_nombre": "Seguro de malapraxis",
  "descuento_precio": 1500.00,
  "descuento_porcentaje": 0.00,
  "pagador_medico_id": 91,
  "pagador_nombre": "LOPEZ MARIA",
  "pagador_nro_socio": 2400,
  "fecha_alta": "2025-01-01",
  "fecha_baja": null
}
```

| Campo                | Tipo          | Descripción                                                    |
|----------------------|---------------|----------------------------------------------------------------|
| `id`                 | int           | ID del SocioDescuento                                          |
| `medico_id`          | int           | ID interno del médico (`listado_medico.ID`)                    |
| `medico_nombre`      | string / null | Nombre del médico                                              |
| `medico_nro_socio`   | int / null    | NRO_SOCIO del médico                                           |
| `descuento_id`       | int           | ID del descuento/concepto                                      |
| `descuento_nombre`   | string / null | Nombre del descuento                                           |
| `descuento_precio`   | decimal / null| Precio fijo del descuento (0 si usa porcentaje)                |
| `descuento_porcentaje` | decimal / null | Porcentaje del descuento (0 si usa precio fijo)             |
| `pagador_medico_id`  | int / null    | ID del médico que paga este descuento (null = el propio médico)|
| `pagador_nombre`     | string / null | Nombre del pagador (null si no hay pagador delegado)           |
| `pagador_nro_socio`  | int / null    | NRO_SOCIO del pagador                                          |
| `fecha_alta`         | date / null   | Fecha de alta de la asignación (`YYYY-MM-DD`)                  |
| `fecha_baja`         | date / null   | Fecha de baja (null = activo)                                  |

---

## Endpoints

### `GET /api/deducciones/socios`

Lista socios-descuento con filtros opcionales.

**Query params:**

| Param          | Tipo   | Descripción                                               |
|----------------|--------|-----------------------------------------------------------|
| `medico_id`    | int    | Filtrar por médico                                        |
| `descuento_id` | int    | Filtrar por descuento/concepto                            |
| `q`            | string | Busca por nombre del médico (LIKE, case-insensitive)       |
| `activos_only` | bool   | `true` = solo registros sin `fecha_baja`. Default: `false`|

**Ejemplo:**
```
GET /api/deducciones/socios?medico_id=88
GET /api/deducciones/socios?descuento_id=3&activos_only=true
GET /api/deducciones/socios?q=garcia
```

**Response `200 OK`:** array de `SocioDescuentoRead`

---

### `GET /api/deducciones/socios/{id}`

Devuelve un SocioDescuento por ID.

**Response `200 OK`:** `SocioDescuentoRead`

**Errores:**
| Status | Descripción             |
|--------|-------------------------|
| 404    | SocioDescuento no encontrado |

---

### `POST /api/deducciones/socios`

Asigna un descuento/concepto a un médico.

**Request body:**

```json
{
  "medico_id": 88,
  "descuento_id": 3,
  "pagador_medico_id": null,
  "fecha_alta": "2025-03-01",
  "fecha_baja": null
}
```

| Campo              | Tipo | Requerido | Descripción                                          |
|--------------------|------|-----------|------------------------------------------------------|
| `medico_id`        | int  | ✓         | ID interno del médico (`listado_medico.ID`)           |
| `descuento_id`     | int  | ✓         | ID del descuento a asignar                           |
| `pagador_medico_id`| int  |           | ID del médico pagador. Null = paga el propio médico  |
| `fecha_alta`       | date |           | Default: hoy (`YYYY-MM-DD`)                          |
| `fecha_baja`       | date |           | Default: null (activo)                               |

**Response `201 Created`:** `SocioDescuentoRead`

**Errores:**
| Status | Descripción                                        |
|--------|----------------------------------------------------|
| 404    | Médico no encontrado                               |
| 404    | Descuento no encontrado                            |
| 404    | Médico pagador no encontrado                       |
| 409    | El médico ya tiene asignado ese descuento (unique constraint `medico_id + descuento_id`) |

---

### `PATCH /api/deducciones/socios/{id}`

Actualiza `descuento_id`, `pagador_medico_id` y/o `fecha_baja` de un SocioDescuento.

**Solo se modifican los campos enviados explícitamente.**
Para quitar el pagador delegado: enviar `pagador_medico_id: null`.

**Request body (todos opcionales):**

```json
{
  "descuento_id": 5,
  "pagador_medico_id": 91,
  "fecha_baja": null
}
```

| Campo              | Tipo | Descripción                                                   |
|--------------------|------|---------------------------------------------------------------|
| `descuento_id`     | int  | Nuevo descuento a asignar                                     |
| `pagador_medico_id`| int / null | Nuevo pagador. Enviar `null` para quitar el pagador     |
| `fecha_baja`       | date / null | Nueva fecha de baja. Enviar `null` para reactivar      |

**Ejemplos:**

Solo cambiar el descuento:
```json
{ "descuento_id": 7 }
```

Asignar un pagador:
```json
{ "pagador_medico_id": 91 }
```

Quitar el pagador:
```json
{ "pagador_medico_id": null }
```

Dar de baja:
```json
{ "fecha_baja": "2025-12-31" }
```

**Response `200 OK`:** `SocioDescuentoRead` actualizado

**Errores:**
| Status | Descripción                      |
|--------|----------------------------------|
| 404    | SocioDescuento no encontrado     |
| 404    | Descuento no encontrado          |
| 404    | Médico pagador no encontrado     |

---

### `DELETE /api/deducciones/socios/{id}`

Elimina físicamente un SocioDescuento (desasigna el concepto del médico).

**Response `204 No Content`**

**Errores:**
| Status | Descripción                      |
|--------|----------------------------------|
| 404    | SocioDescuento no encontrado     |

---

### `PATCH /api/deducciones/socios/{id}/pagador` *(legacy)*

Endpoint anterior — solo actualiza el pagador. Seguirá funcionando para compatibilidad, pero se recomienda usar `PATCH /api/deducciones/socios/{id}`.

```json
{ "pagador_medico_id": 91 }
```

---

## Flujo típico front-end

### Ver conceptos asignados a un médico
```
GET /api/deducciones/socios?medico_id=88
```

### Asignar un concepto a un médico
```
POST /api/deducciones/socios
{ "medico_id": 88, "descuento_id": 3 }
```

### Cambiar el pagador de un concepto
```
PATCH /api/deducciones/socios/1
{ "pagador_medico_id": 91 }
```

### Quitar el pagador (el médico paga él mismo)
```
PATCH /api/deducciones/socios/1
{ "pagador_medico_id": null }
```

### Cambiar a qué descuento/concepto apunta la asignación
```
PATCH /api/deducciones/socios/1
{ "descuento_id": 7 }
```

### Desasignar un concepto
```
DELETE /api/deducciones/socios/1
```

---

## Notas

- `medico_id` en el body de `POST /socios` es el **ID interno** de `listado_medico`, no el `NRO_SOCIO`. Si el front busca médicos por `NRO_SOCIO`, debe primero obtener el `ID` interno del médico (disponible en cualquier endpoint de médicos).
- El constraint `UNIQUE(medico_id, descuento_id)` impide asignar el mismo descuento dos veces al mismo médico. Si se necesita re-asignar, primero eliminar el registro existente.
- Los campos `descuento_precio` y `descuento_porcentaje` son informativos — reflejan el valor al momento de la consulta, no un snapshot. La prioridad de cálculo en el motor de deducciones es: porcentaje > precio fijo.
