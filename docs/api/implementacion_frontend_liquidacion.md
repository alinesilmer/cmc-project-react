# Plan de Implementación — Módulo de Liquidación (Frontend)

> Documento de análisis y planificación para el recodeo completo del módulo de liquidación.
> Fecha: 2026-03-18

---

## Índice

1. [Diagnóstico: qué existe y qué falla](#1-diagnóstico)
2. [Nueva arquitectura de rutas](#2-nueva-arquitectura-de-rutas)
3. [Páginas a construir/recodear](#3-páginas-a-construirrecodear)
4. [Endpoints por módulo](#4-endpoints-por-módulo)
5. [Preservación de estética](#5-preservación-de-estética)
6. [Orden de implementación sugerido](#6-orden-de-implementación)

---

## 1. Diagnóstico

### 1.1 Mapa de lo que existe

| Ruta actual | Componente | Estado |
|---|---|---|
| `/panel/liquidation` | `LiquidationPeriods` | ❌ Usa `/api/liquidacion/resumen` — API obsoleta |
| `/panel/liquidation/:id` | `LiquidationCycle` | ❌ Usa `/api/liquidacion/resumen/:id` — API obsoleta. Tiene algo de lógica reutilizable |
| `/panel/liquidation/:id/debitos` | `DiscountsList` | ⚠️ Endpoints correctos, pero falta el paso "aplicar" y la integración real con `pago_id` |
| `/panel/liquidation/:id/insurance/:osId/:period/:liquidacionId` | `InsuranceDetail` | ⚠️ `detalles_vista` es correcto, pero CRUD de DC usa `/api/debitos/` (no existe más, debe usar lotes) |
| `/panel/liquidation/:id/medicos` | `LiquidacionMedico` | ❌ Endpoints de resumen obsoletos. Funcionalidad trasladar a tab "Vista Previa" |
| `/panel/liquidation/:id/recibos` | `Recibos` | ❌ Endpoints de resumen obsoletos. Funcionalidad trasladar a tab "Recibos" |

### 1.2 Problemas críticos

- **Concepto equivocado de entidad raíz**: Todo el frontend trabaja con `resumen` (`/api/liquidacion/resumen/`). La API nueva usa `pago` (`/api/pagos/`). Esto invalida prácticamente todos los endpoints existentes.
- **Módulos inexistentes**: Lotes de Ajuste, Detalle de Lote, Refacturaciones y Vista Previa no tienen ninguna pantalla implementada.
- **CRUD de ajustes (DC) roto**: `InsuranceDetail` llama a `/api/debitos/dc/{id}` y `/api/debitos/by_detalle/{id}` que no corresponden a la nueva API. Los ajustes ahora viven en lotes (`/api/lotes/snaps/{lote_id}/items/`).
- **Flujo de recibos incompleto**: Falta el paso previo obligatorio `generar_pago_medico` antes de emitir.
- **Deducciones sin el paso aplicar**: `DiscountsList` genera pero nunca llama a `POST /api/deducciones/{pago_id}/colegio/aplicar`.

### 1.3 Qué se puede reutilizar

| Componente | Reusar | Cómo |
|---|---|---|
| `InsuranceDetail.tsx` | Sí, parcial | Mantener tabla `detalles_vista`, eliminar DC CRUD viejo. DC ahora es read-only (viene del lote) |
| `Recibos.tsx` | Sí, estructura | Actualizar endpoints y agregar paso `generar_pago_medico` |
| `LiquidacionMedico.tsx` | Sí, como tab | Reusar lógica de tabla y paginación como tab "Vista Previa" dentro del detalle |
| `DiscountsList.tsx` | Sí, parcial | Agregar botón "Aplicar" y corregir el `pago_id` que viene del contexto del pago |
| SCSS patterns | Sí, completo | Copiar patrones de tabla, modal, badge, paginación |

---

## 2. Nueva arquitectura de rutas

### Rutas propuestas

```
/panel/liquidation                          → PagosList           (reemplaza LiquidationPeriods)
/panel/liquidation/:pagoId                  → PagoDetalle         (reemplaza LiquidationCycle)
  [tabs internos en PagoDetalle]:
    ?tab=facturas                           → sub-view: lista de liquidaciones del pago
    ?tab=lotes                              → sub-view: lista de lotes de ajuste
    ?tab=refacturaciones                    → sub-view: lista de refacturaciones
    ?tab=deducciones                        → sub-view: generación y aplicación de deducciones
    ?tab=preview                            → sub-view: vista previa por médico (ex-LiquidacionMedico)
    ?tab=recibos                            → sub-view: recibos (ex-Recibos)

/panel/liquidation/:pagoId/facturas/:liquidacionId    → FacturaDetalle   (actualiza InsuranceDetail)
/panel/liquidation/:pagoId/lotes/:loteId              → LoteDetalle      (NUEVO)
```

> **Decisión de diseño**: Las sub-vistas de tabs (facturas, lotes, deducciones, preview, recibos) viven como componentes hijos dentro de `PagoDetalle` usando un sistema de tabs, **no** como rutas separadas. Esto evita pérdida de contexto (el objeto `pago` ya está cargado) y reduce re-fetching. El navegador conserva el tab activo via query param `?tab=`.
>
> Excepción: `FacturaDetalle` y `LoteDetalle` son rutas separadas porque tienen suficiente contenido propio.

### Cambio de rutas en `routes.tsx`

```tsx
// Eliminar:
<Route path="liquidation/:id/debitos" element={<DiscountsPage />} />
<Route path="liquidation/:id/medicos" element={<LiquidacionMedicoPage />} />
<Route path="liquidation/:id/recibos" element={<RecibosPage />} />
<Route path="liquidation/:id/insurance/:osId/:period/:liquidacionId" element={<InsuranceDetail />} />

// Mantener (con nuevos componentes):
<Route path="liquidation" element={<PagosList />} />
<Route path="liquidation/:pagoId" element={<PagoDetalle />} />

// Agregar:
<Route path="liquidation/:pagoId/facturas/:liquidacionId" element={<FacturaDetalle />} />
<Route path="liquidation/:pagoId/lotes/:loteId" element={<LoteDetalle />} />
```

---

## 3. Páginas a construir/recodear

---

### 3.1 `PagosList` — Lista de Pagos
**Archivo**: `src/app/pages/Pagos/PagosList/PagosList.tsx`
**Reemplaza**: `LiquidationPeriods.tsx` (recodeo completo)
**Estado actual**: ❌ API completamente distinta

**Qué hace**:
- Lista todos los pagos con columnas: Año · Mes · Descripción · Estado (badge) · Fecha cierre · Bruto · Neto
- Filtros: `anio`, `mes`, `estado`
- Botón "Nuevo pago" — deshabilitado si hay uno con `estado: "A"`
- Al hacer click en un pago, navega a `/panel/liquidation/:pagoId`
- Al crear: si 409, mostrar alerta con link al pago abierto existente

**Cambios respecto al actual**:
- `LiquidationPeriods` usa `PeriodsTable` + concepto de "período" (resumen). Reescribir con tabla nativa similar a `LiquidacionMedico`.
- Agregar columnas de totales (bruto, neto, débitos, créditos, deducciones).
- Agregar badge de estado (`A` = Abierto, `C` = Cerrado).
- Modal de creación: año + mes + descripción (campo opcional).
- Manejo especial del 409 con link al pago existente.

---

### 3.2 `PagoDetalle` — Detalle del Pago (con tabs)
**Archivo**: `src/app/pages/Pagos/PagoDetalle/PagoDetalle.tsx`
**Reemplaza**: `LiquidationCycle.tsx` (recodeo completo)
**Estado actual**: ❌ API distinta, sin tabs, sin cerrar/reabrir

**Qué hace**:
- Header con: breadcrumb · título "Pago Marzo 2026" · totales en chips · botón contextual
- Botón contextual:
  - `estado = "A"` → "Cerrar pago" (POST `/api/pagos/{id}/cerrar`)
  - `estado = "C"` sin recibos emitidos → "Reabrir pago" (POST `/api/pagos/{id}/reabrir`)
  - `estado = "C"` con recibos → deshabilitado con Tooltip MUI ("Anulá los recibos primero")
- Sistema de tabs (6 tabs): Facturas · Lotes · Refacturaciones · Deducciones · Vista Previa · Recibos
- Cada tab carga su componente hijo de forma lazy (solo cuando se activa)
- Edición de descripción inline (PUT `/api/pagos/{id}`) — solo si estado `A`

**Sub-componentes (tabs)**:
- `<TabFacturas pagoId={...} pago={...} />`
- `<TabLotes pagoId={...} pago={...} />`
- `<TabRefacturaciones pagoId={...} pago={...} />`
- `<TabDeducciones pagoId={...} pago={...} />`
- `<TabVistaPreviaPago pagoId={...} pago={...} />`
- `<TabRecibos pagoId={...} pago={...} />`

---

### 3.3 `TabFacturas` — Lista de Facturas del Pago
**Archivo**: `src/app/pages/Pagos/PagoDetalle/tabs/TabFacturas.tsx`
**Es nuevo** (lógica similar a parte de `LiquidationCycle`)

**Qué hace**:
- Tabla de liquidaciones del pago: OS · Período · Nro Factura · Bruto · Débitos · Créditos · Neto · Acciones
- Botón "Ver detalle" → navega a `/panel/liquidation/:pagoId/facturas/:liquidacionId`
- Botón "Eliminar" (solo si pago abierto) → DELETE con confirm modal
- Botón "Agregar factura" (solo si pago abierto) → abre modal de selector OS + período
  - Paso 1: `GET /api/obras_social/` para cargar las OS disponibles
  - Paso 2: `GET /api/periodos/disponibles?obra_social_id={id}` tras seleccionar OS
  - POST al confirmar

**Nota**: No hay un endpoint `GET /api/liquidacion/liquidaciones_por_os/?pago_id={id}` documentado en el md. Verificar con backend si existe, o si se debe derivar del `pago_medico`. **Endpoint a confirmar**.

---

### 3.4 `FacturaDetalle` — Vista de Factura
**Archivo**: `src/app/pages/Pagos/FacturaDetalle/FacturaDetalle.tsx`
**Reemplaza**: `InsuranceDetail.tsx` (refactor importante)
**Estado actual**: ⚠️ `detalles_vista` correcto, DC CRUD roto

**Qué hace**:
- Header: info de la factura (OS, período, nro factura, totales)
- Tabla de prestaciones (`detalles_vista`) con columnas: Socio · Nombre · Matrícula · Fecha · Código · Afiliado · Honorarios · Importe · Ajustes DC · Total
- Columna "Ajustes DC": muestra inline los ajustes de `debitos_creditos_list` (read-only, agrupados por médico)
- Los ajustes se gestionan desde el módulo Lotes, **no** desde esta pantalla

**Cambios respecto al actual**:
- Eliminar completamente el CRUD de DC (`/api/debitos/dc/`, `/api/debitos/by_detalle/`)
- La columna de DC es read-only: muestra `debitos_creditos_list` del response
- Agregar filtro por médico (search input → query param `medico_id` o `search`)
- Mantener exportación Excel
- Actualizar ruta de regreso al nuevo `PagoDetalle`

---

### 3.5 `TabLotes` — Lista de Lotes del Pago
**Archivo**: `src/app/pages/Pagos/PagoDetalle/tabs/TabLotes.tsx`
**Es completamente nuevo**

**Qué hace**:
- Para cada factura del pago (cada liquidación), permite ver/crear el lote de ajuste normal
- Lista lotes con: OS · Período · Tipo · Estado (badge: A/C/L) · Total Débitos · Total Créditos · Pago asignado · Acciones
- Botón "Ver/Crear lote" → llama a `POST /api/lotes/snaps/obtener_o_crear` y navega a `LoteDetalle`
- Badge de estado: A=Abierto (amarillo), C=Cerrado (gris), L=En liquidaciones (azul)
- Si el pago está cerrado: todos los botones de edición deshabilitados

---

### 3.6 `LoteDetalle` — Detalle de Lote (Ajustes DC)
**Archivo**: `src/app/pages/Pagos/LoteDetalle/LoteDetalle.tsx`
**Es completamente nuevo**

**Qué hace**:
- Header: OS · Período · Tipo (badge normal/refacturación) · Estado (badge) · Totales (débitos/créditos)
- Si `snap_origen_id` existe: chip "Corrige al lote #X"
- Tabla de ajustes: Tipo · Médico · Monto · Observación · Origen · Atención · Acciones
- Acciones por fila (solo si `estado = "A"`): Editar · Eliminar
- Botón "Agregar ajuste" (solo si `estado = "A"`): modal con médico selector + tipo + monto + observación + id_atencion opcional
- Botón de estado contextual:
  - `A` → "Cerrar lote" (POST cerrar)
  - `C` → "Reabrir" (POST reabrir) + "Pasar a liquidaciones" (POST en_liquidaciones)
  - `L` → "Quitar del pago" (DELETE /api/lotes/pagos/{pago_id}/snaps/{lote_id}) — solo si pago abierto
- Selector de médico: búsqueda via `GET /api/medicos/?search=...` → muestra nombre + matrícula. El valor enviado es `listado_medico.ID` (PK interna, **no** `NRO_SOCIO`)

**Tabla de acciones habilitadas por estado** (mostrar como info visual):

| Acción | A | C | L |
|---|:---:|:---:|:---:|
| Agregar/Editar/Eliminar ajuste | ✅ | ❌ | ❌ |
| Cerrar | ✅ | ❌ | ❌ |
| Reabrir | ❌ | ✅ | ❌ |
| Pasar a liquidaciones | ❌ | ✅ | ❌ |
| Quitar del pago | ❌ | ❌ | ✅ |

---

### 3.7 `TabRefacturaciones` — Refacturaciones del Pago
**Archivo**: `src/app/pages/Pagos/PagoDetalle/tabs/TabRefacturaciones.tsx`
**Es completamente nuevo**

**Qué hace**:
- Lista los lotes de tipo `"refacturacion"` de las facturas del pago
- Para cargar: `GET /api/lotes/snaps/por_os_periodo` por cada OS+período y filtrar `tipo = "refacturacion"`
- Botón "Nueva refacturación": modal con selector de lote origen (`snap_origen_id`) → POST crear_refacturacion
- Al hacer click en una refacturación: navega a `LoteDetalle` (mismo componente que lotes normales)
- Badge "Refacturación" distintivo en el título del `LoteDetalle`

---

### 3.8 `TabDeducciones` — Deducciones
**Archivo**: `src/app/pages/Pagos/PagoDetalle/tabs/TabDeducciones.tsx`
**Reemplaza**: `DiscountsList.tsx` como tab (no ruta separada)
**Estado actual**: ⚠️ Falta paso "aplicar"

**Qué hace**:
- Lista el catálogo de descuentos: Nombre · % · Precio fijo
- Por cada descuento: botón "Generar" (paso 1) + resultados (generados, total)
- Botón global "Aplicar deducciones" (paso 2) con opciones:
  - Checkbox: "Solo saldo del mes actual" (`solo_generado_mes`)
  - Select opcional: aplicar un solo descuento o todos
- Muestra resumen post-aplicación: médicos afectados, total aplicado

**Cambios respecto al actual**:
- Eliminar el modal de edición de precio/porcentaje (eso es configuración de otro módulo)
- Agregar botón "Aplicar" con su propio modal de confirmación
- Pasar `pagoId` desde el contexto del tab (no depender de `useParams` con id de resumen)

---

### 3.9 `TabVistaPreviaPago` — Vista Previa por Médico
**Archivo**: `src/app/pages/Pagos/PagoDetalle/tabs/TabVistaPreviaPago.tsx`
**Reemplaza**: `LiquidacionMedico.tsx` como tab
**Estado actual**: ❌ Endpoints obsoletos

**Qué hace**:
- Botón "Generar liquidación por médico" (POST `generar_pago_medico`) con confirm modal
- Tabla: Médico ID · Bruto · Débitos · Créditos · Reconocido · Deducciones · Neto a Pagar · Estado
- Totales en tfoot
- Paginación (50 por página)
- Exportar Excel
- CTA inicial si la tabla está vacía: "Generá la liquidación por médico para ver el resumen."

**Cambios respecto al actual**:
- Actualizar todos los endpoints (ver sección 4.9)
- Integrar como tab (recibe `pagoId` por prop, no por `useParams`)
- Mantener toda la lógica de paginación y exportación Excel

---

### 3.10 `TabRecibos` — Recibos
**Archivo**: `src/app/pages/Pagos/PagoDetalle/tabs/TabRecibos.tsx`
**Reemplaza**: `Recibos.tsx` como tab
**Estado actual**: ❌ Endpoints obsoletos

**Qué hace**:
- Flujo en 2 pasos antes de poder emitir:
  1. `POST generar_pago_medico` (puede estar ya hecho desde tab Vista Previa)
  2. `POST emitir_recibos`
- Tabla de recibos: Nro · Médico · Neto · Fecha Emisión · Estado · Acciones
- Filas expandibles con detalle completo (liquidaciones + deducciones + resumen)
- Acciones: PDF · Anular (solo estado `emitido`)
- Filtro por estado
- Generación PDF (reusar lógica de `Recibos.tsx`)

**Cambios respecto al actual**:
- Actualizar todos los endpoints (ver sección 4.10)
- Integrar como tab (recibe `pagoId` por prop)
- Agregar aviso si no hay `pago_medico` generado

---

## 4. Endpoints por módulo

> Convención: todos los campos monetarios llegan como `string` decimal. Parsear con `parseFloat()`.

---

### 4.1 Lista de Pagos

#### `GET /api/pagos/`
```
Query params: anio?, mes?, estado? ("A"|"C"), skip=0, limit=100
```
```json
// Response 200 — array
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

#### `POST /api/pagos/`
```json
// Request
{ "anio": 2026, "mes": 3, "descripcion": "Opcional" }

// Response 201 — objeto Pago
{ "id": 2, "anio": 2026, "mes": 3, "descripcion": "...", "estado": "A", "cierre_timestamp": null, ... }

// Error 409
{
  "detail": {
    "reason": "pago_abierto_existe",
    "pago_id": 1,
    "message": "Ya existe un pago en estado abierto."
  }
}
```

---

### 4.2 Detalle del Pago

#### `GET /api/pagos/{pago_id}`
```json
// Response 200 — mismo shape que el array de lista
{ "id": 1, "anio": 2026, "mes": 3, "descripcion": "...", "estado": "C", ... }
```

#### `PUT /api/pagos/{pago_id}`
```json
// Request (solo descripcion)
{ "descripcion": "Nueva descripción" }
// Response 200 — objeto Pago actualizado
```

#### `DELETE /api/pagos/{pago_id}`
```
Response 204 — sin body
Errores 409: tiene liquidaciones | tiene recibos emitidos
```

#### `POST /api/pagos/{pago_id}/cerrar`
```
Sin body
Response 200 — objeto Pago con estado "C" y cierre_timestamp seteado
```

#### `POST /api/pagos/{pago_id}/reabrir`
```
Sin body
Response 200 — objeto Pago con estado "A" y cierre_timestamp null
Error 409: tiene recibos emitidos | hay otro pago abierto (detail.pago_id disponible)
```

---

### 4.3 Facturas del Pago (Tab Facturas)

#### `GET /api/obras_social/`
```json
// Response 200 — array de obras sociales (para el selector)
[{ "NRO_OBRASOCIAL": 411, "NOMBRE": "ASOCIACION MUTUAL SANCOR", ... }]
```

#### `GET /api/periodos/disponibles?obra_social_id={id}`
```
Response 200 — array de períodos cerrados no incluidos en ningún pago
(estructura a confirmar con backend)
```

#### `POST /api/liquidacion/liquidaciones_por_os/crear`
```json
// Request
{
  "pago_id": 1,
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025
}
// Response 201
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

#### `DELETE /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`
```
Response 204
Error 409: pago cerrado | lote en estado L para esa factura
```

> ⚠️ **Endpoint faltante**: No hay `GET /api/liquidacion/liquidaciones_por_os/?pago_id={id}` documentado. **Confirmar con backend** si existe este listado o si se debe derivar de otra fuente.

---

### 4.4 Vista de Factura (FacturaDetalle)

#### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}`
```json
// Response 200 — totales de la factura
{
  "id": 3, "pago_id": 1, "obra_social_id": 411,
  "mes_periodo": 8, "anio_periodo": 2025,
  "nro_factura": "00031-00004390",
  "total_bruto": "70701861.38",
  "total_debitos": "15000.00",
  "total_creditos": "5000.00",
  "total_neto": "70691861.38"
}
```

#### `GET /api/liquidacion/liquidaciones_por_os/{liquidacion_id}/detalles_vista`
```
Query params: medico_id?, search?
Response 200 — array de filas de prestaciones
```
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
    "honorarios": 44651.25,
    "gastos": 32602.5,
    "coseguro": 0.0,
    "importe": 44651.25,
    "pagado": 0.0,
    "debitos_creditos_list": [
      { "ajuste_id": 1, "tipo": "D", "monto": 15000.0, "obs": "Debito test" }
    ],
    "total": 29651.25
  }
]
```

---

### 4.5 Lotes de Ajuste

#### `GET /api/lotes/snaps/por_os_periodo`
```
Query params requeridos: obra_social_id, mes_periodo, anio_periodo
Response 200 — array de lotes (normal + refacturaciones)
```
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
    "ajustes": [...]
  }
]
```

#### `POST /api/lotes/snaps/obtener_o_crear`
```json
// Request — idempotente
{ "obra_social_id": 411, "mes_periodo": 8, "anio_periodo": 2025 }
// Response 200 — objeto LoteAjuste (crea si no existe, devuelve el existente si ya hay)
```

---

### 4.6 Detalle de Lote (Ajustes DC)

#### `GET /api/lotes/snaps/{lote_id}`
```json
// Response 200 — lote con ajustes embebidos
{
  "id": 3, "obra_social_id": 411, "mes_periodo": 8, "anio_periodo": 2025,
  "tipo": "normal", "snap_origen_id": null, "estado": "L", "pago_id": 1,
  "total_debitos": "15000.00", "total_creditos": "5000.00",
  "ajustes": [
    {
      "id": 1, "lote_id": 3, "tipo": "d", "medico_id": 1,
      "obra_social_id": 411, "monto": "15000.00",
      "observacion": "Debito test", "id_atencion": null, "origen": "manual"
    }
  ]
}
```

#### `POST /api/lotes/snaps/{lote_id}/items`
```json
// Request — solo disponible si estado = "A"
{
  "tipo": "d",         // "d" = débito | "c" = crédito
  "medico_id": 42,     // listado_medico.ID (PK interna, NO NRO_SOCIO)
  "monto": 15000.00,   // > 0
  "observacion": "Falta de autorización",  // opcional
  "id_atencion": 43406  // opcional, trazabilidad a prestación
}
// Response 201 — objeto Ajuste
```

#### `PUT /api/lotes/snaps/{lote_id}/items/{ajuste_id}`
```json
// Request — todos opcionales, solo estado "A"
{ "tipo": "c", "monto": 12000.00, "observacion": "Motivo actualizado" }
// Response 200 — objeto Ajuste actualizado
```

#### `DELETE /api/lotes/snaps/{lote_id}/items/{ajuste_id}`
```
Response 204 — solo estado "A"
```

#### `POST /api/lotes/snaps/{lote_id}/cerrar`
```
Sin body — solo estado "A"
Response 200 — objeto LoteAjuste con estado "C"
```

#### `POST /api/lotes/snaps/{lote_id}/reabrir`
```
Sin body — solo estado "C"
Response 200 — objeto LoteAjuste con estado "A"
Error 409: está en estado "L" (quitar del pago primero)
```

#### `POST /api/lotes/snaps/{lote_id}/en_liquidaciones`
```
Sin body — solo estado "C"
Asigna al pago abierto actualmente
Response 200 — objeto LoteAjuste con estado "L" y pago_id seteado
Error 409: no hay pago abierto | ya tiene pago asignado | lote no está en "C"
```

#### `DELETE /api/lotes/pagos/{pago_id}/snaps/{lote_id}`
```
Desvincula el lote del pago → devuelve a estado "C"
Response 200 — objeto LoteAjuste con estado "C" y pago_id null
Error 409: pago cerrado
```

---

### 4.7 Refacturaciones

#### `POST /api/lotes/snaps/crear_refacturacion`
```json
// Request — siempre crea uno nuevo (no idempotente)
{
  "obra_social_id": 411,
  "mes_periodo": 8,
  "anio_periodo": 2025,
  "snap_origen_id": 3   // null si es la primera refacturación
}
// Response 201 — objeto LoteAjuste con tipo "refacturacion"
{
  "id": 4, "tipo": "refacturacion", "snap_origen_id": 3, "estado": "A",
  "pago_id": null, "total_debitos": "0.00", "total_creditos": "0.00", "ajustes": []
}
// Error 409: ya existe refacturación para ese snap_origen_id
```

> Los endpoints de gestión de ajustes y estados son **idénticos** a los del módulo 4.6 (LoteDetalle). Mismo componente, diferente badge visual.

---

### 4.8 Deducciones (Tab)

#### `GET /api/descuentos`
```json
// Response 200
[
  { "id": 1, "nombre": "Contribución s/honorarios", "nro_colegio": 100, "precio": 0.0, "porcentaje": 7.0 },
  { "id": 2, "nombre": "Contribucion s/gastos", "nro_colegio": 101, "precio": 0.0, "porcentaje": 3.0 }
]
```

#### `POST /api/deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}`
```
Sin body
Response 200
```
```json
{ "generados": 357, "actualizados": 0, "cargado_total": 4949130.54 }
```

#### `POST /api/deducciones/{pago_id}/colegio/aplicar`
```
Sin body
Query params opcionales: desc_id?, solo_generado_mes=true
Response 200
```
```json
{
  "pago_id": 1,
  "medicos_afectados": 357,
  "aplicado_total": 4949130.54,
  "nota": "Aplicado respetando el disponible por médico. Remanente queda en saldos."
}
```

---

### 4.9 Vista Previa por Médico (Tab)

#### `POST /api/pagos/{pago_id}/generar_pago_medico`
```
Sin body — idempotente, actualiza si ya existen
Response 200
```
```json
{
  "pago_id": 1,
  "total_medicos": 357,
  "items": [
    {
      "medico_id": 1, "bruto": 46489.72, "debitos": 15000.0,
      "creditos": 5000.0, "reconocido": 36489.72,
      "deducciones": 6508.56, "neto_a_pagar": 29981.16
    }
  ]
}
```

#### `GET /api/pagos/{pago_id}/pago_medico`
```
Query params: skip=0, limit=200
Response 200
```
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
      "id": 1, "pago_id": 1, "medico_id": 1,
      "bruto": "46489.72", "debitos": "15000.00", "creditos": "5000.00",
      "reconocido": "36489.72", "deducciones": "6508.56",
      "neto_a_pagar": "29981.16", "estado": "liquidado"
    }
  ]
}
```

---

### 4.10 Recibos (Tab)

#### `POST /api/pagos/{pago_id}/generar_pago_medico`
*(mismo que 4.9 — paso previo obligatorio)*

#### `POST /api/pagos/{pago_id}/emitir_recibos`
```
Sin body — upsert por (pago_id, medico_id)
Response 200
```
```json
{
  "pago_id": 1,
  "total_recibos": 357,
  "recibos": [
    { "medico_id": 1, "nro_recibo": "0001-1", "total_neto": 29981.16, "estado": "emitido" }
  ]
}
// Error 409: no hay pago_medico generado → "Primero ejecutá 'Generar liquidación por médico'."
```

#### `GET /api/pagos/{pago_id}/recibos`
```
Query params: estado?, skip=0, limit=200
Response 200 — array de recibos
```
```json
[
  {
    "id": 1, "nro_recibo": "0001-1", "pago_id": 1, "medico_id": 1,
    "total_neto": "29981.16", "emision_timestamp": "2026-03-17T06:07:13",
    "estado": "emitido", "created_at": "2026-03-17T05:58:30", "created_by_user": null
  }
]
```

#### `GET /api/liquidacion/recibos/{recibo_id}/detalle`
```json
// Response 200 — desglose completo
{
  "medico": { "id": 1, "nro_socio": 2, "nombre": "BURGOS MARIA GRACIELA" },
  "recibo": { "id": 1, "nro_recibo": "0001-1", "emision_timestamp": "...", "estado": "emitido" },
  "liquidaciones": [
    {
      "liquidacion_id": 3, "obra_social_id": 411, "obra_social_nombre": "...",
      "mes_periodo": 8, "anio_periodo": 2025, "nro_factura": "00031-00004390",
      "bruto": 46489.72,
      "debitos": [{ "ajuste_id": 1, "id_atencion": null, "codigo_prestacion": null, "fecha": null, "monto": 15000.0, "motivo": "Debito test" }],
      "total_debitos": 15000.0,
      "creditos": [...],
      "total_creditos": 5000.0,
      "reconocido": 36489.72
    }
  ],
  "deducciones": [{ "concepto_tipo": "desc", "concepto_id": 1, "nombre": "Contribución s/honorarios", "aplicado": 6508.56 }],
  "total_bruto": 46489.72, "total_debitos": 15000.0, "total_creditos": 5000.0,
  "total_reconocido": 36489.72, "total_deducciones": 6508.56, "neto_a_pagar": 29981.16
}
```

#### `PUT /api/liquidacion/recibos/{recibo_id}/anular`
```json
// Request
{ "motivo": "Error en carga de datos" }
// Response 200 — objeto Recibo con estado "anulado"
// Error 409: ya anulado | estado "pagado"
```

---

## 5. Preservación de estética

El sistema tiene un design system consistente definido en `src/app/styles/variables.scss`. Todas las páginas nuevas y refactorizadas deben seguir exactamente los mismos patrones.

### 5.1 Paleta de colores (usar variables SCSS)

| Variable | Valor | Uso |
|---|---|---|
| `$primary-blue` | `#3f64d0` | Botones primarios, bordes de cards activos |
| `$primary-blue-dark` | `#2c47a1` | Hover de elementos primarios |
| `$success-green` | `#21b356` | Botones success, badge "pagado" |
| `$danger-red` | `#ef4444` | Botones danger, badge "anulado", valores negativos |
| `$warning-orange` | `#f59e0b` | Badge "pendiente", alertas |
| `$gray-900` | `#0f172a` | Títulos principales |
| `$gray-500` | `#64748b` | Texto secundario, breadcrumb |

> **Nota**: En los módulos de liquidación más nuevos (LiquidacionMedico, Recibos) el gradiente de tabla usa `#1b56ff → #0a3fd4`. Este es un azul más intenso que `$primary-blue`. Mantener esta decisión en todos los módulos nuevos de liquidación para consistencia interna del módulo.

### 5.2 Estructura de página

Todas las páginas siguen este esqueleto exacto:

```tsx
<div className={styles.page}>
  <div className={styles.content}>
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <BackButton />
          <div className={styles.breadcrumb}>SECCIÓN EN MAYÚSCULAS</div>
          <h1 className={styles.title}>Título de la página</h1>
        </div>
        <div className={styles.headerActions}>
          {/* botones de acción */}
        </div>
      </div>

      {/* contenido principal */}
      <Card className={styles.tableCard}>
        ...
      </Card>
    </motion.div>
  </div>
</div>
```

SCSS mínimo por página nueva (copiar de `LiquidacionMedico.module.scss`):
```scss
@use "@/app/styles/all.scss" as *;

.page { min-height: 100vh; }
.content { padding: $spacing-6; max-width: 100%; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: $spacing-4; gap: $spacing-4; }
.headerLeft { display: flex; flex-direction: column; gap: $spacing-1; }
.headerActions { display: flex; gap: $spacing-3; align-items: center; flex-wrap: wrap; }
.breadcrumb { font-size: $font-size-xs; color: $gray-500; letter-spacing: 0.08em; text-transform: uppercase; }
.title { font-size: $font-size-2xl; font-weight: 700; color: $gray-900; margin: 0; }
```

### 5.3 Tablas

Copiar exactamente el patrón de `LiquidacionMedico.module.scss`:

```scss
.tableCard { padding: 0; overflow: hidden; border-radius: $border-radius-lg; box-shadow: 0 10px 30px rgba(0,0,0,0.08); background: #fff; }
.tableWrap { overflow-x: auto; }
.table {
  width: 100%; border-collapse: collapse;
  th { background: linear-gradient(135deg, #1b56ff 0%, #0a3fd4 100%); color: #fff; padding: 12px 16px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
  td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #f0f2f5; }
  tbody tr:hover { background: #f7f9ff; }
}
.numCell { text-align: right; }
.totalsRow { background: #f0f2f5; td { border-top: 2px solid #d1d5db; border-bottom: none; } }
```

### 5.4 Badges de estado

Definir un conjunto unificado de badges para usar en todas las páginas del módulo:

```scss
.badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; text-transform: uppercase; }

// Pagos
.estadoPago_A { background: #fef3c7; color: #92400e; }   // Abierto — amarillo
.estadoPago_C { background: #e5e7eb; color: #374151; }   // Cerrado — gris

// Lotes
.estadoLote_A { background: #fef3c7; color: #92400e; }   // Abierto — amarillo
.estadoLote_C { background: #e5e7eb; color: #374151; }   // Cerrado — gris
.estadoLote_L { background: #dbeafe; color: #1d4ed8; }   // En liquidaciones — azul

// Recibos
.estadoRecibo_emitido  { background: #dbeafe; color: #1d4ed8; }  // azul
.estadoRecibo_anulado  { background: #fee2e2; color: #b91c1c; }  // rojo
.estadoRecibo_pagado   { background: #d1fae5; color: #065f46; }  // verde

// PagoMedico
.estadoMedico_pendiente  { background: #fef3c7; color: #92400e; }
.estadoMedico_liquidado  { background: #d1fae5; color: #065f46; }
.estadoMedico_pagado     { background: #dbeafe; color: #1d4ed8; }

// Tipo lote
.tipoBadge_normal        { background: #e5e7eb; color: #374151; }
.tipoBadge_refacturacion { background: #ede9fe; color: #6d28d9; }   // violeta
```

### 5.5 Modales

Patrón exacto de `LiquidacionMedico.module.scss` / `Recibos.module.scss`:

```scss
.modalBackdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.35); display: grid; place-items: center; z-index: 10000; }
.modalCard { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.15); width: min(480px, calc(100vw - 32px)); padding: 20px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; h3 { margin: 0; font-size: 16px; } }
.modalClose { border: 0; background: transparent; font-size: 18px; cursor: pointer; opacity: .6; }
.modalBody { font-size: 14px; color: $gray-700; margin-bottom: 16px; line-height: 1.5; }
.modalActions { display: flex; justify-content: flex-end; gap: 8px; }
```

### 5.6 Tabs (nuevo componente)

Los tabs del `PagoDetalle` deben seguir un estilo coherente. Usar el patrón de `DiscountsList.module.scss` como base y ampliar:

```scss
.tabs { display: flex; gap: 4px; border-bottom: 2px solid #e5e7eb; margin-bottom: $spacing-4; }
.tab {
  padding: 10px 18px; font-size: 13px; font-weight: 500; border: none; background: transparent;
  color: $gray-600; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
  &:hover { color: #1b56ff; }
}
.tabActive { color: #1b56ff; border-bottom-color: #1b56ff; font-weight: 600; }
.tabDisabled { opacity: 0.4; cursor: not-allowed; }
```

### 5.7 Tooltips

Usar exclusivamente `Tooltip` de MUI (ya disponible en el proyecto) para tooltips de botones deshabilitados o con información contextual:

```tsx
import Tooltip from "@mui/material/Tooltip";

<Tooltip title="Anulá los recibos antes de reabrir el pago" placement="top">
  <span>
    <Button variant="primary" disabled>Reabrir pago</Button>
  </span>
</Tooltip>
```

> Envolver en `<span>` cuando el botón está `disabled`, ya que los elementos deshabilitados no disparan eventos de mouse.

### 5.8 Paginación

Copiar el patrón completo de paginación de `LiquidacionMedico.module.scss` (`.pagination`, `.paginationInfo`, `.paginationControls`, `.pageBtn`, `.pageBtnActive`). No crear variantes nuevas.

### 5.9 Valores monetarios

```ts
const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });
const fmt = (n: number | string | null | undefined) => currency.format(Number(n ?? 0));

// Uso: `$${fmt(valor)}`
// Negativo: `-$${fmt(valor)}`
// Positivo: `+$${fmt(valor)}`
```

---

## 6. Orden de implementación

El orden respeta dependencias entre módulos:

| Paso | Módulo | Archivo | Prioridad |
|---|---|---|---|
| 1 | `PagosList` | `src/app/pages/Pagos/PagosList/PagosList.tsx` | Alta — punto de entrada |
| 2 | `PagoDetalle` (shell + tabs vacíos) | `src/app/pages/Pagos/PagoDetalle/PagoDetalle.tsx` | Alta |
| 3 | `TabFacturas` | `...PagoDetalle/tabs/TabFacturas.tsx` | Alta |
| 4 | `FacturaDetalle` (actualizar InsuranceDetail) | `src/app/pages/Pagos/FacturaDetalle/FacturaDetalle.tsx` | Alta |
| 5 | `LoteDetalle` | `src/app/pages/Pagos/LoteDetalle/LoteDetalle.tsx` | Alta |
| 6 | `TabLotes` | `...PagoDetalle/tabs/TabLotes.tsx` | Alta |
| 7 | `TabRefacturaciones` | `...PagoDetalle/tabs/TabRefacturaciones.tsx` | Media |
| 8 | `TabDeducciones` (actualizar DiscountsList) | `...PagoDetalle/tabs/TabDeducciones.tsx` | Media |
| 9 | `TabVistaPreviaPago` (actualizar LiquidacionMedico) | `...PagoDetalle/tabs/TabVistaPreviaPago.tsx` | Media |
| 10 | `TabRecibos` (actualizar Recibos) | `...PagoDetalle/tabs/TabRecibos.tsx` | Media |
| 11 | Actualizar `routes.tsx` + limpiar rutas viejas | `src/routes.tsx` | Al final |

### Estructura de carpetas propuesta

```
src/app/pages/Pagos/
├── PagosList/
│   ├── PagosList.tsx
│   └── PagosList.module.scss
├── PagoDetalle/
│   ├── PagoDetalle.tsx
│   ├── PagoDetalle.module.scss
│   └── tabs/
│       ├── TabFacturas.tsx
│       ├── TabLotes.tsx
│       ├── TabRefacturaciones.tsx
│       ├── TabDeducciones.tsx
│       ├── TabVistaPreviaPago.tsx
│       └── TabRecibos.tsx
├── FacturaDetalle/
│   ├── FacturaDetalle.tsx
│   └── FacturaDetalle.module.scss
└── LoteDetalle/
    ├── LoteDetalle.tsx
    └── LoteDetalle.module.scss
```

---

## Apéndice: Notas importantes

### `medico_id` vs `NRO_SOCIO`

- En `Ajuste.medico_id` el ID es **`listado_medico.ID`** (PK interna), **no** el `NRO_SOCIO`.
- Para buscar médicos en el formulario de ajuste: `GET /api/medicos/?search=...`
- En `detalles_vista.socio` el valor es `NRO_SOCIO` (legacy).

### Manejo de errores 409

Todos los errores 409 deben leer `error.response.data.detail`. Puede ser un string simple o un objeto con `reason` + metadata (ej: `pago_id`, `estado_actual`). El componente debe discriminar y mostrar mensajes específicos con links cuando corresponda.

### Campos monetarios

Todos los campos monetarios llegan como **string decimal** en los endpoints GET. Excepción: algunos endpoints de resumen (ej: `generar_pago_medico`) devuelven `float` nativo. Usar `parseFloat()` consistentemente antes de operar o formatear.

### Endpoint a confirmar con backend

- `GET /api/liquidacion/liquidaciones_por_os/?pago_id={id}` — necesario para el Tab Facturas. Si no existe, el backend deberá crearlo o el frontend debe derivarlo de otra fuente.


# Aclaraciones
Ahi se agrego ese endpoint que mencionas que no aparece y que esta asi:
Response — array de LiquidacionRead:                                                                                   
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
                                                                                                                       
  Si el pago_id no tiene liquidaciones, devuelve [] (no 404). El frontend puede usar eso para mostrar el tab vacío con el
   botón "Agregar factura".