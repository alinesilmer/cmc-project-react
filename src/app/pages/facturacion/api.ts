import { getJSON, postJSON, patchJSON, delJSON, getJSONWithHeaders, postForm, getBlobLong, http } from "@/app/shared/lib/http";
import type {
  AutorizacionExistente,
  MedicoOption, ObraSocialOption, NomencladorOption, ClinicaOption,
  AfiliadoRead, PeriodoActivoResponse, PrecioResponse,
  PrestacionRead, PrestacionesCreate, PrestacionesComplementariaCreate, GuardadoResponse,
  PrestacionUpdate, MoverPeriodoPayload, MoverPeriodoResponse,
  CierrePreviewResponse, CierreResponse, CierrePayload, ListarPrestacionesParams,
  FacturaRead, ListarFacturasParams, FacturaDetalleResponse, ComplementoCreate,
  ViaPractica, PrestacionFicha,
  CargaPorUsuario, CierresPorUsuario, RegistroPorUsuarioParams, PublicarPeriodoPayload, PublicarPeriodoResponse,
  PeriodoPropio,
  RecalculoPayload, RecalculoResponse,
  DocumentoPrestacion,
} from "./types";
import type { ExportOpciones } from "./FacturaDetalle/export/types";
import type { VistaOpciones, VistaPreset } from "./FacturaDetalle/vista/types";

const BASE = "/api/facturacion";

// Traza de llamadas solo en desarrollo; los errores se registran siempre.
const log = (label: string, params: unknown, data: unknown) => {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed(`%c[facturacion] ${label}`, "color:#0c2a52;font-weight:600");
  console.log("params →", params);
  console.log("response →", data);
  console.groupEnd();
};

const logError = (label: string, params: unknown, err: unknown) => {
  console.groupCollapsed(`%c[facturacion] ${label} (error)`, "color:#cc2a2a;font-weight:600");
  console.log("params →", params);
  console.error("error →", err);
  console.groupEnd();
};

async function traced<T>(label: string, params: unknown, promise: Promise<T>): Promise<T> {
  try {
    const data = await promise;
    log(label, params, data);
    return data;
  } catch (err) {
    logError(label, params, err);
    throw err;
  }
}

export const fetchMedicos = (q: string, limit = 20) =>
  traced("GET /medicos", { q, limit }, getJSON<MedicoOption[]>(`${BASE}/medicos`, { q, limit }));

// Precarga completa para el formulario de Carga de Facturación (ver CargaFacturacion.tsx).
export const fetchMedicosTodos = () =>
  traced("GET /medicos/todos", {}, getJSON<MedicoOption[]>(`${BASE}/medicos/todos`));

/** Buscador para ELEGIR una obra social: solo trae las activas. */
export const fetchObrasSociales = (q: string, limit = 20) =>
  traced("GET /obras-sociales", { q, limit }, getJSON<ObraSocialOption[]>(`${BASE}/obras-sociales`, { q, limit }));

/** Resolver el nombre de una obra social de algo YA cargado: incluye las desactivadas. */
export const fetchObraSocialPorCodigo = (cod: string) =>
  traced(
    "GET /obras-sociales (incl. inactivas)",
    { q: cod },
    getJSON<ObraSocialOption[]>(`${BASE}/obras-sociales`, { q: cod, limit: 20, solo_activas: false }),
  );

export const fetchObrasSocialesTodas = () =>
  traced("GET /obras-sociales/todas", {}, getJSON<ObraSocialOption[]>(`${BASE}/obras-sociales/todas`));

export const fetchClinicas = (q: string, limit = 20) =>
  traced("GET /clinicas", { q, limit }, getJSON<ClinicaOption[]>(`${BASE}/clinicas`, { q, limit }));

export const fetchClinicasTodas = () =>
  traced("GET /clinicas/todas", {}, getJSON<ClinicaOption[]>(`${BASE}/clinicas/todas`));

export const crearClinica = (body: { nombre: string }) =>
  traced("POST /clinicas", body, postJSON<ClinicaOption>(`${BASE}/clinicas`, body));

/** Lápiz de la carga: por ahora, el nombre. */
export const actualizarClinica = (cod: number, body: { nombre: string }) =>
  traced("PATCH /clinicas", { cod, ...body }, patchJSON<ClinicaOption>(`${BASE}/clinicas/${cod}`, body));

export const eliminarClinica = (cod: number) =>
  traced("DELETE /clinicas", { cod }, delJSON<void>(`${BASE}/clinicas/${cod}`));

export const fetchCodigosHabilitados = (nroSocio: string, q?: string, codObra?: string | null) =>
  traced(
    `GET /medico/${nroSocio}/codigos-habilitados`,
    { nroSocio, q, codObra },
    getJSON<NomencladorOption[]>(`${BASE}/medico/${nroSocio}/codigos-habilitados`, {
      ...(q ? { q } : {}),
      ...(codObra ? { cod_obra: codObra } : {}),
    }),
  );

export const fetchAfiliados = (q: string, limit = 20) =>
  traced("GET /afiliados (búsqueda)", { q, limit }, getJSON<AfiliadoRead[]>(`${BASE}/afiliados`, { q, limit }));

/** Al menos uno de los dos: un afiliado puede tener sólo nombre o sólo número. */
export type AfiliadoBody = { dni: string | null; nombre: string | null };

export const crearAfiliado = (body: AfiliadoBody) =>
  traced("POST /afiliados", body, postJSON<AfiliadoRead>(`${BASE}/afiliados`, body));

/** Lápiz de la carga. Corrige también sus prestaciones de facturas abiertas. */
export const actualizarAfiliado = (id: number, body: AfiliadoBody) =>
  traced("PATCH /afiliados-id", { id, ...body }, patchJSON<AfiliadoRead>(`${BASE}/afiliados-id/${id}`, body));

/** Por id (sirve también para los que no tienen número). 409 si tiene prestaciones. */
export const eliminarAfiliadoPorId = (id: number) =>
  traced("DELETE /afiliados-id", { id }, delJSON<void>(`${BASE}/afiliados-id/${id}`));

/** El afiliado de un número (para saber su id al editar una prestación). */
export const fetchAfiliado = (dni: string) =>
  getJSON<AfiliadoRead>(`${BASE}/afiliados/${encodeURIComponent(dni)}`);

export const fetchPeriodoActivo = (cod_obra: string) =>
  traced("GET /periodo-activo", { cod_obra }, getJSON<PeriodoActivoResponse>(`${BASE}/periodo-activo`, { cod_obra }));

export const fetchAutorizacionExistente = (cod_obra: string, autorizacion: string, excluir_id?: number) =>
  getJSON<AutorizacionExistente[]>(`${BASE}/autorizaciones/existentes`, { cod_obra, autorizacion, excluir_id });

export const fetchPrecio = (
  cod_medico: string, cod_obra: string, codigo: string, fecha?: string, via?: ViaPractica,
) =>
  traced(
    "GET /nomenclador/precio",
    { cod_medico, cod_obra, codigo, fecha, via },
    getJSON<PrecioResponse>(`${BASE}/nomenclador/precio`, { cod_medico, cod_obra, codigo, fecha, via }),
  );

export const listarPrestaciones = (filtros: ListarPrestacionesParams) =>
  traced(
    "GET /prestaciones (paginado)",
    filtros,
    getJSONWithHeaders<PrestacionRead[]>(`${BASE}/prestaciones`, filtros),
  );

export const listarPeriodosPropios = () =>
  traced("GET /periodos-propios", {}, getJSON<PeriodoPropio[]>(`${BASE}/periodos-propios`));

export const listarFacturas = (filtros: ListarFacturasParams) =>
  traced(
    "GET /facturas (paginado)",
    filtros,
    getJSONWithHeaders<FacturaRead[]>(`${BASE}/facturas`, filtros),
  );

export const crearComplemento = (payload: ComplementoCreate) =>
  traced(
    "POST /facturas/complemento",
    payload,
    postJSON<FacturaRead>(`${BASE}/facturas/complemento`, payload),
  );

export const fetchFacturaDetalle = (id: number | string) =>
  traced(
    `GET /facturas/${id}/detalle`,
    { id },
    getJSON<FacturaDetalleResponse>(`${BASE}/facturas/${id}/detalle`),
  );

export const fetchPrestacion = (id: number | string) =>
  traced(`GET /prestaciones/${id}`, { id }, getJSON<PrestacionRead>(`${BASE}/prestaciones/${id}`));

// Ficha completa (pantalla de consulta): registro sin recortes + códigos resueltos a nombre.
export const fetchPrestacionFicha = (id: number | string) =>
  traced(
    `GET /prestaciones/${id}/ficha`,
    { id },
    getJSON<PrestacionFicha>(`${BASE}/prestaciones/${id}/ficha`),
  );

export const marcarRevisado = (payload: { marcados?: number[]; desmarcados?: number[] }) =>
  traced(
    "PATCH /prestaciones/revisado",
    payload,
    patchJSON<PrestacionRead[]>(`${BASE}/prestaciones/revisado`, payload),
  );

export const publicarPeriodo = (payload: PublicarPeriodoPayload) =>
  traced(
    "PATCH /facturas/publicado",
    payload,
    patchJSON<PublicarPeriodoResponse>(`${BASE}/facturas/publicado`, payload),
  );

export const crearPrestaciones = (payload: PrestacionesCreate, confirmar_duplicado = false) =>
  traced(
    `POST /prestaciones${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
    payload,
    postJSON<GuardadoResponse>(
      `${BASE}/prestaciones${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
      payload,
    ),
  );

export const crearPrestacionesComplementaria = (
  payload: PrestacionesComplementariaCreate,
  confirmar_duplicado = false,
) =>
  traced(
    `POST /prestaciones-complementaria${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
    payload,
    postJSON<GuardadoResponse>(
      `${BASE}/prestaciones-complementaria${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
      payload,
    ),
  );

export const editarPrestacion = (id: number, payload: PrestacionUpdate) =>
  traced(
    `PATCH /prestaciones/${id}`,
    payload,
    patchJSON<PrestacionRead>(`${BASE}/prestaciones/${id}`, payload),
  );

/** `conEquipo`: si la fila es la cabecera de un equipo, anula también a sus integrantes. */
export const anularPrestacion = (id: number, opts?: { conEquipo?: boolean }) =>
  traced(
    `DELETE /prestaciones/${id}`,
    { id, ...opts },
    delJSON<void>(`${BASE}/prestaciones/${id}`, opts?.conEquipo ? { params: { con_equipo: true } } : undefined),
  );

export const moverPeriodo = (payload: MoverPeriodoPayload) =>
  traced(
    "POST /prestaciones/mover-periodo",
    payload,
    postJSON<MoverPeriodoResponse>(`${BASE}/prestaciones/mover-periodo`, payload),
  );

/** Recotiza con el precio vigente las prestaciones automáticas de una factura abierta. */
export const recalcularPrecios = (payload: RecalculoPayload) =>
  traced(
    "POST /recalcular-precios",
    payload,
    postJSON<RecalculoResponse>(`${BASE}/recalcular-precios`, payload, { timeout: 180_000 }),
  );

export const previewCierre = (cod_obra: string, periodo: string) =>
  traced(
    "GET /cierre/preview",
    { cod_obra, periodo },
    getJSON<CierrePreviewResponse>(`${BASE}/cierre/preview`, { cod_obra, periodo }),
  );

// ── Documentación digital de una prestación (el Colegio) ─────────────────────
export const listarDocumentosPrestacion = (id: number) =>
  getJSON<DocumentoPrestacion[]>(`${BASE}/prestaciones/${id}/documentos`);

export const agregarDocumentosPrestacion = (id: number, archivos: File[]) => {
  const form = new FormData();
  archivos.forEach((f) => form.append("documentos", f));
  return postForm<DocumentoPrestacion[]>(`${BASE}/prestaciones/${id}/documentos`, form, { timeout: 120_000 });
};

export const reemplazarDocumentoPrestacion = async (id: number, docId: number, archivo: File) => {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await http.put<DocumentoPrestacion[]>(`${BASE}/prestaciones/${id}/documentos/${docId}`, form);
  return data;
};

export const eliminarDocumentoPrestacion = async (id: number, docId: number) => {
  const { data } = await http.delete<DocumentoPrestacion[]>(`${BASE}/prestaciones/${id}/documentos/${docId}`);
  return data;
};

export const reordenarDocumentosPrestacion = (id: number, ids: number[]) =>
  patchJSON<DocumentoPrestacion[]>(`${BASE}/prestaciones/${id}/documentos/orden`, { ids });

/** PDF con la documentación de toda la factura (los médicos de la A a la Z). 409 si hay pendientes. */
export const descargarDocumentacionPdf = (facturaId: number | string, opciones: ExportOpciones) =>
  traced(
    `GET /facturas/${facturaId}/export/documentacion.pdf`,
    opciones,
    getBlobLong(`${BASE}/facturas/${facturaId}/export/documentacion.pdf`, opciones),
  );

// ── Export (detalle + carátula) ──────────────────────────────────────────────
// GET, no POST: es el patrón que ya usa el resto de la API para "exportar con filtros" (`/api/deducciones/export`.
export const descargarExportDetalle = (
  facturaId: number | string, formato: "pdf" | "xlsx", opciones: ExportOpciones,
) =>
  traced(
    `GET /facturas/${facturaId}/export/detalle.${formato}`,
    opciones,
    getBlobLong(`${BASE}/facturas/${facturaId}/export/detalle.${formato}`, opciones),
  );

export const descargarExportCaratula = (facturaId: number | string, formato: "pdf" | "xlsx") =>
  traced(
    `GET /facturas/${facturaId}/export/caratula.${formato}`,
    { facturaId },
    getBlobLong(`${BASE}/facturas/${facturaId}/export/caratula.${formato}`),
  );

// TXT de facturación de UNNE (obra social 81). `tipo`/`nro_factura` solo hacen falta si la
// factura todavía no está numerada.
export const descargarTxtUnne = (
  facturaId: number | string, params: { tipo?: string; nro_factura?: string } = {},
) =>
  traced(
    `GET /facturas/${facturaId}/export/unne.txt`,
    { facturaId, ...params },
    getBlobLong(`${BASE}/facturas/${facturaId}/export/unne.txt`, params),
  );

// Plano de Boreal (obra social 285) en Excel.
export const descargarPlanoBoreal = (facturaId: number | string) =>
  traced(
    `GET /facturas/${facturaId}/export/boreal.xlsx`,
    { facturaId },
    getBlobLong(`${BASE}/facturas/${facturaId}/export/boreal.xlsx`),
  );

// Plano de OMINT (obra social 243) en Excel.
export const descargarPlanoOmint = (facturaId: number | string) =>
  traced(
    `GET /facturas/${facturaId}/export/omint.xlsx`,
    { facturaId },
    getBlobLong(`${BASE}/facturas/${facturaId}/export/omint.xlsx`),
  );

// TXT de prestaciones de DASUTEN - UTN (obra social 137).
export const descargarTxtDasuten = (facturaId: number | string) =>
  traced(
    `GET /facturas/${facturaId}/export/dasuten.txt`,
    { facturaId },
    getBlobLong(`${BASE}/facturas/${facturaId}/export/dasuten.txt`),
  );

// Detalle por médico: cruza todas las obras sociales del socio en un período.
export const descargarExportPorMedico = (
  nroSocio: number | string, periodo: string, formato: "pdf" | "xlsx",
) =>
  traced(
    `GET /medico/${nroSocio}/export/detalle.${formato}`,
    { nroSocio, periodo },
    getBlobLong(`${BASE}/medico/${nroSocio}/export/detalle.${formato}`, { periodo }),
  );

// Presets de la VISTA del listado (el exportable sale como se ve, así que se guardan por vista).
export const listarVistaPresets = () =>
  traced(
    "GET /export-presets",
    { tipo_documento: "vista" },
    getJSON<VistaPreset[]>(`${BASE}/export-presets`, { tipo_documento: "vista" }),
  );

export const crearVistaPreset = (nombre: string, opciones: VistaOpciones) =>
  traced(
    "POST /export-presets",
    { nombre },
    postJSON<VistaPreset>(`${BASE}/export-presets`, { nombre, tipo_documento: "vista", opciones }),
  );

export const eliminarVistaPreset = (id: number) =>
  traced("DELETE /export-presets", { id }, delJSON<void>(`${BASE}/export-presets/${id}`));

// ── Registro de facturación (auditoría administrativa, scope facturacion:registro) ──
export const listarCargaPorUsuario = (filtros: RegistroPorUsuarioParams) =>
  traced(
    "GET /registro/carga-por-usuario",
    filtros,
    getJSON<CargaPorUsuario[]>(`${BASE}/registro/carga-por-usuario`, filtros),
  );

export const listarCierresPorUsuario = (filtros: RegistroPorUsuarioParams) =>
  traced(
    "GET /registro/cierres-por-usuario",
    filtros,
    getJSON<CierresPorUsuario[]>(`${BASE}/registro/cierres-por-usuario`, filtros),
  );

export const cerrarPeriodo = (payload: CierrePayload) => {
  const form = new FormData();
  form.append("cod_obra", payload.cod_obra);
  form.append("periodo", payload.periodo);
  if (payload.tipo_factura) form.append("tipo_factura", payload.tipo_factura);
  if (payload.nro_factura) form.append("nro_factura", payload.nro_factura);
  if (payload.archivo) form.append("archivo", payload.archivo);

  return traced(
    "POST /cierre",
    { cod_obra: payload.cod_obra, periodo: payload.periodo, tipo_factura: payload.tipo_factura, nro_factura: payload.nro_factura, archivo: payload.archivo?.name },
    postForm<CierreResponse>(`${BASE}/cierre`, form),
  );
};

