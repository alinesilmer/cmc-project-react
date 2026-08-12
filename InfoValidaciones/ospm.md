# OSPM · Obra Social del Personal Municipal — O.S. 433

**Validación contra padrón local · sin servicio externo**

| | |
|---|---|
| Estado | **Implementada** — falta importar el padrón para que valide |
| Backend | `service.validar_ospm()` + `service.importar_padron_ospm()` |
| Tablas nuevas | `padron_ospm`, `nm_nomenclador.ospm_requiere_autorizacion` |
| Legacy de referencia | `legacy_cmc_php/src/ospm_1.php`, `grabar_prestacion_ospm_1.php`, `importar_padron_ospm.php` |

## Estado real

Portada al sistema nuevo. **Falta un paso operativo antes de usarla**: el padrón
`padron_ospm` está vacío. Mientras lo esté, cualquier validación responde 422
con un mensaje que lo dice explícitamente, en vez de hacerle creer al prestador
que el DNI está mal:

> El padrón de OSPM todavía no fue importado. Avisá al Colegio para que cargue
> el padrón vigente.

Se carga con `POST /api/validaciones/ospm/padron` (scope `medicos:leer`).

## Cómo funciona de verdad

**No hay servicio externo.** A pesar de que el catálogo del front dice
`protocolo: "REST"` y `validacion: "online"`, OSPM **no llama a ningún lado**:
valida contra un **padrón que el Colegio importa a mano**. Es la más simple de
las tres pendientes, y la única que no depende de credenciales de un tercero.

El circuito del legacy, en orden:

### 1. Buscar al afiliado por DNI

```sql
SELECT * FROM clientes_ospm WHERE DU = '<dni>'
```

Si no hay fila → **"NO EXISTE ESE AFILIADO"** y no se graba nada.

### 2. Mirar si está activo

| `ACTIVO` | Resultado | Nº de validación |
|---|---|---|
| `S` | `VALIDADO` | aleatorio `mt_rand(1, 99999999)` |
| otro | `NO VALIDADO` | `0` |

### 3. Mirar si el código exige autorización

```sql
SELECT C_P_H_S, OSPM_AUTORIZACION FROM codigo_descripcion WHERE CODIGO = '<codigo>'
```

| `OSPM_AUTORIZACION` | Se guarda en `NOMBRE_ARCHIVO` | Nº de validación |
|---|---|---|
| `S` | `Gestionar autorización en obra social` | `0` (pisa el del paso 2) |
| `N` | `VALIDADO` | aleatorio |

### 4. Antiduplicado por convenio

Sólo para códigos que **empiezan con `42`** (consultas): no se puede cargar el
mismo afiliado + código + fecha dos veces.

> Por convenio, el afiliado X y la prestación Y no puede cargarse mas de 1 en la
> misma fecha

## El número de validación es aleatorio

Conviene decirlo fuerte: **`mt_rand(1, 99999999)` no es un número de
autorización de la obra social**. Es un identificador local que el legacy
inventa para marcar la fila como validada. No hay unicidad garantizada ni
trazabilidad contra OSPM. Al portar, vale reemplazarlo por algo determinístico y
único (el `id` de la fila, o un secuencial propio) en vez de arrastrar el random.

## Datos del padrón

`clientes_ospm` — **5.319 filas** hoy (2.820 activos, 2.499 inactivos):

| Columna | Tipo | |
|---|---|---|
| `DU` | varchar(8) | DNI — la clave de búsqueda |
| `CUIT` | varchar(11) | |
| `AFILIADO` | varchar(30) | nombre; el legacy lo recorta a 20 |
| `ACTIVO` | varchar(1) | `S` / `N` |

Se carga con `importar_padron_ospm.php`: sube un CSV/TXT, **`TRUNCATE` de la
tabla entera** y reinserta. Detecta el separador (`;` o `,`), saltea la fila de
encabezado si empieza con `AYN` o `AFILIADO`, y convierte de ISO-8859-1 a UTF-8.
Orden de columnas del CSV: `AFILIADO, DU, CUIT, ACTIVO`.

> El truncate no es transaccional: si el archivo viene mal, el padrón queda
> vacío y **nadie valida** hasta reimportar. Al portar conviene cargar a una
> tabla temporal y recién entonces swapear.

## El flag por código

`codigo_descripcion.OSPM_AUTORIZACION` — 3.062 códigos: **2.966 en `S`**
(requieren autorización) y sólo **96 en `N`**. O sea que en la enorme mayoría de
los casos el resultado es "gestionar autorización en obra social", no una
validación efectiva.

**`nm_nomenclador` no tiene columna equivalente.** Este es el punto que hay que
resolver antes de portar: el flag vive únicamente en la tabla legacy.

## Datos que pide el formulario actual

| Campo | Formato |
|---|---|
| DNI del afiliado | 8 dígitos, sin puntos ni espacios |
| Código de prestación | del nomenclador del Colegio |

Coincide con el legacy, que sólo usa `dni_du_1` y `codigo_prestacion1`. Cantidad
y coseguro van fijos en 1 y 0.

## Cómo quedó implementada

A diferencia de Sancor, **no hay cliente HTTP ni modo simulado**: no se habla con
nadie, así que no hay efectos irreversibles del otro lado. Todo es local.

### Las tablas nuevas

**`padron_ospm`** — padrón propio, con `documento` UNIQUE, `nombre`, `cuit`,
`activo` (bool, no el `varchar(1)` del legacy) e `importado_at`, que permite
auditar con qué padrón se validó una prestación cuando la obra social la discute
meses después. **No se lee `clientes_ospm`**: esa sigue siendo del PHP viejo, se
importa por separado y las dos conviven sin tocarse.

**`nm_nomenclador.ospm_requiere_autorizacion`** — bool, default `1` (=hay que
gestionar autorización), que es el caso de 2.966 de los 3.062 códigos del
legacy. Las excepciones se marcan desde el ABM de códigos.

> El nombre lleva el prefijo `ospm_` a propósito. Si otra obra social necesita un
> flag parecido con criterio propio, va en **su propia** columna — no se reusa
> esta ni se la renombra a algo genérico, para que un cambio de convenio de una
> no altere el de la otra en silencio.

### Los tres desenlaces

| Afiliado | Código | `validacion_estado` | ¿Factura? |
|---|---|---|---|
| activo | no requiere autorización | `autorizada` | sí |
| activo | requiere autorización | `pendiente` | no — importe 0, `estado='X'` |
| inactivo | cualquiera | `rechazada` | no — importe 0, `estado='X'` |

Siempre queda una fila, como en el resto del módulo: el prestador ve qué pasó y
la traza del padrón y del flag queda en `validacion_respuesta`.

### Importación del padrón

`POST /api/validaciones/ospm/padron`, multipart, scope `medicos:leer`. Acepta el
mismo formato que el legacy —`AFILIADO, DU, CUIT, ACTIVO`, separador `;` o `,`,
encabezado opcional `AYN`/`AFILIADO`, ISO-8859-1— y además UTF-8, que es como
vienen los archivos nuevos. Descarta filas sin DNI y duplicados (gana el
primero). Devuelve `{importados, activos, inactivos}`.

**Se parsea antes de borrar**, y el borrado va en la misma transacción que la
carga: si el archivo viene mal, el padrón anterior queda intacto. El legacy hace
`TRUNCATE` primero y deja el padrón vacío si el archivo falla.

## Diferencias contra el legacy

| Legacy | Sistema nuevo |
|---|---|
| `guardar_atencion` | `detalle_facturacion` con `origen_carga='medico'` |
| `clientes_ospm` | `padron_ospm` (tabla nueva) |
| `codigo_descripcion.OSPM_AUTORIZACION` | `nm_nomenclador.ospm_requiere_autorizacion` |
| `valor_prestacion` → `valor_nomenclador_nacional` | `resolver_precio` sobre `nm_*` |
| Período de `$_SESSION["mes_periodo_doctor"]` | puntero `periodo_medico_actual` |
| `mt_rand(1, 99999999)` como nº de validación | el `id` de la fila — único y rastreable |
| Antiduplicado sobre `guardar_atencion` | sobre `detalle_facturacion`, ignorando las anuladas |
| `TRUNCATE` y después parsear | parsear y después reemplazar, en una transacción |
| Si no valida, no graba nada | siempre graba; lo no autorizado en `estado='X'` |

## Pendiente

- **Importar el padrón.** Sin eso no valida nadie.
- **Marcar los 96 códigos que no requieren autorización.** Hoy todos los códigos
  arrancan en `requiere_autorizacion = true`, así que todo cae en `pendiente`.
  La lista está en el legacy: `SELECT CODIGO FROM codigo_descripcion WHERE
  OSPM_AUTORIZACION = 'N'`.
- El ABM de códigos todavía no expone el flag: hay que sumarlo al formulario de
  `NomencladorCodigos` para poder marcarlos desde el panel.
- El front sigue mostrando `protocolo: "REST"` y `validacion: "online"` para
  OSPM en `validaciones.config.ts`. Es incorrecto: no hay servicio externo.
