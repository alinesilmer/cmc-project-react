# Filtros disponibles — `GET /api/medicos/all`

Endpoint para listar médicos con filtros avanzados. Todos los parámetros son opcionales y se combinan con `AND`.

**Base URL:** `GET /api/medicos/all`

**Autenticación:** Bearer token con scope `medicos:leer`

---

## Paginación

La paginación se aplica **después** de todos los filtros. El servidor primero aplica todos los criterios de búsqueda y luego recorta el resultado con `skip` y `limit`.

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `skip` | `int` | `0` | Registros a saltar |
| `limit` | `int` | `50` | Máximo de registros a devolver |

---

## Búsqueda full-text

| Parámetro | Tipo | Descripción |
|---|---|---|
| `q` | `string` | Busca por ILIKE en `nombre`, `nro_socio`, `matricula_prov`, `documento` |

---

## Estado del médico y malapraxis

| Parámetro | Tipo | Valores | Descripción |
|---|---|---|---|
| `tiene_malapraxis` | `bool` | `true` / `false` | `true` = tiene malapraxis cargada; `false` = campo vacío, null o igual a `"A"` (valor por defecto del sistema) |

## Estado del médico

| Parámetro | Tipo | Valores | Descripción |
|---|---|---|---|
| `estado` | `string` | `activos` \| `inactivos` \| `todos` | Filtra por campo `EXISTE` (`S` = activo) |

---

## Filtros de vencimientos (booleanos)

Estos flags se combinan con **OR** entre sí (se devuelven médicos que cumplan al menos uno).

| Parámetro | Tipo | Descripción |
|---|---|---|
| `malapraxis_vencida` | `bool` | `VENCIMIENTO_MALAPRAXIS < hoy` |
| `malapraxis_por_vencer` | `bool` | `VENCIMIENTO_MALAPRAXIS` dentro de los próximos N días |
| `anssal_vencido` | `bool` | `VENCIMIENTO_ANSSAL < hoy` |
| `anssal_por_vencer` | `bool` | `VENCIMIENTO_ANSSAL` dentro de los próximos N días |
| `cobertura_vencida` | `bool` | `VENCIMIENTO_COBERTURA < hoy` |
| `cobertura_por_vencer` | `bool` | `VENCIMIENTO_COBERTURA` dentro de los próximos N días |
| `por_vencer_dias` | `int` | Default `30`. Ventana de días para los filtros `*_por_vencer` |
| `vencimientos_desde` | `string` | Fecha `YYYY-MM-DD`. Acota los flags de vencimiento a fechas >= este valor |
| `vencimientos_hasta` | `string` | Fecha `YYYY-MM-DD`. Acota los flags de vencimiento a fechas <= este valor |

---

## Filtros numéricos (exact match)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | `int` | PK interna del médico |
| `nro_socio` | `int` | Número de socio (credencial de login) |
| `matricula_prov` | `int` | Matrícula provincial |
| `matricula_nac` | `int` | Matrícula nacional |
| `nro_especialidad` | `int` | Especialidad slot 1 |
| `nro_especialidad2` | `int` | Especialidad slot 2 |
| `nro_especialidad3` | `int` | Especialidad slot 3 |
| `nro_especialidad4` | `int` | Especialidad slot 4 |
| `nro_especialidad5` | `int` | Especialidad slot 5 |
| `nro_especialidad6` | `int` | Especialidad slot 6 |
| `anssal` | `int` | Número ANSSAL |
| `cobertura` | `int` | Número de cobertura |

---

## Filtros de fecha (exact match o rango)

Formato de fecha: `YYYY-MM-DD`.

Para cada campo de fecha se puede usar el valor exacto **o** un rango con sufijos `_desde` / `_hasta`. Se pueden combinar.

| Parámetro | Rango desde | Rango hasta |
|---|---|---|
| `fecha_ingreso` | `fecha_ingreso_desde` | `fecha_ingreso_hasta` |
| `fecha_recibido` | `fecha_recibido_desde` | `fecha_recibido_hasta` |
| `fecha_matricula` | `fecha_matricula_desde` | `fecha_matricula_hasta` |
| `fecha_nac` | `fecha_nac_desde` | `fecha_nac_hasta` |
| `fecha_vitalicio` | `fecha_vitalicio_desde` | `fecha_vitalicio_hasta` |
| `fecha_resolucion` | `fecha_resolucion_desde` | `fecha_resolucion_hasta` |
| `vencimiento_anssal` | `vencimiento_anssal_desde` | `vencimiento_anssal_hasta` |
| `vencimiento_malapraxis` | `vencimiento_malapraxis_desde` | `vencimiento_malapraxis_hasta` |
| `vencimiento_cobertura` | `vencimiento_cobertura_desde` | `vencimiento_cobertura_hasta` |

---

## Filtros de string exacto (case-insensitive)

| Parámetro | Valores posibles |
|---|---|
| `existe` | `S` / `N` |
| `sexo` | `M` / `F` |
| `categoria` | `A`, `B`, ... (1 carácter) |
| `ingresar` | `D` (doctor) / `E` (empleado) / `A` (administrador) |
| `vitalicio` | `S` / `N` |
| `monotributista` | `SI` / `NO` |
| `factura` | `SI` / `NO` |
| `tipo_doc` | `DNI`, etc. |
| `condicion_impositiva` | valor exacto del campo |

---

## Filtros de string parcial (ILIKE `%valor%`)

| Parámetro | Descripción |
|---|---|
| `nombre` | Nombre completo (campo legacy concatenado) |
| `nombre_` | Nombre separado |
| `apellido` | Apellido |
| `domicilio_consulta` | Domicilio del consultorio |
| `domicilio_particular` | Domicilio particular |
| `telefono_consulta` | Teléfono del consultorio |
| `tele_particular` | Teléfono particular |
| `celular_particular` | Celular |
| `mail_particular` | Email |
| `documento` | Número de documento |
| `cuit` | CUIT |
| `malapraxis` | Aseguradora de malpráxis |
| `provincia` | Provincia (búsqueda parcial) |
| `localidad` | Localidad (búsqueda parcial) |
| `codigo_postal` | Código postal |
| `observacion` | Observaciones |
| `cbu` | CBU bancario |
| `nro_resolucion` | Número de resolución |
| `titulo` | Título profesional |

---

## Response

**Status:** `200 OK`

Devuelve un array de objetos con todos los campos del médico.

```json
[
  {
    "id": 1,
    "nro_socio": 1234,
    "nombre": "GARCIA JUAN",
    "nombre_": "JUAN",
    "apellido": "GARCIA",
    "sexo": "M",
    "documento": "28456789",
    "cuit": "20284567890",
    "fecha_nac": "1975-03-15",
    "fecha_ingreso": "2005-06-01",
    "fecha_matricula": "2005-06-01",
    "fecha_recibido": "2005-05-20",
    "matricula_prov": 5678,
    "matricula_nac": 0,
    "nro_especialidad": 3,
    "nro_especialidad2": 0,
    "nro_especialidad3": 0,
    "nro_especialidad4": 0,
    "nro_especialidad5": 0,
    "nro_especialidad6": 0,
    "domicilio_consulta": "AV. RIVADAVIA 1234",
    "telefono_consulta": "2614001234",
    "domicilio_particular": "BELGRANO 567",
    "tele_particular": "2614005678",
    "celular_particular": "2614991234",
    "mail_particular": "jgarcia@example.com",
    "tipo_doc": "DNI",
    "anssal": 0,
    "vencimiento_anssal": "2026-12-31",
    "malapraxis": "SANCOR SEGUROS",
    "vencimiento_malapraxis": "2026-08-01",
    "monotributista": "NO",
    "factura": "NO",
    "cobertura": 0,
    "vencimiento_cobertura": null,
    "provincia": "MENDOZA",
    "localidad": "CIUDAD",
    "codigo_postal": "5500",
    "vitalicio": "N",
    "fecha_vitalicio": null,
    "observacion": "",
    "categoria": "A",
    "existe": "S",
    "ingresar": "D",
    "cbu": "0110000000000000000000",
    "nro_resolucion": "123/2005",
    "fecha_resolucion": "2005-06-01",
    "condicion_impositiva": "MONOTRIBUTO",
    "titulo": "MÉDICO",
    "excep_desde": "0",
    "excep_hasta": "0",
    "excep_desde2": "0",
    "excep_hasta2": "0",
    "excep_desde3": "0",
    "excep_hasta3": "0",
    "conceps_espec": { "conceps": [], "espec": [] },
    "attach_titulo": null,
    "attach_matricula_nac": null,
    "attach_matricula_prov": null,
    "attach_resolucion": null,
    "attach_habilitacion_municipal": null,
    "attach_cuit": null,
    "attach_condicion_impositiva": null,
    "attach_anssal": null,
    "attach_malapraxis": null,
    "attach_cbu": null,
    "attach_dni": null
  }
]
```

---

## Ejemplos de request

### Médicos activos con especialidad 3
```
GET /api/medicos/all?estado=activos&nro_especialidad=3
```

### Búsqueda por nombre + paginación
```
GET /api/medicos/all?q=garcia&skip=0&limit=20
```

### Médicos con ANSSAL vencida o por vencer en 60 días
```
GET /api/medicos/all?anssal_vencido=true&anssal_por_vencer=true&por_vencer_dias=60
```

### Médicos con malpráxis vencida dentro de un rango de fechas
```
GET /api/medicos/all?malapraxis_vencida=true&vencimientos_desde=2026-01-01&vencimientos_hasta=2026-06-30
```

### Filtro por fecha de ingreso (rango)
```
GET /api/medicos/all?fecha_ingreso_desde=2020-01-01&fecha_ingreso_hasta=2023-12-31
```

### Médicos de una provincia que sean monotributistas
```
GET /api/medicos/all?provincia=mendoza&monotributista=SI
```

### Médicos sin malapraxis cargada
```
GET /api/medicos/all?tiene_malapraxis=false
```

### Médicos con malapraxis cargada, activos, página 2
```
GET /api/medicos/all?tiene_malapraxis=true&estado=activos&skip=50&limit=50
```

### Médico por nro_socio exacto
```
GET /api/medicos/all?nro_socio=1234
```

---

## Errores

| Status | Causa |
|---|---|
| `400` | Valor numérico inválido para un campo numérico, o fecha con formato incorrecto |
| `401` | Token ausente o expirado |
| `403` | Token sin scope `medicos:leer` |


```

@router.get("/{medico_id}", response_model=MedicoDetailOut)
async def obtener_medico(medico_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            ListadoMedico.ID.label("id"),
            ListadoMedico.NRO_SOCIO.label("nro_socio"),
            ListadoMedico.NOMBRE.label("name"),
            ListadoMedico.nombre_.label("nombre_"),
            ListadoMedico.apellido.label("apellido"),
            ListadoMedico.MATRICULA_PROV.label("matricula_prov"),
            ListadoMedico.MATRICULA_NAC.label("matricula_nac"),
            ListadoMedico.TELEFONO_CONSULTA.label("telefono_consulta"),
            ListadoMedico.DOMICILIO_CONSULTA.label("domicilio_consulta"),
            ListadoMedico.MAIL_PARTICULAR.label("mail_particular"),
            ListadoMedico.SEXO.label("sexo"),
            ListadoMedico.TIPO_DOC.label("tipo_doc"),
            ListadoMedico.DOCUMENTO.label("documento"),
            ListadoMedico.CUIT.label("cuit"),
            ListadoMedico.PROVINCIA.label("provincia"),
            ListadoMedico.CODIGO_POSTAL.label("codigo_postal"),
            ListadoMedico.CATEGORIA.label("categoria"),
            ListadoMedico.EXISTE.label("existe"),
            ListadoMedico.FECHA_NAC.label("fecha_nac"),
            ListadoMedico.localidad.label("localidad"),
            ListadoMedico.DOMICILIO_PARTICULAR.label("domicilio_particular"),
            ListadoMedico.TELE_PARTICULAR.label("tele_particular"),
            ListadoMedico.CELULAR_PARTICULAR.label("celular_particular"),
            ListadoMedico.titulo.label("titulo"),
            ListadoMedico.FECHA_RECIBIDO.label("fecha_recibido"),
            ListadoMedico.FECHA_MATRICULA.label("fecha_matricula"),
            ListadoMedico.FECHA_INGRESO.label("fecha_ingreso"),
            ListadoMedico.nro_resolucion.label("nro_resolucion"),
            ListadoMedico.fecha_resolucion.label("fecha_resolucion"),
            ListadoMedico.conceps_espec.label("conceps_espec"),
            ListadoMedico.condicion_impositiva.label("condicion_impositiva"),
            ListadoMedico.ANSSAL.label("anssal"),
            ListadoMedico.VENCIMIENTO_ANSSAL.label("vencimiento_anssal"),
            ListadoMedico.MALAPRAXIS.label("malapraxis"),
            ListadoMedico.VENCIMIENTO_MALAPRAXIS.label("vencimiento_malapraxis"),
            ListadoMedico.COBERTURA.label("cobertura"),
            ListadoMedico.VENCIMIENTO_COBERTURA.label("vencimiento_cobertura"),
            ListadoMedico.cbu.label("cbu"),
            ListadoMedico.OBSERVACION.label("observacion"),
            ListadoMedico.attach_titulo.label("attach_titulo"),
            ListadoMedico.attach_matricula_nac.label("attach_matricula_nac"),
            ListadoMedico.attach_matricula_prov.label("attach_matricula_prov"),
            ListadoMedico.attach_resolucion.label("attach_resolucion"),
            ListadoMedico.attach_habilitacion_municipal.label("attach_habilitacion_municipal"),
            ListadoMedico.attach_cuit.label("attach_cuit"),
            ListadoMedico.attach_condicion_impositiva.label("attach_condicion_impositiva"),
            ListadoMedico.attach_anssal.label("attach_anssal"),
            ListadoMedico.attach_malapraxis.label("attach_malapraxis"),
            ListadoMedico.attach_cbu.label("attach_cbu"),
            ListadoMedico.attach_dni.label("attach_dni"),
        )
        .where(ListadoMedico.ID == medico_id)
    )

    result = await db.execute(stmt)
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    d = dict(row)

    def norm_path(p: str | None) -> str | None:
        if not p:
            return None
        s = str(p).strip()
        if not s:
            return None
        if s.startswith("http://") or s.startswith("https://"):
            return s
        if not s.startswith("/"):
            s = "/" + s
        return s

    raw = d.get("conceps_espec") or {}
    espec_list = raw.get("espec") or []

    adj_ids: set[int] = set()
    espec_ids: set[int] = set()
    for it in espec_list:
        adj = it.get("adjunto")
        if adj is not None:
            s = str(adj).strip()
            if s.isdigit():
                adj_ids.add(int(s))
        id_col = it.get("id_colegio")
        if id_col is not None:
            try:
                espec_ids.add(int(id_col))
            except Exception:
                pass

    doc_path_by_id: dict[int, str] = {}
    if adj_ids:
        qdocs = await db.execute(select(Documento.id, Documento.path).where(Documento.id.in_(adj_ids)))
        for did, path in qdocs.all():
            if path:
                doc_path_by_id[int(did)] = str(path)

    espec_nombre_by_id: dict[int, str] = {}
    if espec_ids:
        qesp = await db.execute(select(Especialidad.ID, Especialidad.ID_COLEGIO_ESPE, Especialidad.ESPECIALIDAD).where(Especialidad.ID_COLEGIO_ESPE.in_(espec_ids)))
        for eid, id_colegio, nombre in qesp.all():
            if nombre:
                espec_nombre_by_id[int(id_colegio)] = str(nombre)

    especialidades = []
    for it in espec_list:
        id_col = it.get("id_colegio")
        n_res = it.get("n_resolucion")
        f_res = it.get("fecha_resolucion")
        adj = it.get("adjunto")

        adj_url: str | None = None
        if adj is not None:
            s = str(adj).strip()
            if s.isdigit():
                did = int(s)
                adj_url = norm_path(doc_path_by_id.get(did))
            else:
                if s.startswith("/") or s.startswith("uploads/") or s.startswith("http"):
                    adj_url = norm_path(s)

        espec_nombre = None
        try:
            espec_nombre = espec_nombre_by_id.get(int(id_col)) if id_col is not None else None
        except Exception:
            espec_nombre = None

        if id_col is not None and espec_nombre:
            id_colegio_label = f"{id_col} - {espec_nombre}"
        elif id_col is not None:
            id_colegio_label = f"{id_col}"
        else:
            id_colegio_label = None

        especialidades.append({
            "id_colegio": id_col,
            "n_resolucion": n_res,
            "fecha_resolucion": f_res,
            "adjunto": (str(adj) if adj is not None else None),
            "adjunto_url": adj_url,
            "especialidad_nombre": espec_nombre,
            "id_colegio_label": id_colegio_label,
        })

    d["especialidades"] = especialidades
    d.pop("conceps_espec", None)

    return d
```

