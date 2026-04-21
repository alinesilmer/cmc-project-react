# Plan — Deducciones: Tabla Única Unificada

> Estado: **IMPLEMENTADO v4**
> Fecha: 2026-03-24

---

## Decisión de arquitectura: tabla única `deducciones`

La tabla `deducciones` es la única fuente de verdad para **todas** las deducciones, tanto manuales (con cuotas) como automáticas (generadas por `bulk_generar_descuento`). La tabla `deduccion_programa` fue eliminada.

La distinción entre orígenes se maneja con la columna `origen`:

| `origen` | Creado por | `pago_id` al crear | `cuota_nro` |
|----------|------------|-------------------|-------------|
| `automatico` | `bulk_generar_descuento` | Siempre seteado | `0` |
| `manual` | `POST /programas` | Null si `pendiente` | `1..N` |

Las tablas `deduccion_saldo` y `deduccion_aplicacion` no cambian — siguen siendo la capa financiera de acumulación y aplicación.

---

## 1. Tablas involucradas

| Tabla | Rol |
|-------|-----|
| `descuentos` | Catálogo de conceptos |
| `socio_descuento` | Asigna un descuento a un médico (+ `pagador_medico_id`) |
| `deducciones` | **Tabla única**: manuales y automáticas. `origen` distingue el tipo |
| `deduccion_saldo` | Saldo acumulado por médico+concepto (sin cambios) |
| `deduccion_aplicacion` | Lo efectivamente descontado al cerrar el pago |

---

## 2. Estructura de `deducciones` (post-migración)

```sql
ALTER TABLE deducciones
  -- pago_id ahora nullable (cuotas pendientes no tienen pago aún)
  MODIFY pago_id INT NULL,

  -- Reemplaza pagado (bool)
  ADD COLUMN origen  ENUM('manual','automatico') NOT NULL DEFAULT 'automatico',
  ADD COLUMN estado  ENUM('pendiente','en_pago','aplicado','cancelado') NOT NULL DEFAULT 'en_pago',

  -- Cuota (0 para automáticas, 1..N para manuales — parte de la unique key)
  ADD COLUMN cuota_nro      INT NOT NULL DEFAULT 0,

  -- Campos de plan manual (NULL para automáticas)
  ADD COLUMN monto_total       DECIMAL(14,2) NULL,
  ADD COLUMN monto_cuota       DECIMAL(14,2) NULL,
  ADD COLUMN cuotas_total      INT NULL,
  ADD COLUMN cuotificado       BOOLEAN NULL,
  ADD COLUMN grupo_id          INT NULL,
  ADD COLUMN mes_aplicar       INT NULL,
  ADD COLUMN anio_aplicar      INT NULL,
  ADD COLUMN pagador_medico_id INT NULL REFERENCES listado_medico(ID),

  DROP COLUMN pagado,

  DROP INDEX  uq_ded_pago_med_desc,
  ADD  UNIQUE uq_ded_pago_med_desc_cuota (pago_id, medico_id, descuento_id, cuota_nro);
  -- MySQL ignora NULL en unique → cuotas pendientes (pago_id NULL) no colisionan
```

**Columnas heredadas (sin cambio):**

| Columna | Uso |
|---------|-----|
| `calculado_total` | Monto calculado. Para manuales = `monto_cuota` (espejado). Para automáticas = monto real |
| `porcentaje_aplicado` | Solo automáticas |
| `monto_aplicado` | Registra lo aplicado al médico |

**AuditMixin** provee `created_at` (DateTime UTC) y `created_by_user` (FK → listado_medico.ID).

---

## 3. Máquina de estados

**Ambos orígenes** (manual y automatico) comparten la misma máquina de estados.

```
pendiente ──► en_pago ──► aplicado
    │              │
    └──────────────┴──► cancelado
```

| De | A | Disparado por | Descripción |
|----|---|---------------|-------------|
| `pendiente` | `en_pago` | Auto (crear pago) o PATCH (cualquier origen) | Asignada al pago abierto |
| `en_pago` | `pendiente` | Auto (cierre, no alcanzó disponible) o Manual (PATCH) | Se quita del pago |
| `en_pago` | `aplicado` | Auto (**al cerrar el pago**) | Saldo + aplicación completados |
| `pendiente` | `cancelado` | Manual (DELETE o PATCH) | Cancela — queda en historial |
| `en_pago` | `cancelado` | Manual | Se quita del pago y cancela |

**Regla fundamental:** todas las deducciones (manual y automático) permanecen en `en_pago` mientras el pago está abierto. La transición a `aplicado` ocurre **exclusivamente al cerrar el pago** (`POST /pagos/{pago_id}/cerrar`).

**Estado derivado `vencida`:** solo para manuales `pendiente` cuyo `(anio_aplicar, mes_aplicar)` < fecha actual. No existe en DB — se deriva en runtime.

---

## 4. Flujo completo

### 4.1 Deducción automática (por descuento configurado)

```
POST /{pago_id}/colegio/bulk_generar_descuento/{desc_id}
  1. Verifica que NO exista ninguna Deduccion con (descuento_id, medico_id, mes, anio)
     → Si existe alguna → 409 "descuento_ya_generado"
  2. Calcula monto por médico (bruto * porcentaje, o precio fijo)
  3. INSERT INTO deducciones (origen='automatico', estado='en_pago', cuota_nro=0, ...)
  4. UPSERT DeduccionSaldo (+monto calculado)
  → Rows quedan en estado='en_pago'. No se escribe DeduccionAplicacion todavía.

POST /pagos/{pago_id}/cerrar
  → aplicar_deducciones_al_cierre() — ver sección 4.3
```

**Protección contra doble ejecución:** el pre-check usa `descuento_id + mes_aplicar + anio_aplicar + medico_id`. Esto protege también el caso en que el operador "quitó del pago" una automática (pasa a `pendiente`, `pago_id=NULL`) e intenta regenerarla con `bulk_generar` — el registro sigue existiendo en DB con el mismo mes/año, por lo que levanta 409. Para regenerar hay que eliminar primero el registro vía `DELETE /historial/{id}`.

### 4.2 Deducción manual con cuotas

```
Escenario: cuotas creadas antes de que el pago exista.
POST /programas { medico_id=101, descuento_id=3, monto_total=1500, cuotas=3, mes_inicio=3, anio_inicio=2026 }

Resultado (sin pago abierto aún):
  id=14 → cuota_nro=1, mes=3, año=2026, estado=pendiente, pago_id=null
  id=15 → cuota_nro=2, mes=4, año=2026, estado=pendiente, pago_id=null
  id=16 → cuota_nro=3, mes=5, año=2026, estado=pendiente, pago_id=null

Al crear el pago 03/2026:
  POST /api/pagos/  { mes=3, anio=2026 }
  → auto_asignar_programas: UPDATE deducciones SET estado='en_pago', pago_id=7
    WHERE origen='manual' AND mes_aplicar=3 AND anio_aplicar=2026 AND estado='pendiente'
  → generar_programas_en_pago(pago_id=7):
      UPSERT DeduccionSaldo (+monto_cuota de id=14)
      id=14 queda: estado=en_pago, pago_id=7  ← NO se marca aplicado todavía
  id=15, id=16 siguen: estado=pendiente

Cuota 2 — si operador quiere adelantarla al pago actual:
  PATCH /historial/15/estado  { "estado": "en_pago" }
  → pasa a en_pago con pago_id=7
  POST /deducciones/7/programas/generar
  → carga saldo de id=15, queda en en_pago

Al cerrar el pago:
  POST /pagos/7/cerrar
  → aplicar_deducciones_al_cierre() procesa id=14 e id=15 → aplicado (o pendiente si no alcanzó)
```

### 4.3 Aplicación greedy al cerrar el pago

Cuando `POST /pagos/{pago_id}/cerrar` es invocado, antes de sellar el pago se ejecuta `aplicar_deducciones_al_cierre(db, pago_id)`:

```
1. Lee todas las Deduccion WHERE pago_id=X AND estado='en_pago'
2. Calcula disponible por médico (pagador efectivo):
     disponible = bruto_liquidacion ± ajustes_lotes
3. Agrupa por pagador efectivo (pagador_medico_id ?? medico_id)
4. Por cada pagador, ordena DESC por calculado_total (greedy: más grande primero)
5. Itera:
     si monto <= disponible_restante:
       → aplica: INSERT DeduccionAplicacion, UPDATE DeduccionSaldo (-aplicado)
       → ids_aplicados += id
     else:
       → ids_pendientes += id
6. UPDATE deducciones SET estado='aplicado'   WHERE id IN ids_aplicados
7. UPDATE deducciones SET estado='pendiente', pago_id=NULL WHERE id IN ids_pendientes
8. Retorna { pago_id, aplicadas, pendientes, total_aplicado }
```

**Ejemplo:** médico con 20k bruto, tiene deducción automática de 10k y manual de 15k.
- Ordena: [15k, 10k]
- 15k ≤ 20k → aplica, restante = 5k
- 10k > 5k → no entra → vuelve a `pendiente` con `pago_id=NULL`

---

## 5. Auto-asignación y carga de saldo al crear un pago

Cuando `POST /api/pagos/` crea el pago (mes=M, anio=A), se ejecutan **dos pasos automáticos**:

**Paso 1 — Asignar:**
```sql
UPDATE deducciones
SET estado='en_pago', pago_id=nuevo_pago.id
WHERE origen='manual'
  AND mes_aplicar = M
  AND anio_aplicar = A
  AND estado = 'pendiente'
```

**Paso 2 — Cargar saldo** (`generar_programas_en_pago`):
```sql
-- Lee las recién asignadas
SELECT * FROM deducciones
WHERE pago_id = nuevo_pago.id AND origen='manual' AND estado='en_pago'

-- Acumula saldo (pagador real = deduccion.pagador_medico_id > socio_descuento.pagador_medico_id > medico_id)
UPSERT INTO deduccion_saldo (medico_id, concepto_tipo='desc', concepto_id, saldo += monto_cuota)

-- Rows quedan en estado='en_pago' — NO se marcan aplicado aquí
```

> La aplicación real (`DeduccionAplicacion`) ocurre al cerrar el pago.

---

## 6. Lógica de cuotas

**Payload:** `monto_total=1000, cuotas=3, mes_inicio=11, anio_inicio=2025`

- `cuota_base = floor(1000/3 * 100) / 100 = 333.33`
- Resto: `1000 - 333.33*3 = 0.01` → suma a la **última** cuota: `333.34`
- `calculado_total` se espeja con `monto_cuota` en cada row

| `cuota_nro` | `mes_aplicar` | `anio_aplicar` | `monto_cuota` | `calculado_total` |
|-------------|---------------|----------------|---------------|-------------------|
| 1 | 11 | 2025 | 333.33 | 333.33 |
| 2 | 12 | 2025 | 333.33 | 333.33 |
| 3 | 1  | 2026 | 333.34 | 333.34 |

> `grupo_id` = `id` del row 1 (update tras insertar). Si mes > 12: mes → 1, anio + 1.

---

## 7. Edición de grupo parcialmente aplicado

`PATCH /programas/grupo/{grupo_id}` con `{ "monto_total": nuevo }`:
- Recalcula solo sobre cuotas `pendientes`
- Actualiza `monto_cuota` Y `calculado_total` (espejados)
- `409` si no hay ninguna `pendiente` editable

---

## 8. Pagador delegado

Prioridad: `deducciones.pagador_medico_id` > `socio_descuento.pagador_medico_id` > `medico_id`.

Cuando el pagador difiere:
- El saldo se carga al **pagador** en `DeduccionSaldo`
- El recibo muestra el monto en la cuenta del pagador con label: `"[Concepto] en nombre de [Nombre médico]"`

---

## 9. Endpoints completos

### 9.1 Deducciones manuales (cuotas)

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/deducciones/programas` | Crear (1 o N cuotas) |
| `GET` | `/api/deducciones/programas` | Listar manuales con filtros |
| `GET` | `/api/deducciones/programas/{id}` | Detalle de una cuota |
| `GET` | `/api/deducciones/programas/grupo/{grupo_id}` | Todas las cuotas del grupo |
| `PATCH` | `/api/deducciones/programas/{id}/estado` | Estado (pendiente ↔ en_pago, cancelar) |
| `PATCH` | `/api/deducciones/programas/grupo/{grupo_id}` | Editar monto del grupo |
| `DELETE` | `/api/deducciones/programas/{id}` | Cancelar cuota |
| `DELETE` | `/api/deducciones/programas/grupo/{grupo_id}` | Cancelar cuotas pendientes/en_pago del grupo |

### 9.2 Flujo automático / generación

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/deducciones/{pago_id}/colegio/bulk_generar_descuento/{desc_id}` | Genera automáticas → `en_pago` + carga DeduccionSaldo |
| `POST` | `/api/deducciones/{pago_id}/colegio/aplicar` | Aplica DeduccionSaldo → DeduccionAplicacion (edge case / legado) |
| `POST` | `/api/deducciones/{pago_id}/programas/generar` | Carga saldo de manuales adelantadas manualmente |

### 9.3 Cierre de pago (integrado en pagos)

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/pagos/{pago_id}/cerrar` | Cierra pago + ejecuta aplicación greedy de deducciones |

### 9.4 Historial y reportes

| Método | URL | Descripción |
|--------|-----|-------------|
| `GET` | `/api/deducciones/historial` | Vista única paginada (max 50) — manual + automático |
| `GET` | `/api/deducciones/top-deudores` | Top N médicos con mayor saldo |

### 9.5 Acciones unificadas desde historial

Sin `?tipo=` — la tabla es única, el backend actúa según `origen` interno del registro.

| Método | URL | Body | Descripción |
|--------|-----|------|-------------|
| `PATCH` | `/api/deducciones/historial/{id}/estado` | `{ "estado": "en_pago" }` | Cambiar estado |
| `PATCH` | `/api/deducciones/historial/{id}/monto` | `{ "monto": 500.00 }` | Editar monto |
| `DELETE` | `/api/deducciones/historial/{id}` | — | Cancelar manual / eliminar automática |

> **Validación:** si el pago asociado está cerrado → `409`.

### 9.6 Pagador en SocioDescuento

```
PATCH /api/deducciones/socios/{socio_descuento_id}/pagador
Body: { "pagador_medico_id": 55 }   // null = quitar delegación
```

### 9.7 `POST /api/pagos/`

Tras crear el pago, auto-asigna deducciones manuales con `mes+año` matching → `estado='en_pago'` y carga `DeduccionSaldo`. Las deducciones quedan en `en_pago` hasta el cierre.

---

## 10. Schemas clave

### `DeduccionCreate` (POST /programas)
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

### `DeduccionRead` (respuesta de /programas)
```json
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
}
```

### `DeduccionHistorialItem` (respuesta de /historial)
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
  "created_at": "2026-03-24T10:00:00Z"
}
```

### Payloads de acciones unificadas
```json
// PATCH /historial/{id}/estado
{ "estado": "en_pago" }      // agregar al pago
{ "estado": "pendiente" }    // quitar del pago
{ "estado": "cancelado" }    // cancelar

// PATCH /historial/{id}/monto
{ "monto": 750.00 }

// DELETE /historial/{id}   → sin body
```

---

## 11. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/db/models/financiero.py` | `Deduccion` expandida; `DeduccionPrograma` eliminada |
| `app/db/models/__init__.py` | `DeduccionPrograma` removida de exports |
| `alembic/versions/b9e2c4d1f073_...py` | ALTER deducciones + DROP deduccion_programa |
| `app/modules/deducciones/schemas.py` | `DeduccionCreate`, `DeduccionRead`, `DeduccionHistorialItem` (campo `origen` en lugar de `tipo`) |
| `app/modules/deducciones/service.py` | Reescrito; `generar_programas_en_pago` solo carga saldo; nueva `aplicar_deducciones_al_cierre` |
| `app/modules/deducciones/routes.py` | Reescrito; `bulk_generar` crea `en_pago` sin auto-aplicar |
| `app/modules/pagos/routes.py` | `cerrar_pago` llama `aplicar_deducciones_al_cierre`; `crear_pago` llama `auto_asignar` + `generar_programas_en_pago` |
