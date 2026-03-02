## Idea central

En este proyecto, “liquidaciones” **no es comisiones de ventas**.

Es el proceso por el cual el Colegio Médico calcula cuánto corresponde pagarle a cada **médico/socio** por las **prestaciones** que realizó y presentó para facturación, considerando:

- **Bruto facturado** por prestaciones (lo que “se pasó a cobro”).
- **Débitos** asociados a una factura informados por cada **obra social** (prestaciones no pagadas o pagadas parcialmente).
- **Créditos**  asociados a una factura informados por cada **obra social**
- **Deducciones / descuentos internos** (deudas del médico con el Colegio u otras retenciones/descuentos).

El resultado final es el **neto a pagar** al médico y un **resumen** auditable/consultable (intranet / reportes).

---

## Alcance y no-alcance

### ✅ Alcance (Liquidación)

Traza del proceso que implementa este módulo:

1. **Crear período global de liquidación** (run / “resumen”)
2. **Buscar y seleccionar factura a liquidar** (OS + período factura)
3. **Aplicar débitos** (si existen)
4. **Liquidación por médico** (totales por médico, aplica deducciones internas)
5. **Reporte / emisión de recibos**

### ❌ No-alcance (Facturación)

- Carga de prestaciones
- Auditoría de prestaciones
- Presentación a OS y cobro/pago por OS

En tu implementación, esas partes viven en el área de **Facturación**, y Liquidación **consume** esa información como insumo.

---

## Glosario mínimo (términos clave)

- **Prestación**: atención/procedimiento realizado por el médico a un paciente, asociado a una obra social y valorizado por un tarifario/convenio.
- **Obra Social (OS)**: entidad pagadora. Recibe la presentación y luego liquida (paga) al Colegio.
- **Débito (OS)**: descuento aplicado por la obra social porque **no reconoce** una prestación (o parte) por errores/faltantes/criterios de auditoría de la OS.

- **Credito  (OS):** OS reconoce un adicional por ajuste de arancel / reintegro / corrección de débito anterior”
- **Deducción (interna)**: descuento que el Colegio aplica al médico por **deudas/obligaciones** (cuota, mala praxis, mutual, anticipos, etc.).
- **Bruto facturado**: suma de importes de prestaciones presentadas.
- **Neto a pagar**: bruto facturado menos débitos de obra social (lo que efectivamente “se reconoce” para pagar) y menos deducciones/retenciones internas.
- **Factura:** es un “lote/presentación” proveniente de Facturación con **(obra_social_id, mes, año, nro_factura)** + totales.

---

## Qué busca el sistema con la liquidación

*Crear periodo de la liquidación “global”*  *→  Buscar y seleccionar factura (os + periodo) a liquidar →  Aplicar débitos (si tiene) → liquidación medico →  reporte de recibos*

---

## Flujo del área

1. Crear `liquidacion_resumen` (año/mes global).
2. Para cada factura seleccionada (OS+período):
    - crear `liquidacion` (con nro_factura, os, mes_periodo, anio_periodo).
3. Poblar `detalle_liquidacion`:
    - por cada `guardar_atencion` del OS+período, crear detalle con:
        - `prestacion_id` (FK)
        - `medico_id` (mapeo desde socio/matrícula al ID de listado_medico)
        - `importe_bruto`
        - etc
4. Aplicar `debito_credito`:
    - unir por `atencion_id/prestacion_id`  + OS + período
    - guardar relación (1 a N)
5. Generar `liquidacion_medico`:
    - agrupar detalles por médico
    - calcular bruto/debitos/reconocido
    - aplicar deducciones (tus tablas actuales)
    - guardar neto
6. Emitir `recibo`:
    - uno por médico (recomendado)
    - link a `liquidacion_medico` (o guardar totales)

---

## Diferencia crucial: Débitos vs Deducciones

### Débitos (Obra Social)

**Qué son:** descuentos que “vienen de afuera” (OS) porque no reconoce la prestación o la reconoce parcialmente.

**Ejemplo simple (caso típico):**

- Médico A presentó 30 prestaciones a OS “Sancor”.
- Sancor paga 28 y “debita” 2 por falta de datos/documentación.
- El Colegio **no puede pagar** esas 2 como si fueran cobradas.
- Por lo tanto:
    - Bruto facturado incluye 30
    - Bruto reconocido incluye 28 (o el monto efectivamente reconocido)

**Motivos comunes de débito:**

- Falta de datos obligatorios (matrícula, diagnóstico, firma, autorización, etc.)
- Inconsistencia de código/nomenclador
- Fuera de plazo
- Falta de respaldo documental
- Prestación no cubierta por plan/convenio
- Doble facturación / duplicado

> Regla mental: **Débito = OS no pagó → no existe el dinero para transferir al médico.**
> 

---

### Deducciones (Internas del Colegio)

**Qué son:** descuentos aplicados por el Colegio por obligaciones/deudas del médico.

**Ejemplos comunes (pueden variar según tu implementación):**

- Cuota de colegiación
- Seguro de mala praxis
- Fondo solidario / mutual
- Anticipos / préstamos
- Otros descuentos administrativos configurables

> Regla mental: **Deducción = sí hay dinero reconocido, pero se descuenta por obligaciones internas.**
> 

---

## Modelo actual: entidades y propósito

### 1) `guardar_atencion` (GuardarAtencion)

**Rol dentro de Liquidación:** Fuente de “prestaciones/atenciones” (insumo).

Aunque pertenece a Facturación, Liquidación toma datos como:

- Identificación del médico (ej: `NRO_SOCIO`, `NRO_MATRICULA`, etc.)
- Identificación de OS (`NRO_OBRA_SOCIAL`)
- Período (`MES_PERIODO`, `ANIO_PERIODO`)
- Importe base a liquidar (`IMPORTE_COLEGIO`, etc.)

---

### 2) `liquidacion_resumen` (LiquidacionResumen)

**Qué es:** el “**Período global**” o “corrida de liquidación” (run).

- `anio`, `mes` únicos (uq)
- relación `liquidaciones[]`

---

### 3) `liquidacion` (Liquidacion)

**Qué es:** una liquidación por **Factura/OS+Período** dentro de un resumen global.

Campos clave:

- `resumen_id` (FK)
- `obra_social_id`
- `mes_periodo`, `anio_periodo` (período de la factura)
- `nro_factura`
- `estado` A/C y `cierre_timestamp`
- totales `total_bruto / total_debitos / total_neto`
- `refacturado_from` (versionado/reliquidación)

---

### 4) `detalle_liquidacion` (DetalleLiquidacion)

**Qué es:** el detalle por prestación dentro de una `liquidacion`.

- `liquidacion_id`
- `medico_id`
- `obra_social_id`
- `prestacion_id` (String(16))
- `importe` (monto de esa prestación)
- `debito_credito_id` (opcional)
- `pagado` (Decimal)

---

### 5) `debito_credito` (Debito_Credito)

**Qué es:** registro de **ajustes** por prestación (débito o crédito), asociado a:

- `id_atencion` (FK a guardar_atencion.ID)
- `obra_social_id`
- `tipo` d/c
- `monto`
- `periodo` (string)

---

### 6) Descuentos y Deducciones internas

Tienen un enfoque bastante sólido tipo “catálogo + asignación + cálculo + saldos”:

- `descuentos` (catálogo: monto fijo y/o porcentaje)
- `socio_descuento` (qué descuentos aplican a qué médico y desde/hasta)
- `deducciones` (resultado por médico y período: total calculado, % aplicado, monto aplicado, pagado)
- `deduccion_saldo` (saldo pendiente por médico y concepto)
- `deduccion_aplicacion` (cuánto se aplicó por período)

---



## Cálculo: definiciones y fórmula base

### Variables por médico y periodo

- `bruto_facturado` = suma(importes base de prestaciones)
- `ajustes_os` = `creditos_os - debitos_os`
- `total_reconocido_os` = `bruto_facturado + ajustes_os`
- `neto_a_pagar` = `total_reconocido_os - deducciones_internas`

---

## Refacturación (re-liquidación con versión)

### Objetivo

La **refacturación** existe para corregir una liquidación ya generada (y normalmente cerrada) **sin modificar el histórico**. En lugar de editar la liquidación original, se crea una **nueva Liquidación versión** que:

- hereda el contexto (OS + período + corrida global),
- permite **agregar prestaciones/ítems faltantes** o corregir importes/ajustes,
- conserva trazabilidad completa de “qué se pagó, qué se debitó, qué observación tenía”, etc.

---

### Regla principal (inmutabilidad)

- Una liquidación **cerrada** (`estado = C`) **no se edita**.
- Cualquier corrección se hace por refacturación creando una **nueva fila** en `Liquidacion`.
- La nueva liquidación debe apuntar a la anterior con `refacturado_from = <id_liquidacion_original>`.

---

### Flujo de UI / Operación (según tu proceso)

### 1) Acción inicial

- El usuario hace click en **“Refacturar”** sobre una Liquidación existente.
- El sistema solicita o permite editar:
    - `nro_factura` de la nueva versión (si cambia o si se corrige).

### 2) Creación automática de la nueva versión

Al confirmar refacturación:

- Se crea automáticamente un nuevo registro en `Liquidacion` (nuevo `id`) con:
    - mismo `obra_social_id`, `mes_periodo`, `anio_periodo` (salvo que tu negocio permita otro),
    - `resumen_id` correspondiente a la corrida global (si aplica),
    - `refacturado_from = <liquidacion_original.id>`,
    - `estado = A` (abierta),
    - `cierre_timestamp = NULL`,
    - totales en 0 (o recalculados luego).

> Invariante: una liquidación refacturada siempre debe poder “volver atrás” a su origen mediante `refacturado_from`.
> 

---

### 3) Copia de “estado” de ítems al refacturar (clave de tu proceso)

Cuando el usuario agrega una prestación a la refacturación buscándola por:

- `nro_orden` o `nro_consulta` (según el identificador que uses),

el sistema debe **arrastrar el estado histórico previo**, es decir:

- cuánto se pagó (`pagado`),
- cuánto fue débito o crédito (`monto`, `tipo`),
- observación/motivo de débito/crédito,
- cualquier marca de auditoría asociada a esa prestación dentro de la liquidación anterior.

**Regla importante:**

La refacturación no parte “en blanco” para el ítem. Parte del **último estado conocido** y a partir de ahí se aplican ajustes.

---

### 4) Ajustes en refacturación

Una vez copiado el ítem con su estado:

- Se pueden aplicar **ajustes**:
    - agregar nuevos **débitos**,
    - agregar nuevos **créditos**,
    - corregir observaciones,
    - corregir importes reconocidos.

**Regla de consistencia:**

- El “neto final” debe recalcularse como:
    - `reconocido = bruto + creditos - debitos`
    - `neto = reconocido - deducciones`

---

## Reglas e invariantes de refacturación

### A) Qué se puede y no se puede hacer

- ✅ Se puede:
    - crear nueva versión,
    - agregar prestaciones faltantes,
    - aplicar ajustes débitos/créditos,
    - recalcular totales y deducciones en la nueva versión.
- ❌ No se puede:
    - modificar la liquidación original cerrada,
    - “borrar historia”: siempre debe quedar rastro de la versión anterior.

### B) Reglas de integridad

- No se debe permitir duplicar la misma prestación dentro de la nueva versión (misma `atencion_id` / `prestacion_id` según tu clave).
- Si una prestación ya estuvo en la versión anterior:
    - al re-agregarla en la nueva versión, debe copiar su estado previo.
- Si una prestación nunca estuvo en ninguna versión:
    - se agrega como “nuevo ítem”, con pagado=0 y sin ajustes, hasta que se apliquen.
- La creación de la nueva `Liquidacion` y la actualización de `refacturado_from` debe ser **transaccional** (todo o nada).

### C) Encadenamiento de versiones

- Si refacturás una refacturación (segunda corrección):
    - la nueva versión debería apuntar al “último” id (cadena)

---

## Casos borde a contemplar

### Datos / Insumos

- **Prestación eliminada o “EXISTE=N”**:  toda prestacion que se saca de guardar_atencion que tenga EXISTE = “N” entonces no se comtenpla en la liquidacion
- **Importes nulos/0 o negativos** en prestaciones: validar antes de liquidar.

### Débitos/Créditos (OS)

- **Débito mayor al importe de la prestación** (inconsistencia): bloquear y lanzar una Exception

### Deducciones internas / Saldos

- Las deducciones al liquidar se seleccionan, no tiene que descontarse cuyo id de “Deducción/Descuento” es diferente al solicitado
- **Neto negativo**:
    - (a) neto=0 y generar/actualizar saldo pendiente,
    - (b) aplicar deducciones hasta cubrir reconocido y el resto queda en saldo,
- **Deducciones “manuales” extraordinarias**: si existe un ajuste puntual, dónde se registra y cómo impacta recibo.
- **Deducciones ya pagadas** (`pagado=True`): evitar re-aplicarlas en períodos siguientes.

### Versionado / Refacturación

- **Refacturar una liquidación cerrada**: crear nueva `Liquidacion` referenciando `refacturado_from`
- **Cambios en Facturación post-liquidación**: si `guardar_atencion` cambia importes/datos, tu liquidación debe permanecer consistente (snapshot).
- **Re-liquidación parcial**: solo cambia 1 médico o 1 prestación → solo se modifica lo que se selecciona, como una especie de “parche”

### Concurrencia / Idempotencia

- **Doble ejecución**: que el mismo proceso de “poblar detalles” o “aplicar débitos” corra dos veces → debe ser idempotente (UniqueConstraints + estrategia de upsert).
- **Cierre simultáneo**: dos usuarios intentando cerrar la misma liquidación → lock/validación transaccional.
- **Performance**: liquidaciones grandes → procesar por lotes y tener índices alineados a filtros reales (OS+periodo, medico+periodo, atencion_id)

---

## Reglas

### 1) Alcance y separación de dominios

- **Liquidación NO crea ni audita prestaciones**: consume datos ya consolidados desde **Facturación**.
- Liquidación solo opera sobre: **factura seleccionada → débitos/créditos OS → deducciones internas → neto/recibos**.

### 2) Reglas de identidad y trazabilidad

- **Toda Liquidación (OS + período) debe tener una factura asociada**:
    - `obra_social_id + anio_periodo + mes_periodo + nro_factura` deben identificar inequívocamente el lote.
- Cada ítem liquidado debe poder trazarse a **una atención/prestación origen** (ideal: `prestacion_id`/FK a `guardar_atencion.ID`).
- **Prohibido liquidar “a ciegas”**: si no se puede mapear un detalle a un médico válido (`listado_medico.ID`), la liquidación debe quedar **OBSERVADA** (o bloquearse) y generar un JSON con la informacion necesaria para debuggear.

### 3) Regla de estado de la factura (precondición)

- **No se puede iniciar una liquidación si la factura de Facturación no está cerrada/consolidada**.
- Si la factura cambia luego (caso excepcional), la liquidación ya creada **no se edita**: se **refactura/reliquida** con versión nueva.

### 4) Inmutabilidad post-cierre (congelado)

- Si `Liquidacion.estado = C` (cerrada):
    - **No** se agregan/quitan detalles.
    - **No** se modifican importes.
    - **No** se reasignan débitos/créditos.
    
    La única salida ante un error es: **refacturar** → crear nueva `Liquidacion` en estado `A` referenciando `refacturado_from`.
    

### 5) Débitos / Créditos OS: significado y aplicación

- **Débito OS**: dinero que la obra social **no pagó** → reduce el **reconocido**.
- **Crédito OS**: ajuste a favor (reintegro, corrección, adicional) → aumenta el **reconocido**.
- Regla base de cálculo:
    - `reconocido = bruto_facturado + creditos_os - debitos_os`
- Un débito/crédito debe aplicarse:
    - **por prestación** (`id_atencion/id_prestacion`)

### 6) Deducciones internas: prioridad y límites

- Las deducciones internas se aplican **después** de obtener el **reconocido**.
- Debe existir un **orden de prioridad** (configurable) si hay múltiples deducciones.
- Si `deducciones > reconocido`:
    - regla típica: **neto = 0** y el resto pasa a **saldo pendiente** (arrastre).
- No re-aplicar deducciones marcadas como `pagado=True` ni duplicar por idempotencia.}
- Al momento de hacer una liquidación el sistema debe buscar aquellos saldos del medico para poder descontar

### 7) Reglas de emisión de recibos

- Solo se emiten recibos cuando:
    - la liquidación está cerrada

### 8) Idempotencia y consistencia (evitar duplicados)

- Operaciones críticas deben ser idempotentes:
    - “Poblar detalles desde factura”
    - “Aplicar débitos/créditos”
    - “Calcular deducciones”
- Si se corre dos veces, el resultado debe ser el mismo:
    - usar `UniqueConstraints` + “upsert” lógico + validaciones transaccionales.
- No debe existir el mismo `prestacion_id` dos veces dentro de la misma liquidación

### 9) Versionado / Refacturación

- Una refacturación:
    - crea nueva liquidación (nueva `id`) con `refacturado_from` apuntando a la anterior,
    - conserva trazabilidad (quién/cuándo/motivo),
    - deja la anterior cerrada/anulada según política.
- No se “parchea” una liquidación cerrada: se versiona.

## Ejemplo numérico (completo)

**Médico:** Dra. Pérez

**Obra social:** Sancor

**Periodo:** 01/2026

- Prestaciones presentadas: 30
- Importe total presentado: $300.000
- Débitos OS: 2 prestaciones debitadas por falta de autorización → $20.000
- Bruto reconocido: $300.000 - $20.000 = **$280.000**

Deducciones internas:

- Cuota colegiación: $10.000
- Mala praxis: $12.000
- Anticipo: $25.000

Total deducciones: $47.000

**Neto a pagar:** $280.000 - $47.000 = **$233.000**

En el resumen se deberían ver claramente:

- Presentado: $300.000
- Débitos OS: $20.000 (motivos)
- Reconocido: $280.000
- Deducciones: $47.000 (detalle)
- Neto: $233.000