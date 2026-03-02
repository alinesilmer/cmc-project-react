# Cambios en el Módulo de Liquidaciones

## Resumen del flujo completo

```
Crear período → Seleccionar factura OS → Aplicar débitos/créditos → Liquidación por médico → Emitir recibos
     /panel/liquidation         /:id              /:id/insurance/...         /:id/medicos        /:id/recibos
```

---

## A — Bug Fixes

### A1. `InsuranceDetail.tsx` — URL incorrecta de débitos
**Archivo:** `src/app/pages/InsuranceDetail/InsuranceDetail.tsx`

- **Línea 32-33 (original):** `DC_BY_DETALLE` apuntaba a `/api/debitos_creditos/by_detalle/` (incorrecto)
- **Corrección:** cambiada a `/api/debitos/by_detalle/`
- **Nuevas constantes:**
  - `DC_DELETE = (dcId) => /api/debitos/dc/${dcId}` — eliminar DC por ID
  - `DC_EDIT = (dcId) => /api/debitos/dc/${dcId}` — editar DC por ID
- **`coerceRow` actualizado:** ahora lee `debitos_creditos_list` (API v2) para mapear el primer DC
  - `tipo`: tipo del primer DC o "N" si lista vacía
  - `monto`: monto del primer DC o 0
  - `obs`: obs del primer DC o null
  - nuevo campo `debitos_creditos_list` con el array completo
- **`upsertDC` actualizado:** acepta `dcId` opcional; si existe, hace PUT a `/api/debitos/dc/{dcId}`, sino POST a `/api/debitos/by_detalle/{detalleId}`
- **`deleteDC` actualizado:** acepta `dcId` opcional; si existe, borra por dc_id en lugar de detalle_id
- **Importa `putJSON`** además de los helpers existentes

### A2. `InsuranceDetailTable.tsx` — Modelo 1:N de DCs
**Archivo:** `src/app/components/molecules/InsuranceDetailTable/InsuranceDetailTable.tsx`

- **Tipo `InsuranceRow`** ampliado con campo opcional:
  ```ts
  debitos_creditos_list?: Array<{ dc_id: number; tipo: "D"|"C"; monto: number; obs: string|null }>
  ```
- **Badge de tipo** en la columna de DCs ahora muestra cantidad:
  - "N" si sin DCs
  - "1 D/C" si un DC
  - "N D/C" si múltiples DCs

### A3. `InsuranceTable.tsx` — Raw fetch → http helpers
**Archivo:** `src/app/components/molecules/InsuranceTable/InsuranceTable.tsx`

- **Eliminado** el uso directo de `fetch()` en `cerrar`, `reabrirSimple`, `refacturar`
- **Eliminada** constante `API_BASE` (ya no necesaria)
- **Importa** `postJSON`, `http` desde `../../lib/http`
- `cerrar` → usa `postJSON(LIQ_CERRAR(id))`
- `reabrirSimple` → usa `http.post(LIQ_REABRIR(id)).then(r => r.data)`
- `refacturar` → usa `postJSON(LIQ_REFACTURAR(id), { punto_venta: "0001", nro_factura: base })`
  - **Fix de payload:** antes enviaba `{ nro_liquidacion: base }`, ahora envía `{ punto_venta, nro_factura }`
- Las URLs ahora son relativas (sin `API_BASE`), pasan por el interceptor de auth

### A4. `DiscountsList.tsx` — Reemplazar mock con API real
**Archivo:** `src/app/pages/DiscountsList/DiscountsList.tsx`

- **Eliminados** los 4 descuentos hardcodeados
- **Importa** `getJSON`, `postJSON` desde `../../lib/http`
- **`useEffect`** carga descuentos desde `GET /api/descuentos`
  - Mapea: `id` (String), `concept` (concepto/nombre), `price` (precio_fijo), `percentage` (porcentaje)
- **`onConfirmGenerate`** ahora llama realmente a `POST /api/deducciones/{resumenId}/colegio/bulk_generar_descuento/{descId}`
- **`goTab` corregido:** agrega prefijo `/panel/`
  - `obras` → `/panel/liquidation/${id}`
  - `debitos` → `/panel/liquidation/${id}/debitos`
- **Loading/error states** visibles en la tabla

### A5. `LiquidationCycle.tsx` — Navegación hacia pasos siguientes
**Archivo:** `src/app/pages/LiquidationCycle/LiquidationCycle.tsx`

- **Botones agregados** en el header:
  - "Liq. Médico →" → navega a `/panel/liquidation/:id/medicos`
  - "Recibos →" → navega a `/panel/liquidation/:id/recibos`

---

## B — Páginas Nuevas

### B1. `LiquidacionMedico` — Paso 4 del flujo
**Archivos creados:**
- `src/app/pages/LiquidacionMedico/LiquidacionMedico.tsx`
- `src/app/pages/LiquidacionMedico/LiquidacionMedico.module.scss`

**Endpoints:**
- `GET /api/liquidacion/resumen/{id}` — nombre del período
- `GET /api/liquidacion/resumen/{id}/liquidacion_medico` — tabla de médicos
- `POST /api/liquidacion/resumen/{id}/generar_liquidacion_medico` — generar (modal de confirmación)

**Funcionalidad:**
- Header con período y botones: Generar, Exportar Excel, Ver Recibos →
- Tabla: Médico ID | Bruto | Débitos OS | Créditos OS | Reconocido | Deducciones | Neto a Pagar | Estado
- Totales al pie
- Modal de confirmación antes de generar, muestra `total_medicos` generados
- Exportar a Excel con ExcelJS

### B2. `RecibosPage` — Paso 5 del flujo
**Archivos creados:**
- `src/app/pages/Recibos/Recibos.tsx`
- `src/app/pages/Recibos/Recibos.module.scss`

**Endpoints:**
- `GET /api/liquidacion/resumen/{id}` — período
- `GET /api/liquidacion/resumen/{id}/recibos` — tabla de recibos
- `POST /api/liquidacion/resumen/{id}/emitir_recibos` — emitir
- `PUT /api/liquidacion/recibos/{id}/anular` — anular con motivo

**Funcionalidad:**
- Header con período, total emitido y botones: Emitir Recibos, ← Liq. Médico
- Tabla: Nro. Recibo | Médico | Neto | Fecha Emisión | Estado | Acciones
- Badges: `emitido`=verde, `anulado`=rojo, `pagado`=azul
- Anular recibo: modal con campo `motivo` obligatorio (solo si `estado = "emitido"`)
- PDF por recibo: jsPDF con datos del médico, período, nro recibo, totales

### B3. Navegación en `LiquidationCycle`
Incluido en A5 arriba.

### B4. Routes — Rutas nuevas
**Archivo:** `src/routes.tsx`

```tsx
import LiquidacionMedicoPage from "./app/pages/LiquidacionMedico/LiquidacionMedico";
import RecibosPage from "./app/pages/Recibos/Recibos";

<Route path="liquidation/:id/medicos" element={<LiquidacionMedicoPage />} />
<Route path="liquidation/:id/recibos" element={<RecibosPage />} />
```

---

## Verificación

1. `npx tsc --noEmit` — sin errores ✅
2. Flujo en browser:
   - `/panel/liquidation` → crear resumen
   - `/panel/liquidation/:id` → agregar OS + período
   - `/panel/liquidation/:id/insurance/:osId/:period/:liqId` → DCs (llama `/api/debitos/...`)
   - `/panel/liquidation/:id/debitos` → descuentos reales de la API
   - `/panel/liquidation/:id/medicos` → generar y ver liquidación médica
   - `/panel/liquidation/:id/recibos` → emitir y ver recibos
3. Network tab: todas las requests llevan `Authorization: Bearer` (via interceptor de http)
