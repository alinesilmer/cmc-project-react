
# DOCUMENTACIÓN FRONTEND — Módulo Deducciones

> Base URL: `/api`
> Todos los campos monetarios son `string` decimal con 2 decimales: `"500.00"`.
> Todos los endpoints requieren `Authorization: Bearer <token>`.

---

## Objeto `DeduccionHistorialItem` (respuesta base de la lista)

Este objeto representa **cualquier deducción** — manual (con cuotas) o automática (generada por bulk_generar). El campo `origen` indica la fuente; `estado` siempre refleja la situación actual.

```json
{
  "id": 14,
  "origen": "manual",
  "medico_id": 101,
  "medico_nombre": "García Juan",
  "descuento_id": 3,
  "descuento_nombre": "Colegio Médico",
  "monto": "500.00",
  "mes_periodo": 3,
  "anio_periodo": 2026,
  "estado": "en_pago",
  "pago_id": 7,
  "cuota_nro": 1,
  "cuotas_total": 3,
  "grupo_id": 14,
  "created_at": "2026-03-24T10:15:00Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `int` | ID del registro en `deducciones` |
| `origen` | `string` | `"manual"` (cuotas) \| `"automatico"` (generado por bulk_generar) |
| `medico_id` | `int` | ID interno del médico |
| `medico_nombre` | `string` | Nombre completo |
| `descuento_id` | `int\|null` | ID del concepto |
| `descuento_nombre` | `string` | Nombre del concepto |
| `monto` | `decimal` | Monto de esta deducción (`calculado_total`) |
| `mes_periodo` | `int\|null` | Mes al que pertenece (1-12) |
| `anio_periodo` | `int\|null` | Año al que pertenece |
| `estado` | `string` | Ver tabla de estados abajo |
| `pago_id` | `int\|null` | Pago al que está asignado (`null` si `pendiente`) |
| `cuota_nro` | `int` | `0` para automáticas; `1..N` para manuales cuotificadas |
| `cuotas_total` | `int\|null` | Total de cuotas del grupo (solo manuales) |
| `grupo_id` | `int\|null` | Agrupa cuotas del mismo cargo (solo manuales) |
| `created_at` | `datetime` | Fecha de creación |

### Estados posibles

Ambos orígenes comparten la misma máquina de estados:

| `estado` | `origen` típico | Significado | Acciones disponibles |
|----------|-----------------|-------------|---------------------|
| `pendiente` | manual | Programada, sin pago asignado | Agregar al pago, Cancelar, Editar monto |
| `vencida` | manual | `pendiente` pero el mes ya pasó | Agregar al pago, Cancelar, Editar monto |
| `en_pago` | manual / automatico | Asignada al pago abierto — **esperando cierre** | Quitar del pago, Cancelar, Editar monto |
| `aplicado` | ambos | Aplicado al cerrar el pago | — (solo lectura) |
| `cancelado` | ambos | Cancelada definitivamente | — (solo lectura) |

> `vencida` es derivado: solo `origen='manual'`, `estado='pendiente'`, período ya pasado. No existe en DB.

> **Flujo clave:** todas las deducciones (manual y automática) pasan por `en_pago` mientras el pago está abierto. La transición a `aplicado` ocurre **al cerrar el pago** (`POST /pagos/{pago_id}/cerrar`), que aplica un algoritmo greedy (mayor primero). Si el disponible del médico no alcanza para todas, las que no entran vuelven a `pendiente`.

> **Todas las acciones de edición** requieren pago abierto (`estado="A"`). Si está cerrado → `409`.

---

## Endpoints

---

### 1. Lista unificada (principal)

```
GET /deducciones/historial
```

**Query params (todos opcionales):**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | `int` (≥1) | Página. Default: `1` |
| `size` | `int` (1–50) | Ítems por página. Default: `50` |
| `medico_id` | `int` | Filtrar por médico |
| `estado` | `string` | `pendiente` \| `en_pago` \| `aplicado` \| `cancelado` \| `vencida` |
| `origen` | `string` | `manual` \| `automatico` \| _(vacío = ambos)_ |

**Response `200 OK`:**
```json
{
  "total": 87,
  "page": 1,
  "size": 50,
  "items": [ { ...DeduccionHistorialItem }, ... ]
}
```

---

### 2. Top deudores

```
GET /deducciones/top-deudores?limit=10
```

| Param | Tipo | Descripción |
|-------|------|-------------|
| `limit` | `int` (1–50) | Cantidad de resultados. Default: `10` |

**Response `200 OK`:**
```json
[
  {
    "medico_id": 101,
    "medico_nombre": "García Juan",
    "nro_socio": 1234,
    "saldo_total": "4500.00"
  }
]
```

> Solo aparecen médicos con saldo pendiente > 0. Ordenado de mayor a menor.

---

### 3. Cambiar estado

```
PATCH /deducciones/historial/{id}/estado
```

Aplica a **cualquier deducción** (manual o automática) que no esté en estado terminal (`aplicado` o `cancelado`).

**Request body:**
```json
{ "estado": "en_pago" }
```

**Transiciones válidas:**

| De | A | Efecto |
|----|---|--------|
| `pendiente` / `vencida` | `en_pago` | Asigna al pago abierto |
| `en_pago` | `pendiente` | Quita del pago |
| `pendiente` / `en_pago` | `cancelado` | Cancela (no borrado físico) |

**Response `200 OK`** — `DeduccionHistorialItem` actualizado.

**Errores:**

| Código | Causa |
|--------|-------|
| `404` | ID no encontrado |
| `409` | Pago cerrado |
| `409` | Transición no permitida |
| `409` | No hay pago abierto (al pasar a `en_pago`) |
| `409` | Estado terminal (`aplicado` o `cancelado`) — no modificable |

---

### 4. Editar monto

```
PATCH /deducciones/historial/{id}/monto
```

Funciona sobre cualquier deducción mientras el pago esté abierto.

**Request body:**
```json
{ "monto": 750.00 }
```

- Para `origen='manual'`: actualiza `monto_cuota` y `calculado_total`.
- Para `origen='automatico'`: actualiza `calculado_total`.

**Response `200 OK`** — `DeduccionHistorialItem` actualizado.

**Errores:**

| Código | Causa |
|--------|-------|
| `404` | ID no encontrado |
| `409` | Pago cerrado |
| `409` | Estado no editable (`aplicado` o `cancelado`) |
| `422` | `monto <= 0` |

---

### 5. Eliminar / cancelar

```
DELETE /deducciones/historial/{id}
```

- `origen='manual'` → marca como `cancelado` (queda en historial, no se borra).
- `origen='automatico'` → borrado físico del registro.

**Response `200 OK`:**
```json
{
  "id": 14,
  "origen": "manual",
  "estado": "cancelado"
}
```

**Errores:**

| Código | Causa |
|--------|-------|
| `404` | ID no encontrado |
| `409` | Pago cerrado |
| `409` | Estado `aplicado` — no se puede eliminar |

---

### 6. Crear deducción manual

```
POST /deducciones/programas
```

**Request body:**
```json
{
  "medico_id": 101,
  "descuento_id": 3,
  "monto_total": 1500.00,
  "cuotas": 3,
  "mes_inicio": 3,
  "anio_inicio": 2026,
  "pagador_medico_id": null
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `medico_id` | `int` | ✅ | ID interno del médico |
| `descuento_id` | `int` | ✅ | ID del concepto |
| `monto_total` | `number` | ✅ | Monto total (se divide entre cuotas) |
| `cuotas` | `int` | ✅ | Cantidad de cuotas. `1` = cargo único |
| `mes_inicio` | `int` (1-12) | ✅ | Mes de la primera cuota |
| `anio_inicio` | `int` | ✅ | Año de la primera cuota |
| `pagador_medico_id` | `int\|null` | ❌ | Otro médico que absorbe el cargo. `null` = el propio médico |

**Response `201 Created`** — array con todas las cuotas creadas:

```json
[
  {
    "id": 14,
    "medico_id": 101,
    "descuento_id": 3,
    "descuento_nombre": "Colegio Médico",
    "origen": "manual",
    "estado": "en_pago",
    "monto_total": "1500.00",
    "monto_cuota": "500.00",
    "calculado_total": "500.00",
    "cuotas_total": 3,
    "cuota_nro": 1,
    "cuotificado": true,
    "grupo_id": 14,
    "mes_aplicar": 3,
    "anio_aplicar": 2026,
    "pagador_medico_id": null,
    "pago_id": 7,
    "created_at": "2026-03-24T10:00:00Z"
  },
  { "id": 15, "cuota_nro": 2, "mes_aplicar": 4, "estado": "pendiente", "pago_id": null, "..." : "..." },
  { "id": 16, "cuota_nro": 3, "mes_aplicar": 5, "estado": "pendiente", "pago_id": null, "..." : "..." }
]
```

> Si `mes_inicio/anio_inicio` coincide con el pago abierto → cuota 1 ya aparece con `"estado": "en_pago"`. La cuota pasa a `aplicado` recién al cerrar el pago.

**Errores:**

| Código | Causa |
|--------|-------|
| `404` | `medico_id` o `descuento_id` inválido |
| `422` | `cuotas < 1`, `mes_inicio` fuera de 1-12, `monto_total <= 0` |

---

### 7. Cargar saldo de cuotas adelantadas

```
POST /deducciones/{pago_id}/programas/generar
```

Procesa deducciones manuales `en_pago` del pago → acumula en `DeduccionSaldo`. Las filas quedan en `en_pago` (la transición a `aplicado` es al cerrar el pago).

> **Cuándo usarlo:** solo cuando el operador adelantó una cuota manualmente (`PATCH /historial/{id}/estado → en_pago`). Las cuotas del mes del pago ya se cargan automáticamente al crear el pago.

**Response `200 OK`:**
```json
{
  "pago_id": 7,
  "procesadas": 2,
  "total_cargado": "1000.00",
  "detalle": [
    {
      "deduccion_id": 14,
      "medico_id": 101,
      "pagador_medico_id": 101,
      "descuento_id": 3,
      "descuento_nombre": "Colegio Médico",
      "monto_cuota": "500.00"
    }
  ]
}
```

---

### 8. Actualizar pagador delegado

```
PATCH /deducciones/socios/{socio_descuento_id}/pagador
```

```json
{ "pagador_medico_id": 55 }   // null = quitar delegación
```

**Response `200 OK`:**
```json
{
  "id": 12,
  "medico_id": 101,
  "descuento_id": 3,
  "pagador_medico_id": 55,
  "fecha_alta": "2025-01-01",
  "fecha_baja": null
}
```

---

## UI a desarrollar

### Crear ítem "Deducciones" en sidebar

```
Deducciones  ▼
  ├── Lista          → /deducciones
  └── Nueva deducción → /deducciones/nueva
```

---

### Vista "Lista" — Deducciones

**Layout:** header + dos paneles horizontales (70% lista / 5% gap / 25% panel lateral).

#### Header
- Título "Deducciones"
- Botón primario **"+ Nueva deducción"** → navega a /deducciones/nueva

#### Panel izquierdo (70%) — Lista principal

**Barra de filtros (fila superior):**

| Control | Tipo | Bind a param |
|---------|------|--------------|
| Buscar médico | Search-select (NRO_SOCIO o nombre) | `medico_id` |
| Estado | Select (Todos / Pendiente / Vencida / En pago / Aplicado / Cancelado) | `estado` |
| Concepto | Search-select (nombre del descuento) | _(filtrar en frontend o agregar `descuento_id` param)_ |
| Origen | Select (Todos / Manual / Automático) | `origen` → `manual\|automatico` |
| Botón **PDF** | — | Exportar lista actual |
| Botón **EXCEL** | — | Exportar lista actual |

Endpoint: `GET /api/deducciones/historial` con los params seleccionados.

**Tabla de resultados:**

| Columna | Campo | Notas |
|---------|-------|-------|
| Médico | `medico_nombre` | |
| Concepto | `descuento_nombre` | |
| Monto | `monto` | Alineado derecha |
| Período | `mes_periodo/anio_periodo` | "03/2026" |
| Cuota | `cuota_nro / cuotas_total` | Solo si `origen='manual'` y `cuotificado`. Ej: "2/3". Vacío para automáticas |
| Estado | `estado` | Badge con color (ver abajo) |
| Acciones | — | Íconos / menú contextual |

**Badges de estado:**

| Estado | Color |
|--------|-------|
| `pendiente` | Gris |
| `vencida` | Rojo |
| `en_pago` | Azul |
| `aplicado` | Verde |
| `cancelado` | Rojo oscuro / tachado |

**Acciones por fila** (visibles solo si el pago está abierto):

| Acción | Cuándo mostrar | Endpoint |
|--------|----------------|----------|
| **Agregar al pago** | `estado = pendiente \| vencida` (cualquier `origen`) | `PATCH /historial/{id}/estado` → `{"estado":"en_pago"}` |
| **Quitar del pago** | `estado = en_pago` (cualquier `origen`) | `PATCH /historial/{id}/estado` → `{"estado":"pendiente"}` |
| **Eliminar** | `origen = automatico` Y `estado ≠ aplicado` | `DELETE /historial/{id}` (borrado físico) |
| **Editar monto** | `estado ≠ aplicado, cancelado` | `PATCH /historial/{id}/monto` → `{"monto": N}` |
| **Cancelar** | `origen = manual` Y `estado ≠ aplicado` | `DELETE /historial/{id}` (marca cancelado) |

> **No se envía `?tipo=`**. El backend determina el comportamiento por el `origen` almacenado en el registro.

> **"Quitar del pago" en automáticas:** mueve la deducción a `pendiente` con `pago_id=null`. Si el operador intenta volver a correr `bulk_generar` para el mismo descuento+período → `409` porque el registro ya existe. Para regenerar hay que eliminar primero el registro.

> Si hay un grupo de cuotas (`grupo_id` no null y `origen='manual'`), al hacer click en la fila expandir las demás cuotas del grupo inline (`GET /programas/grupo/{grupo_id}`).

**Paginación:**
- Posición `fixed` al fondo de la pantalla.
- Muestra: `← Anterior | Página X de Y | Siguiente →`
- Tamaño de página: 50 (máximo del endpoint).

---

#### Panel derecho (25%) — Top deudores

Título: **"Mayores deudas"**

Endpoint: `GET /api/deducciones/top-deudores?limit=10`

```
1. García Juan (#1234)     $4.500,00
2. López María (#5678)     $2.200,00
...
```

- Al hacer click → aplica `medico_id` como filtro en la lista principal.
- Si la lista está vacía → "Sin deudas pendientes".

---

### Página "Nueva deducción"

Formulario para crear una deducción manual.

**Campos:**

| Campo | Control | Validación |
|-------|---------|------------|
| Médico | Search-select (busca por NRO_SOCIO o nombre) | Requerido |
| Concepto de descuento | Search-select (lista de `Descuentos`) | Requerido |
| Monto total | Input numérico | > 0 |
| Cantidad de cuotas | Input numérico (mín. 1) | ≥ 1 |
| Mes inicio | Select (1–12) | Requerido |
| Año inicio | Input / Select | Requerido |
| Pagador (opcional) | Search-select médico | Null = el propio médico |

**Preview de cuotas** (antes de confirmar):
- Mostrar tabla con las N cuotas que se van a crear, con su mes/año y monto.
- Si el mes inicio coincide con el pago abierto → indicar "⚡ La cuota 1 se asignará automáticamente al pago actual y se aplicará al cerrar el pago".

**Al confirmar:** `POST /deducciones/programas` → redirigir a lista con las cuotas del grupo expandidas.

---

### Flujo "Procesar pago" — paso de deducciones

```
Al crear el pago:
  POST /api/pagos/ { mes, anio }
  → Auto: asigna cuotas manuales del mes → en_pago (DeduccionSaldo cargado)
  → El operador no necesita hacer nada para las manuales del período
  → Las cuotas quedan en en_pago hasta que se cierre el pago

Para automáticas (una por descuento configurado):
  POST /deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}
  → Calcula, carga DeduccionSaldo
  → Rows quedan en en_pago hasta cerrar el pago

Si el operador adelantó una cuota de otro período:
  PATCH /historial/{id}/estado → en_pago
  POST /deducciones/{pago_id}/programas/generar
  → Carga DeduccionSaldo de la cuota adelantada, queda en en_pago

Al cerrar el pago:
  POST /pagos/{pago_id}/cerrar
  → Ejecuta aplicación greedy por médico (mayor deducción primero)
  → Si disponible alcanza → estado='aplicado', escribe DeduccionAplicacion
  → Si no alcanza → estado='pendiente' (pago_id=null, queda para el próximo período)
  → Pago queda cerrado

Saldos residuales de períodos anteriores (edge case / opcional):
  POST /deducciones/{pago_id}/colegio/aplicar
  → Aplica DeduccionSaldo remanente → DeduccionAplicacion
```
