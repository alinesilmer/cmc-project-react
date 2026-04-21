# Guía de Módulos Frontend — Sistema de Liquidaciones

> Documento técnico para el equipo de frontend.
> Describe cada módulo: pantallas, funciones, endpoints con request/response completos, manejo de errores y reglas de UI.

---

## Índice

1. [Pagos](#1-pagos)
2. [Facturas / Liquidaciones](#2-facturas--liquidaciones)
3. [Lotes de Ajuste](#3-lotes-de-ajuste)
4. [Detalle de Lote (Ajustes DC)](#4-detalle-de-lote-ajustes-dc)
5. [Refacturaciones](#5-refacturaciones)
6. [Deducciones](#6-deducciones)
7. [Vista Previa del Pago](#7-vista-previa-del-pago)
8. [Recibos](#8-recibos)
9. [Apéndice](#apéndice)

---

## Referencia rápida de estados

| Entidad | Estados |
|---|---|
| **Pago** | `A` = Abierto · `C` = Cerrado |
| **LoteAjuste** | `A` = Abierto · `C` = Cerrado · `L` = En liquidaciones |
| **Recibo** | `emitido` · `anulado` · `pagado` |
| **PagoMedico** | `pendiente` · `liquidado` · `pagado` |

> **Todos los campos monetarios** llegan como string decimal (`"70701861.38"`). Parsear con `parseFloat()` antes de operar o formatear.

---

## 1. Pagos

### Pantallas: 2

---

### 1.1 Lista de Pagos

**Función:** Punto de entrada. Lista todos los pagos del sistema con sus totales. Permite crear uno nuevo.

**Elementos de UI:**
- Tabla: Año · Mes · Descripción · Estado (badge) · Fecha cierre · Bruto · Neto
- Filtros: `anio`, `mes`, `estado`
- Botón "Nuevo pago" (deshabilitar si hay uno con `estado: "A"`)

---

#### `GET /api/pagos/`

**Query params opcionales:**

| Param | Tipo | Descripción |
|---|---|---|
| `anio` | int | Filtrar por año (1900–3000) |
| `mes` | int | Filtrar por mes (1–12) |
| `estado` | string | `"A"` o `"C"` |
| `skip` | int | Paginación offset (default `0`) |
| `limit` | int | Máximo de resultados (default `100`, max `500`) |

**Response `200`** — array de objetos Pago:

```json
[
  {
    "id": 1,
    "anio": 2026,
    "mes": 3,
    "descripcion": "Primer pago Marzo 2026",
    "estado": "C",
    "cierre_timestamp": "2026-03-17T06:07:12",
    "total_bruto": "70701861.38",
    "total_debitos": "15000.00",
    "total_creditos": "5000.00",
    "total_neto": "60793600.30",
    "total_deduccion": "9898261.08"
  }
]
```

> `cierre_timestamp` es `null` si el pago está abierto.
> Los totales se calculan en tiempo real en cada request.

---

#### `POST /api/pagos/`

**Request body:**

```json
{
  "anio": 2026,
  "mes": 3,
  "descripcion": "Primer pago Marzo 2026"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `anio` | int | ✅ | Año del período (1900–3000) |
| `mes` | int | ✅ | Mes del período (1–12) |
| `descripcion` | string | ❌ | Texto libre para identificar el pago |

**Response `201`** — objeto Pago recién creado (misma estructura que GET):

```json
{
  "id": 2,
  "anio": 2026,
  "mes": 3,
  "descripcion": "Primer pago Marzo 2026",
  "estado": "A",
  "cierre_timestamp": null,
  "total_bruto": "0.00",
  "total_debitos": "0.00",
  "total_creditos": "0.00",
  "total_neto": "0.00",
  "total_deduccion": "0.00"
}
```

**Errores:**

| Código | `detail.reason` | Causa | UI sugerida |
|---|---|---|---|
| `409` | `"pago_abierto_existe"` | Ya existe un pago en estado `A` | Mostrar alerta con link al pago abierto usando `detail.pago_id` |

```json
// Estructura del 409
{
  "detail": {
    "reason": "pago_abierto_existe",
    "pago_id": 1,
    "message": "Ya existe un pago en estado abierto. Ciérrelo antes de crear uno nuevo."
  }
}
```

---

### 1.2 Detalle del Pago

**Función:** Vista central de operación. Header con totales + tabs para cada sección.

**Botón principal contextual:**
- `estado = "A"` → "Cerrar pago"
- `estado = "C"` sin recibos emitidos/pagados → "Reabrir pago"
- `estado = "C"` con recibos emitidos/pagados → deshabilitado con tooltip

---

#### `GET /api/pagos/{pago_id}`

**Response `200`:**

```json
{
  "id": 1,
  "anio": 2026,
  "mes": 3,
  "descripcion": "Primer pago Marzo 2026",
  "estado": "C",
  "cierre_timestamp": "2026-03-17T06:07:12",
  "total_bruto": "70701861.38",
  "total_debitos": "15000.00",
  "total_creditos": "5000.00",
  "total_neto": "60793600.30",
  "total_deduccion": "9898261.08"
}
```

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | Redirigir a lista |

---

#### `PUT /api/pagos/{pago_id}`

Solo permite editar `descripcion`. Solo disponible si pago está abierto.

**Request body:**

```json
{ "descripcion": "Nueva descripción" }
```

**Response `200`** — objeto Pago actualizado (misma estructura que GET).

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | — |
| `409` | Pago cerrado | Deshabilitar el campo en UI si `estado = "C"` |

---

#### `DELETE /api/pagos/{pago_id}`

**Response `204`** — sin body.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | — |
| `409` | Tiene liquidaciones asociadas | "Eliminá las facturas primero." |
| `409` | Tiene recibos emitidos | "Anulalos primero." |

---

#### `POST /api/pagos/{pago_id}/cerrar`

Sin body.

**Response `200`** — objeto Pago con `estado: "C"` y `cierre_timestamp` seteado.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | — |
| `409` | Ya está cerrado | No debería ocurrir si la UI maneja el estado |

---

#### `POST /api/pagos/{pago_id}/reabrir`

Sin body.

**Response `200`** — objeto Pago con `estado: "A"` y `cierre_timestamp: null`.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | — |
| `409` | Tiene recibos emitidos o pagados | "Anulalos antes de reabrir." |
| `409` | Otro pago abierto | `"Ya existe otro pago abierto (id=X)"` — mostrar link |

---

## 2. Facturas / Liquidaciones

### Pantallas: 2

Viven dentro del tab "Facturas" del Detalle del Pago.

---

### 2.1 Lista de Facturas del Pago

**Función:** Muestra las obras sociales incluidas en el pago. Permite agregar y eliminar.

**Para el selector de OS+período disponibles**, encadenar dos llamados:
1. `GET /api/obras_social/` → lista de obras sociales
2. `GET /api/periodos/disponibles?obra_social_id={id}` → períodos cerrados aún no incluidos en ningún pago

---

#### `POST /api/liquidacion/liquidaciones_por_os/crear`

**Request body:**

```json
{
  "pago_id": 1,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `pago_id` | int | ✅ | ID del pago al que se agrega |
| `obra_social_id` | int | ✅ | `NRO_OBRASOCIAL` de la obra social |
| `mes_periodo` | int | ✅ | Mes del período a liquidar (1–12) |
| `anio_periodo` | int | ✅ | Año del período a liquidar |

**Response `201`:**

```json
{
  "id": 3,
  "pago_id": 1,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "nro_factura": "00031-00004390",
  "total_bruto": "70701861.38",
  "total_debitos": "0.00",
  "total_creditos": "0.00",
  "total_neto": "70701861.38"
}
```

> El backend copia automáticamente todas las prestaciones del período al crear la liquidación. `total_bruto` ya viene calculado.
> Si `total_bruto = "0.00"`, no hay prestaciones registradas para ese OS+período en `guardar_atencion`.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `400` | `pago_id` inválido | Error interno |
| `409` | Pago cerrado | "El pago está cerrado. Reabrilo para agregar facturas." |
| `400` | Período no cerrado o inexistente | "El período seleccionado no está disponible." |
| `409` | Misma OS+período ya en el pago | "Esta factura ya está incluida en el pago." |

---

#### `DELETE /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`

**Response `204`** — sin body.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Liquidación no encontrada | — |
| `409` | Pago cerrado | "El pago está cerrado." |
| `409` | Lote en estado `L` para esa factura | "Hay un lote de ajustes activo. Quitalo del pago primero." |

---

### 2.2 Vista de Factura (Detalle de Liquidación)

**Función:** Drill-down de una factura: todas las prestaciones con importes y ajustes asociados.

---

#### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`

**Response `200`:**

```json
{
  "id": 3,
  "pago_id": 1,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "nro_factura": "00031-00004390",
  "total_bruto": "70701861.38",
  "total_debitos": "15000.00",
  "total_creditos": "5000.00",
  "total_neto": "70691861.38"
}
```

---

#### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/detalles_vista`

Vista enriquecida — usar para la tabla principal de prestaciones.

**Query params opcionales:**

| Param | Tipo | Descripción |
|---|---|---|
| `medico_id` | int | Filtrar por médico (`NRO_SOCIO`) |
| `search` | string | Búsqueda libre: nombre médico, matrícula o código de prestación |

**Response `200`** — array de filas. Cada fila representa una prestación:

```json
[
  {
    "det_id": 2283,
    "socio": 2894,
    "nombreSocio": "KATAVICH ELIANA GISELE",
    "matri": 2894,
    "nroOrden": 43406,
    "fecha": "2025-06-23",
    "codigo": "130107",
    "nroAfiliado": "1841622/01",
    "afiliado": "RIQUELME^LOURDE",
    "xCant": "1-1",
    "porcentaje": 0.0,
    "honorarios": 44651.25,
    "gastos": 32602.5,
    "coseguro": 0.0,
    "importe": 44651.25,
    "pagado": 0.0,
    "debitos_creditos_list": [
      {
        "ajuste_id": 1,
        "tipo": "D",
        "monto": 15000.0,
        "obs": "Debito test"
      }
    ],
    "total": 29651.25
  }
]
```

| Campo | Descripción |
|---|---|
| `det_id` | ID del `DetalleLiquidacion` |
| `socio` | `NRO_SOCIO` del médico |
| `nombreSocio` | Nombre completo del médico |
| `matri` | Matrícula provincial |
| `nroOrden` | ID de la atención (`guardar_atencion.ID`) |
| `fecha` | Fecha de la prestación (string `YYYY-MM-DD`) |
| `codigo` | Código de prestación |
| `nroAfiliado` | Número de afiliado |
| `afiliado` | Nombre del afiliado |
| `xCant` | `"cantidad-cantidad_tratamiento"` |
| `honorarios` | Valor bruto cirugía/honorario |
| `gastos` | Gastos asociados |
| `importe` | Importe final de la prestación |
| `debitos_creditos_list` | Ajustes DC del lote para este médico en esta OS+período |
| `total` | `importe + créditos - débitos` |

> Los `debitos_creditos_list` se agrupan por médico (no por prestación individual). Todos los ajustes del médico aparecen en cada fila del médico.

---

#### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/detalles`

Versión cruda con paginación — usar si necesitás procesar grandes volúmenes.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `medico_id` | int | Opcional |
| `obra_social_id` | int | Opcional |
| `prestacion_id` | int | Opcional |
| `skip` | int | Offset (default `0`) |
| `limit` | int | Máximo (default `1000`, max `10000`) |

**Response `200`:**

```json
[
  {
    "id": 2283,
    "liquidacion_id": 3,
    "medico_id": 2894,
    "obra_social_id": 411,
    "prestacion_id": 43406,
    "importe": "44651.25",
    "pagado": "0.00"
  }
]
```

---

## 3. Lotes de Ajuste

### Pantallas: 2

Módulo accesible de forma independiente (sin estar dentro de un pago). También aparece en el tab "Lotes" del Detalle del Pago.

---

### 3.1 Lista de Lotes

**Función:** Vista de todos los lotes para un OS+período dado. Permite crear lotes normales.

---

#### `GET /api/lotes/snaps/por_os_periodo`

**Query params requeridos:**

| Param | Tipo | Descripción |
|---|---|---|
| `obra_social_id` | int | `NRO_OBRASOCIAL` |
| `mes_periodo` | int | Mes (1–12) |
| `anio_periodo` | int | Año (1900–3000) |

**Response `200`** — array de lotes (normal + refacturaciones), ordenados por fecha de creación:

```json
[
  {
    "id": 3,
    "obra_social_id": 411,
    "mes_periodo": 8,
    "anio_periodo": 2025,
    "tipo": "normal",
    "snap_origen_id": null,
    "estado": "L",
    "pago_id": 1,
    "total_debitos": "15000.00",
    "total_creditos": "5000.00",
    "ajustes": [
      {
        "id": 1,
        "lote_id": 3,
        "tipo": "d",
        "medico_id": 1,
        "obra_social_id": 411,
        "monto": "15000.00",
        "observacion": "Debito test",
        "id_atencion": null,
        "origen": "manual"
      }
    ]
  },
  {
    "id": 4,
    "obra_social_id": 411,
    "mes_periodo": 8,
    "anio_periodo": 2025,
    "tipo": "refacturacion",
    "snap_origen_id": 3,
    "estado": "A",
    "pago_id": null,
    "total_debitos": "0.00",
    "total_creditos": "0.00",
    "ajustes": []
  }
]
```

| Campo | Descripción |
|---|---|
| `tipo` | `"normal"` o `"refacturacion"` |
| `snap_origen_id` | Para refacturaciones: ID del lote que corrige. `null` si es el primero |
| `estado` | `"A"` = abierto · `"C"` = cerrado · `"L"` = en liquidaciones |
| `pago_id` | ID del pago al que está asignado (seteado al pasar a liquidaciones). `null` si no asignado |
| `ajustes[].tipo` | `"d"` = débito · `"c"` = crédito |
| `ajustes[].medico_id` | `listado_medico.ID` (PK interna, **no** `NRO_SOCIO`) |
| `ajustes[].id_atencion` | ID de `guardar_atencion` (trazabilidad a la prestación). Puede ser `null` |
| `ajustes[].origen` | `"manual"` = cargado por operador · `"importado"` = migración |

---

#### `POST /api/lotes/snaps/obtener_o_crear`

Idempotente. Si ya existe un lote `normal` para esa OS+período, lo devuelve. Si no, lo crea en estado `A`.

**Request body:**

```json
{
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025
}
```

**Response `200`** — objeto LoteAjuste (misma estructura que el array de `por_os_periodo`).

> Si ya existe el lote (incluso cerrado o en liquidaciones), lo devuelve tal como está. No cambia su estado.

---

### 3.2 Detalle de Lote

Ver [módulo 4](#4-detalle-de-lote-ajustes-dc).

---

## 4. Detalle de Lote (Ajustes DC)

### Pantallas: 1

Gestión de débitos y créditos dentro de un lote. Comportamiento varía según estado.

---

#### `GET /api/lotes/snaps/{lote_id}`

**Response `200`** — objeto LoteAjuste con todos sus ajustes embebidos:

```json
{
  "id": 3,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "tipo": "normal",
  "snap_origen_id": null,
  "estado": "L",
  "pago_id": 1,
  "total_debitos": "15000.00",
  "total_creditos": "5000.00",
  "ajustes": [
    {
      "id": 1,
      "lote_id": 3,
      "tipo": "d",
      "medico_id": 1,
      "obra_social_id": 411,
      "monto": "15000.00",
      "observacion": "Debito test",
      "id_atencion": null,
      "origen": "manual"
    },
    {
      "id": 2,
      "lote_id": 3,
      "tipo": "c",
      "medico_id": 1,
      "obra_social_id": 411,
      "monto": "5000.00",
      "observacion": null,
      "id_atencion": null,
      "origen": "manual"
    }
  ]
}
```

**Errores:**

| Código | Causa |
|---|---|
| `404` | Lote no encontrado |

---

#### `POST /api/lotes/snaps/{lote_id}/items`

Solo disponible con lote en estado `A`.

**Request body:**

```json
{
  "tipo": "d",
  "medico_id": 42,
  "monto": 15000.00,
  "observacion": "Falta de autorización",
  "id_atencion": 43406
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `tipo` | `"d"` \| `"c"` | ✅ | `"d"` = débito · `"c"` = crédito |
| `medico_id` | int | ✅ | `listado_medico.ID` (PK interna) |
| `monto` | decimal | ✅ | Debe ser `> 0` |
| `observacion` | string | ❌ | Motivo del ajuste (visible en recibo) |
| `id_atencion` | int | ❌ | ID de `guardar_atencion` para trazar a una prestación |

**Response `201`** — objeto Ajuste:

```json
{
  "id": 1,
  "lote_id": 3,
  "tipo": "d",
  "medico_id": 42,
  "obra_social_id": 411,
  "monto": "15000.00",
  "observacion": "Falta de autorización",
  "id_atencion": 43406,
  "origen": "manual"
}
```

> Tras crear el ajuste, los `total_debitos`/`total_creditos` del lote se recalculan. Hacer un `GET /snaps/{id}` para ver los totales actualizados.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Lote no encontrado | — |
| `409` | Lote no está en estado `A` | "El lote está {estado}. Solo se pueden agregar ajustes en lotes abiertos." |

---

#### `PUT /api/lotes/snaps/{lote_id}/items/{ajuste_id}`

Solo disponible con lote en estado `A`. Todos los campos son opcionales.

**Request body:**

```json
{
  "tipo": "c",
  "monto": 12000.00,
  "observacion": "Motivo actualizado"
}
```

**Response `200`** — objeto Ajuste actualizado (misma estructura que POST).

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Lote o ajuste no encontrado | — |
| `409` | Lote no en estado `A` | "No se puede editar en este estado." |

---

#### `DELETE /api/lotes/snaps/{lote_id}/items/{ajuste_id}`

Solo disponible con lote en estado `A`.

**Response `204`** — sin body.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Lote o ajuste no encontrado | — |
| `409` | Lote no en estado `A` | "No se puede eliminar en este estado." |

---

#### `POST /api/lotes/snaps/{lote_id}/cerrar`

Sin body.

**Response `200`** — objeto LoteAjuste con `estado: "C"` y ajustes embebidos.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Lote no encontrado | — |
| `409` | Ya en estado `C` o `L` | Deshabilitar botón si no está en `A` |

---

#### `POST /api/lotes/snaps/{lote_id}/reabrir`

Sin body.

**Response `200`** — objeto LoteAjuste con `estado: "A"` y ajustes embebidos.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Lote no encontrado | — |
| `409` | Está en estado `L` | "Quitalo del pago antes de reabrir." |
| `409` | Ya en estado `A` | Deshabilitar botón |

---

#### `POST /api/lotes/snaps/{lote_id}/en_liquidaciones`

Asigna el lote al único pago actualmente abierto. Sin body.

**Response `200`** — objeto LoteAjuste con `estado: "L"` y `pago_id` seteado.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Lote no encontrado | — |
| `409` | Lote no está en `C` | "Cerrá el lote primero." |
| `409` | Ya tiene `pago_id` asignado | "El lote ya está en el pago #X." |
| `409` | No hay pago abierto | "No hay ningún pago abierto. Creá uno primero." |

---

#### `DELETE /api/lotes/pagos/{pago_id}/snaps/{lote_id}`

Desvincula el lote del pago. Lo devuelve a estado `C`.

**Response `200`** — objeto LoteAjuste con `estado: "C"` y `pago_id: null`.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago o lote no encontrado | — |
| `409` | Pago cerrado | "El pago está cerrado. Reabrilo primero." |
| `409` | El lote no pertenece a ese pago | Error interno |

---

**Tabla resumen de acciones por estado:**

| Acción | `A` | `C` | `L` |
|---|:---:|:---:|:---:|
| Agregar ajuste | ✅ | ❌ | ❌ |
| Editar ajuste | ✅ | ❌ | ❌ |
| Eliminar ajuste | ✅ | ❌ | ❌ |
| Cerrar | ✅ | ❌ | ❌ |
| Reabrir | ❌ | ✅ | ❌ |
| Pasar a liquidaciones | ❌ | ✅ | ❌ |
| Quitar del pago | ❌ | ❌ | ✅ (si pago `A`) |

---

## 5. Refacturaciones

### Pantallas: 2

Sección dentro del tab "Refacturaciones" del Detalle del Pago. Usa el mismo mecanismo de lotes pero con `tipo: "refacturacion"`.

---

### 5.1 Lista de Refacturaciones del Pago

**Función:** Muestra lotes de tipo `refacturacion` relacionados con las facturas del pago. Permite crear nuevas.

**Para listar**, usar `GET /api/lotes/snaps/por_os_periodo` por cada OS+período del pago y filtrar los de `tipo = "refacturacion"`.

---

#### `POST /api/lotes/snaps/crear_refacturacion`

Siempre crea un lote nuevo (no es idempotente).

**Request body:**

```json
{
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "snap_origen_id": 3
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `obra_social_id` | int | ✅ | OS de la factura a corregir |
| `mes_periodo` | int | ✅ | Mes del período original (1–12) |
| `anio_periodo` | int | ✅ | Año del período original |
| `snap_origen_id` | int | ❌ | ID del lote que se está corrigiendo. `null` si es la primera refacturación. Para "refacturación de refacturación", apuntar al lote de refacturación previo |

**Response `201`** — objeto LoteAjuste recién creado con `tipo: "refacturacion"`:

```json
{
  "id": 4,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "tipo": "refacturacion",
  "snap_origen_id": 3,
  "estado": "A",
  "pago_id": null,
  "total_debitos": "0.00",
  "total_creditos": "0.00",
  "ajustes": []
}
```

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `409` | Ya existe una refacturación para ese `snap_origen_id` | "Ya existe una corrección para ese lote. Para corregirla, crear una refacturación sobre esa." |

---

### 5.2 Detalle de Refacturación

Idéntico al [Detalle de Lote](#4-detalle-de-lote-ajustes-dc). Mismos endpoints, misma lógica.

La diferencia visual es: mostrar el badge "Refacturación" y, si tiene `snap_origen_id`, mostrar "Corrige al lote #X".

---

## 6. Deducciones

### Pantallas: 1

Tab "Deducciones" en el Detalle del Pago. Flujo en dos pasos: generar → aplicar.

---

#### `GET /api/descuentos`

Lista el catálogo de descuentos disponibles.

**Response `200`:**

```json
[
  {
    "id": 1,
    "nombre": "Contribución s/honorarios",
    "nro_colegio": 100,
    "precio": 0.0,
    "porcentaje": 7.0
  },
  {
    "id": 2,
    "nombre": "Contribucion s/gastos",
    "nro_colegio": 101,
    "precio": 0.0,
    "porcentaje": 3.0
  }
]
```

| Campo | Descripción |
|---|---|
| `precio` | Monto fijo a descontar (si `porcentaje = 0`) |
| `porcentaje` | % sobre el bruto del médico (tiene precedencia sobre `precio`) |

---

#### `POST /api/deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}`

**Paso 1.** Calcula el monto a descontar por médico y lo registra. Sin body.

**Response `200`:**

```json
{
  "generados": 357,
  "actualizados": 0,
  "cargado_total": 4949130.54
}
```

| Campo | Descripción |
|---|---|
| `generados` | Cantidad de médicos para los que se calculó el descuento |
| `cargado_total` | Suma total calculada en esta corrida |

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago o descuento no encontrado | — |
| Respuesta con `generados: 0` | El descuento no tiene médicos asignados | "Sin médicos asignados a este descuento. Verificá las asignaciones." |

---

#### `POST /api/deducciones/{pago_id}/colegio/aplicar`

**Paso 2.** Aplica los saldos generados al disponible de cada médico (bruto + créditos − débitos). Sin body.

**Query params opcionales:**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `desc_id` | int | — | Aplicar solo ese descuento |
| `solo_generado_mes` | bool | `true` | `true` = solo los saldos generados en este pago. `false` = incluye saldos acumulados de períodos anteriores |

**Response `200`:**

```json
{
  "pago_id": 1,
  "medicos_afectados": 357,
  "aplicado_total": 4949130.54,
  "nota": "Aplicado respetando el disponible por médico. Remanente queda en saldos."
}
```

**Errores / casos especiales:**

| Caso | Respuesta | UI sugerida |
|---|---|---|
| No hay saldo para aplicar | `medicos_afectados: 0, aplicado_total: 0` | "No hay saldo pendiente para aplicar bajo los criterios actuales." |
| Médico sin disponible | Se omite silenciosamente | El saldo queda en `DeduccionSaldo` para el próximo período |

---

## 7. Vista Previa del Pago

### Pantallas: 1

Tab "Vista previa" del Detalle del Pago. Solo lectura en todo momento.

---

#### `GET /api/pagos/{pago_id}/pago_medico`

**Query params:**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `skip` | int | `0` | Offset para paginación |
| `limit` | int | `200` | Máx. items (tope `1000`) |

**Response `200`:**

```json
{
  "totales": {
    "total_medicos": 357,
    "total_bruto": "70701861.38",
    "total_debitos": "15000.00",
    "total_creditos": "5000.00",
    "total_reconocido": "70691861.38",
    "total_deducciones": "9898261.08",
    "total_neto_a_pagar": "60793600.30"
  },
  "items": [
    {
      "id": 1,
      "pago_id": 1,
      "medico_id": 1,
      "bruto": "46489.72",
      "debitos": "15000.00",
      "creditos": "5000.00",
      "reconocido": "36489.72",
      "deducciones": "6508.56",
      "neto_a_pagar": "29981.16",
      "estado": "liquidado"
    }
  ]
}
```

| Campo (item) | Descripción |
|---|---|
| `medico_id` | `listado_medico.ID` (PK interna) |
| `bruto` | Suma de prestaciones del médico en el pago |
| `debitos` | Suma de ajustes tipo `"d"` de lotes en estado `L` |
| `creditos` | Suma de ajustes tipo `"c"` de lotes en estado `L` |
| `reconocido` | `bruto + creditos - debitos` |
| `deducciones` | Suma de deducciones aplicadas |
| `neto_a_pagar` | `max(0, reconocido - deducciones)` |
| `estado` | `"pendiente"` · `"liquidado"` · `"pagado"` |

> Este endpoint se popula ejecutando `POST /generar_pago_medico`. Si está vacío, mostrar CTA: _"Generá la liquidación por médico para ver el resumen."_

---

#### `GET /api/pagos/{pago_id}/pago_medico/{medico_id}`

**Response `200`** — un solo objeto `PagoMedico` (misma estructura que cada item de la lista).

---

## 8. Recibos

### Pantallas: 2

Tab "Recibos" del Detalle del Pago.

---

### 8.1 Lista de Recibos del Pago

---

#### `POST /api/pagos/{pago_id}/generar_pago_medico`

**Paso previo a emitir.** Calcula y persiste los totales por médico. Es idempotente — actualiza si ya existen. Sin body.

**Response `200`:**

```json
{
  "pago_id": 1,
  "total_medicos": 357,
  "items": [
    {
      "medico_id": 1,
      "bruto": 46489.72,
      "debitos": 15000.0,
      "creditos": 5000.0,
      "reconocido": 36489.72,
      "deducciones": 6508.56,
      "neto_a_pagar": 29981.16
    }
  ]
}
```

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | — |

---

#### `POST /api/pagos/{pago_id}/emitir_recibos`

Genera o sobreescribe los recibos por médico. Upsert por `(pago_id, medico_id)`. Sin body.

**Response `200`:**

```json
{
  "pago_id": 1,
  "total_recibos": 357,
  "recibos": [
    {
      "medico_id": 1,
      "nro_recibo": "0001-1",
      "total_neto": 29981.16,
      "estado": "emitido"
    }
  ]
}
```

> `nro_recibo` se genera como `"{pago_id:04d}-{medico_id}"`. Ejemplo: pago 1, médico 42 → `"0001-42"`.

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Pago no encontrado | — |
| `409` | No hay `pago_medico` generado | "Primero ejecutá 'Generar liquidación por médico'." |

---

#### `GET /api/pagos/{pago_id}/recibos`

**Query params opcionales:**

| Param | Tipo | Descripción |
|---|---|---|
| `estado` | string | Filtrar: `"emitido"`, `"anulado"`, `"pagado"` |
| `skip` | int | Offset (default `0`) |
| `limit` | int | Máximo (default `200`, tope `1000`) |

**Response `200`:**

```json
[
  {
    "id": 1,
    "nro_recibo": "0001-1",
    "pago_id": 1,
    "medico_id": 1,
    "total_neto": "29981.16",
    "emision_timestamp": "2026-03-17T06:07:13",
    "estado": "emitido",
    "created_at": "2026-03-17T05:58:30",
    "created_by_user": null
  }
]
```

---

### 8.2 Detalle de Recibo

---

#### `GET /api/liquidacion/recibos/{recibo_id}`

Datos básicos del recibo (para la lista o el header).

**Response `200`:**

```json
{
  "id": 1,
  "nro_recibo": "0001-1",
  "pago_id": 1,
  "medico_id": 1,
  "total_neto": "29981.16",
  "emision_timestamp": "2026-03-17T06:07:13",
  "estado": "emitido"
}
```

---

#### `GET /api/liquidacion/recibos/{recibo_id}/detalle`

Desglose completo por factura, ajustes y deducciones.

**Response `200`:**

```json
{
  "medico": {
    "id": 1,
    "nro_socio": 2,
    "nombre": "BURGOS MARIA GRACIELA"
  },
  "recibo": {
    "id": 1,
    "nro_recibo": "0001-1",
    "emision_timestamp": "2026-03-17T06:07:13",
    "estado": "emitido"
  },
  "liquidaciones": [
    {
      "liquidacion_id": 3,
      "obra_social_id": 411,
      "obra_social_nombre": "ASOCIACION MUTUAL SANCOR",
      "mes_periodo": 8,
      "anio_periodo": 2025,
      "nro_factura": "00031-00004390",
      "bruto": 46489.72,
      "debitos": [
        {
          "ajuste_id": 1,
          "id_atencion": null,
          "codigo_prestacion": null,
          "fecha": null,
          "monto": 15000.0,
          "motivo": "Debito test"
        }
      ],
      "total_debitos": 15000.0,
      "creditos": [
        {
          "ajuste_id": 2,
          "id_atencion": null,
          "codigo_prestacion": null,
          "fecha": null,
          "monto": 5000.0,
          "motivo": null
        }
      ],
      "total_creditos": 5000.0,
      "reconocido": 36489.72
    }
  ],
  "deducciones": [
    {
      "concepto_tipo": "desc",
      "concepto_id": 1,
      "nombre": "Contribución s/honorarios",
      "aplicado": 6508.56
    }
  ],
  "total_bruto": 46489.72,
  "total_debitos": 15000.0,
  "total_creditos": 5000.0,
  "total_reconocido": 36489.72,
  "total_deducciones": 6508.56,
  "neto_a_pagar": 29981.16
}
```

| Campo (raíz) | Descripción |
|---|---|
| `medico` | Datos del médico receptor del recibo |
| `liquidaciones` | Una entrada por cada factura del pago donde el médico tiene prestaciones |
| `liquidaciones[].debitos` | Lista de ajustes débito con detalle (si `id_atencion` existe, se enrichece con código y fecha) |
| `liquidaciones[].reconocido` | `bruto + total_creditos - total_debitos` para esa factura |
| `deducciones` | Deducciones internas descontadas en este pago para el médico |
| `deducciones[].concepto_tipo` | `"desc"` = descuento del catálogo · `"esp"` = por especialidad |
| `neto_a_pagar` | Importe final. Siempre `>= 0` |

---

#### `PUT /api/liquidacion/recibos/{recibo_id}/anular`

**Request body** (campo opcional):

```json
{ "motivo": "Error en carga de datos" }
```

**Response `200`** — objeto Recibo con `estado: "anulado"`:

```json
{
  "id": 1,
  "nro_recibo": "0001-1",
  "pago_id": 1,
  "medico_id": 1,
  "total_neto": "29981.16",
  "emision_timestamp": "2026-03-17T06:07:13",
  "estado": "anulado"
}
```

**Errores:**

| Código | Causa | UI sugerida |
|---|---|---|
| `404` | Recibo no encontrado | — |
| `409` | Ya estaba anulado | "El recibo ya fue anulado." |
| `409` | Estado `pagado` | "No se puede anular un recibo ya pagado." |

---

## Apéndice

### Estructura de errores

```json
// Error simple
{ "detail": "Mensaje de error" }

// Error con metadata (ej: 409 al crear pago con uno ya abierto)
{
  "detail": {
    "reason": "pago_abierto_existe",
    "pago_id": 1,
    "message": "Ya existe un pago en estado abierto."
  }
}

// Error de validación de parámetros (422)
{
  "detail": [
    {
      "loc": ["body", "mes"],
      "msg": "ensure this value is less than or equal to 12",
      "type": "value_error.number.not_le"
    }
  ]
}
```

### Tabla de códigos HTTP

| Código | Significado |
|---|---|
| `200` | OK |
| `201` | Recurso creado |
| `204` | Eliminado (sin body) |
| `400` | Datos inválidos (validación de negocio) |
| `404` | Recurso no encontrado |
| `409` | Conflicto de estado (leer `detail` para la causa) |
| `422` | Error de validación de parámetros HTTP (Pydantic) |
| `500` | Error del servidor — reportar al backend |

### Campos monetarios

Todos los campos de dinero llegan como **string decimal**: `"70701861.38"`.
Parsear con `parseFloat()` o una librería decimal antes de operar o formatear.
Excepción: en algunos endpoints de resumen (ej: `generar_pago_medico`) llegan como `float` nativo.

### Fechas y timestamps

| Campo | Formato | Zona horaria |
|---|---|---|
| `cierre_timestamp` | `"2026-03-17T06:07:12"` | Local (sin tz) |
| `emision_timestamp` | `"2026-03-17T06:07:13"` | Local (sin tz) |
| `created_at` | `"2026-03-17T05:58:30"` | UTC |

### `medico_id` vs `NRO_SOCIO`

En ajustes (`Ajuste.medico_id`) el ID es **`listado_medico.ID`** (PK interna), **no** el `NRO_SOCIO` que usa el médico para hacer login.
Para buscar médicos y resolver el ID usar `GET /api/medicos/` con el filtro `search` o `nro_socio`.
En `DetalleLiquidacion.medico_id` y en `detalles_vista.socio` el valor es `NRO_SOCIO` (legacy del campo fuente en `guardar_atencion`).


# ACLARACIONES
- Para los tooltips utiliza libreria de Material UI (https://mui.com/material-ui/react-tooltip/)

## Endpoints nuevos agregados (2026-03-19)

### 1. Listar liquidaciones de un pago

```
GET /api/liquidacion/liquidaciones_por_os/?pago_id={id}
```

Necesario para el **Tab Facturas** dentro de un pago. Devuelve todas las liquidaciones asociadas al pago.

**Query params:**
| Param | Requerido | Descripción |
|-------|-----------|-------------|
| `pago_id` | ✅ | ID del pago |

**Response** `200 OK` — array de objetos:
```json
[
  {
    "id": 3,
    "pago_id": 1,
    "obra_social_id": 411,
    "mes_periodo": 8,
    "anio_periodo": 2025,
    "nro_factura": "0001-00012345",
    "total_bruto": "70000.00",
    "total_debitos": "500.00",
    "total_creditos": "200.00",
    "total_neto": "69700.00"
  }
]
```

> Si el pago no tiene liquidaciones devuelve `[]` (no 404). Usar para renderizar el tab vacío con botón "Agregar factura".

---

### 2. Listado enriquecido de lotes (débitos/créditos)

```
GET /api/lotes/snaps/lista
```

Necesario para la **sección de Débitos/Créditos**. Devuelve lotes con nombre de obra social y número de factura ya resueltos. Soporta filtros combinables.

**Query params (todos opcionales):**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | string | `normal` \| `refacturacion` |
| `mes` | int (1–12) | Mes del período |
| `anio` | int | Año del período |
| `obra_social_id` | int | ID de la obra social |
| `estado` | string | `A` (abierto) \| `C` (cerrado) \| `L` (en liquidaciones) |

**Response** `200 OK` — array de objetos:
```json
[
  {
    "id": 3,
    "tipo": "normal",
    "estado": "A",
    "mes_periodo": 8,
    "anio_periodo": 2025,
    "pago_id": null,
    "obra_social_id": 411,
    "obra_social_nombre": "OSDE",
    "nro_factura": "0001-00012345",
    "total_debitos": "500.00",
    "total_creditos": "200.00"
  }
]
```

**Notas para el frontend:**
- Para el tab **Normales**: `?tipo=normal`
- Para el tab **Refacturaciones**: `?tipo=refacturacion`
- `nro_factura` puede ser `null` si el período aún no tiene un período cerrado en la tabla `periodos`.
- `pago_id` es `null` cuando el lote aún no fue asignado a un pago (estado `A` o `C`).
- Los estados se muestran como: `A` → "Abierto", `C` → "Cerrado", `L` → "En liquidaciones".


# Nuevos Endpoints — Módulo Lotes (Débitos/Créditos)

> **Fecha:** 2026-03-19
> Documento para el equipo frontend. Cubre todos los endpoints nuevos o modificados en el módulo de lotes.

---

## Resumen de cambios

| Endpoint anterior | Reemplazado por |
|---|---|
| `POST /snaps/{lote_id}/cerrar` | `PATCH /snaps/{lote_id}/estado` |
| `POST /snaps/{lote_id}/reabrir` | `PATCH /snaps/{lote_id}/estado` |
| `POST /snaps/{lote_id}/en_liquidaciones` | `PATCH /snaps/{lote_id}/estado` |
| `DELETE /pagos/{pago_id}/snaps/{lote_id}` | `DELETE /snaps/{lote_id}` |
| _(nuevo)_ | `GET /snaps/lista` |
| _(nuevo)_ | `GET /liquidaciones_por_os/?pago_id=X` |

---

## 1. Listado enriquecido de lotes

```
GET /api/lotes/snaps/lista
```

Vista para la sección Débitos/Créditos. Devuelve lotes con nombre de obra social y número de factura ya resueltos.

### Query params (todos opcionales)

| Param | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | `string` | `normal` \| `refacturacion` |
| `mes` | `int` (1–12) | Mes del período |
| `anio` | `int` | Año del período (ej. `2025`) |
| `obra_social_id` | `int` | ID de la obra social |
| `estado` | `string` | `A` \| `C` \| `L` |

### Response `200 OK`

```json
[
  {
    "id": 3,
    "tipo": "normal",
    "estado": "A",
    "mes_periodo": 8,
    "anio_periodo": 2025,
    "pago_id": null,
    "obra_social_id": 411,
    "obra_social_nombre": "OSDE",
    "nro_factura": "0001-00012345",
    "total_debitos": "500.00",
    "total_creditos": "200.00"
  }
]
```

### Notas

- Para el tab **Normales**: `?tipo=normal`
- Para el tab **Refacturaciones**: `?tipo=refacturacion`
- `nro_factura` puede ser `null` si no existe un período cerrado para esa OS+mes+año.
- `pago_id` es `null` cuando el lote no fue asignado a ningún pago (estado `A` o `C`).
- Mapeo de estados para UI: `A` → "Abierto", `C` → "Cerrado", `L` → "En liquidaciones".

---

## 2. Cambiar estado de un lote (unificado)

```
PATCH /api/lotes/snaps/{lote_id}/estado
```

Reemplaza los 4 endpoints anteriores (cerrar, reabrir, en_liquidaciones, quitar del pago). Tras cualquier cambio que involucre un pago, recalcula automáticamente los totales de las liquidaciones afectadas.

### Path params

| Param | Tipo | Descripción |
|-------|------|-------------|
| `lote_id` | `int` | ID del lote |

### Request body

```json
{
  "estado": "C"
}
```

| Campo | Tipo | Valores | Requerido |
|-------|------|---------|-----------|
| `estado` | `string` | `A` \| `C` \| `L` | ✅ |

### Transiciones válidas

| De | A | Descripción |
|----|---|-------------|
| `A` | `C` | Cerrar lote (bloqueado para edición) |
| `C` | `A` | Reabrir lote (habilita edición de ajustes) |
| `C` | `L` | Asignar al pago abierto actual (recalcula totales) |
| `L` | `C` | Quitar del pago (limpia `pago_id`, recalcula totales) |

> Cualquier otra transición devuelve `409`.

### Response `200 OK`

```json
{
  "id": 3,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "tipo": "normal",
  "snap_origen_id": null,
  "estado": "L",
  "pago_id": 1,
  "total_debitos": "500.00",
  "total_creditos": "200.00",
  "ajustes": [
    {
      "id": 12,
      "lote_id": 3,
      "tipo": "d",
      "medico_id": 101,
      "obra_social_id": 411,
      "monto": "500.00",
      "observacion": "Prestación observada",
      "id_atencion": 99871,
      "origen": "manual"
    }
  ]
}
```

### Errores

| Código | Razón |
|--------|-------|
| `404` | Lote no encontrado |
| `409` | El lote ya está en ese estado |
| `409` | Transición no permitida (mensaje indica cuáles son válidas) |
| `409` | Transición `C → L`: no hay pago abierto |
| `409` | Transición `L → C`: el pago está cerrado |

---

## 3. Eliminar lote

```
DELETE /api/lotes/snaps/{lote_id}
```

Simplificado: ya **no requiere `pago_id`** en la URL.

### Path params

| Param | Tipo | Descripción |
|-------|------|-------------|
| `lote_id` | `int` | ID del lote |

### Response `204 No Content`

Sin body.

### Errores

| Código | Razón |
|--------|-------|
| `404` | Lote no encontrado |
| `409` | Lote en estado `L` (está asignado a un pago). Cambiar a `C` primero con el endpoint de estado. |

---

## 4. Listar liquidaciones de un pago

```
GET /api/liquidacion/liquidaciones_por_os/?pago_id={id}
```

Necesario para el **Tab Facturas** dentro de la vista de un pago.

### Query params

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `pago_id` | `int` | ✅ | ID del pago |

### Response `200 OK`

```json
[
  {
    "id": 3,
    "pago_id": 1,
    "obra_social_id": 411,
    "mes_periodo": 8,
    "anio_periodo": 2025,
    "nro_factura": "0001-00012345",
    "total_bruto": "70000.00",
    "total_debitos": "500.00",
    "total_creditos": "200.00",
    "total_neto": "69700.00"
  }
]
```

### Notas

- Si el pago no tiene liquidaciones devuelve `[]` (no `404`).
- Usar para renderizar el tab vacío con botón "Agregar factura".

---

## 5. Restricción de unicidad en creación de lotes

### Lote normal — `POST /api/lotes/snaps/obtener_o_crear`

Comportamiento sin cambios: **busca el lote existente y lo devuelve**. No crea duplicados. La unicidad está garantizada por la lógica de "obtener o crear".

### Lote refacturación — `POST /api/lotes/snaps/crear_refacturacion`

**Nuevo:** solo se permite **1 lote de refacturación por combinación** `obra_social_id + mes_periodo + anio_periodo`.

**Request body:**
```json
{
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "snap_origen_id": 3
}
```

**Error si ya existe:**
```json
HTTP 409
"Ya existe un lote de refacturación para esa OS y período"
```

---

## 6. Resumen completo de un pago

```
GET /api/pagos/{pago_id}/resumen
```

Vista de resumen del pago que agrupa toda la información financiera en un solo response: facturas con sus débitos/créditos, conceptos descontados, y totales finales.

### Path params

| Param | Tipo | Descripción |
|-------|------|-------------|
| `pago_id` | `int` | ID del pago |

### Response `200 OK`

```json
{
  "pago_id": 1,
  "mes": 3,
  "anio": 2026,
  "descripcion": "Pago Marzo 2026",
  "estado": "A",

  "facturas": [
    {
      "liquidacion_id": 3,
      "obra_social_id": 411,
      "obra_social_nombre": "OSDE",
      "nro_factura": "0001-00012345",
      "mes_periodo": 8,
      "anio_periodo": 2025,
      "total_bruto": "70000.00",
      "total_debitos": "500.00",
      "total_creditos": "200.00",
      "total_neto": "69700.00"
    },
    {
      "liquidacion_id": 4,
      "obra_social_id": 502,
      "obra_social_nombre": "Swiss Medical",
      "nro_factura": "0001-00012346",
      "mes_periodo": 8,
      "anio_periodo": 2025,
      "total_bruto": "30000.00",
      "total_debitos": "0.00",
      "total_creditos": "0.00",
      "total_neto": "30000.00"
    }
  ],

  "conceptos_descuento": [
    {
      "concepto_tipo": "desc",
      "concepto_id": 1,
      "nombre": "Colegio Médico",
      "total_aplicado": "1500.00"
    },
    {
      "concepto_tipo": "esp",
      "concepto_id": 7,
      "nombre": "Cirugía General",
      "total_aplicado": "800.00"
    }
  ],

  "totales": {
    "total_bruto": "100000.00",
    "total_debitos": "500.00",
    "total_creditos": "200.00",
    "total_reconocido": "99700.00",
    "total_deducciones": "2300.00",
    "total_neto": "97400.00"
  }
}
```

### Descripción de campos

**`facturas[]`**
| Campo | Descripción |
|-------|-------------|
| `total_bruto` | Suma de importes de prestaciones (sin ajustes) |
| `total_debitos` | Suma de débitos de lotes en estado `L` para esa OS+período |
| `total_creditos` | Suma de créditos de lotes en estado `L` para esa OS+período |
| `total_neto` | `bruto - debitos + creditos` |

**`conceptos_descuento[]`**
| Campo | Descripción |
|-------|-------------|
| `concepto_tipo` | `"desc"` (descuento del catálogo) \| `"esp"` (por especialidad) |
| `concepto_id` | ID del concepto en su tabla correspondiente |
| `nombre` | Nombre resuelto del concepto |
| `total_aplicado` | Suma total descontada a todos los médicos por ese concepto |

**`totales`**
| Campo | Fórmula |
|-------|---------|
| `total_reconocido` | `bruto - debitos + creditos` |
| `total_neto` | `reconocido - deducciones` |

### Errores

| Código | Razón |
|--------|-------|
| `404` | Pago no encontrado |

---

## Flujo sugerido para la UI de Débitos/Créditos

```
1. Cargar listado:  GET /api/lotes/snaps/lista?tipo=normal
2. Ver detalle:     GET /api/lotes/snaps/{lote_id}
3. Agregar ajuste:  POST /api/lotes/snaps/{lote_id}/items
4. Cerrar lote:     PATCH /api/lotes/snaps/{lote_id}/estado  { "estado": "C" }
5. Pasar al pago:   PATCH /api/lotes/snaps/{lote_id}/estado  { "estado": "L" }
   → recalcula automáticamente los totales del pago
6. Quitar del pago: PATCH /api/lotes/snaps/{lote_id}/estado  { "estado": "C" }
   → recalcula automáticamente los totales del pago
```
