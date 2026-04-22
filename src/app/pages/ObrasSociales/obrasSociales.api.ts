import { http } from "../../lib/http";
import { getJSON, postJSON, patchJSON, delJSON, postForm } from "../../lib/http";
import type {
  ObraSocial,
  ObraSocialListItem,
  ObraSocialFormData,
  ObraSocialRef,
} from "./obrasSociales.types";

// ─── Payload builder for create/update ────────────────────────────────────────

function buildPayload(form: ObraSocialFormData) {
  const plazo =
    form.plazo_vencimiento === "otro"
      ? Number(form.plazo_custom)
      : form.plazo_vencimiento
      ? Number(form.plazo_vencimiento)
      : null;

  const contactos = [
    ...form.emails
      .filter((e) => e.valor.trim())
      .map((e) => ({ tipo: "email" as const, valor: e.valor.trim(), etiqueta: e.etiqueta.trim() || null })),
    ...form.telefonos
      .filter((t) => t.valor.trim())
      .map((t) => ({ tipo: "telefono" as const, valor: t.valor.trim(), etiqueta: t.etiqueta.trim() || null })),
  ];

  const hasAddress =
    form.df_direccion.trim() ||
    form.df_provincia.trim() ||
    form.df_localidad.trim() ||
    form.df_codigo_postal.trim() ||
    form.df_horario.trim();

  const direcciones = hasAddress
    ? [
        {
          provincia:
            form.df_tipo === "corrientes_capital"
              ? "Corrientes"
              : form.df_provincia.trim() || null,
          localidad:
            form.df_tipo === "corrientes_capital"
              ? "Corrientes Capital"
              : form.df_localidad.trim() || null,
          direccion: form.df_direccion.trim() || null,
          codigo_postal:
            form.df_tipo === "corrientes_capital"
              ? "3400"
              : form.df_codigo_postal.trim() || null,
          horario: form.df_horario.trim() || null,
        },
      ]
    : [];

  return {
    nro_obra_social: Number(form.nro_obra_social),
    nombre: form.nombre.trim(),
    cuit: form.cuit.trim() || null,
    direccion_real: form.direccion_real.trim() || null,
    condicion_iva: form.condicion_iva || null,
    plazo_vencimiento: plazo,
    fecha_alta_convenio: form.fecha_alta_convenio || null,
    obra_social_principal_id: form.obra_social_principal_id
      ? Number(form.obra_social_principal_id)
      : null,
    contactos,
    direcciones,
  };
}

// ─── List ─────────────────────────────────────────────────────────────────────
// Uses the existing legacy endpoint which returns uppercase fields.
// CRUD operations (detail/create/update/delete) use the same base: /api/obras_social/

function normalizeListItem(raw: any, i: number): ObraSocialListItem | null {
  const nro =
    raw?.nro_obra_social ?? raw?.NRO_OBRA_SOCIAL ?? raw?.NRO_OBRASOCIAL ?? null;
  const nombre = String(
    raw?.nombre ?? raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? ""
  ).trim();
  if (!nombre) return null;

  const nroNum = Number(nro);
  const id = Number.isFinite(nroNum) && nroNum > 0 ? nroNum : i + 1;

  const condicionIva: ObraSocialListItem["condicion_iva"] =
    raw?.condicion_iva === "responsable_inscripto" || raw?.TIPO_FACT === "A"
      ? "responsable_inscripto"
      : raw?.condicion_iva === "exento" || raw?.TIPO_FACT === "B"
      ? "exento"
      : null;

  const emailVal = raw?.emails?.[0]?.valor ?? raw?.EMAIL ?? raw?.email_principal ?? "";
  const telVal = raw?.telefonos?.[0]?.valor ?? raw?.TELEFONO ?? raw?.telefono_contacto ?? "";

  return {
    id: raw.id ?? id,
    nro_obra_social: nroNum > 0 ? nroNum : id,
    nombre,
    denominacion: raw.denominacion ?? `${id} — ${nombre}`,
    condicion_iva: condicionIva,
    marca: raw.marca ?? raw.MARCA ?? null,
    ver_valor: raw.ver_valor ?? raw.VER_VALOR ?? null,
    cuit: raw.cuit ?? raw.CUIT ?? null,
    direccion_real: raw.direccion_real ?? raw.DIRECCION ?? null,
    plazo_vencimiento: raw.plazo_vencimiento != null
      ? Number(raw.plazo_vencimiento)
      : raw.PLAZO_VENCIMIENTO != null
      ? Number(raw.PLAZO_VENCIMIENTO)
      : null,
    emails: raw.emails ?? (emailVal ? [{ valor: emailVal, etiqueta: "" }] : []),
    telefonos: raw.telefonos ?? (telVal ? [{ valor: telVal, etiqueta: "" }] : []),
    fecha_alta_convenio: raw.fecha_alta_convenio ?? raw.FECHA_ALTA ?? null,
    updated_at: raw.updated_at ?? null,
  };
}

export async function listObrasSociales(q?: string): Promise<ObraSocialListItem[]> {
  const { data } = await http.get("/api/obras_social/", { timeout: 20_000 });

  const arr: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray((data as any)?.results)
    ? (data as any).results
    : [];

  const items: ObraSocialListItem[] = arr
    .map((raw, i) => normalizeListItem(raw, i))
    .filter((x): x is ObraSocialListItem => x !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  if (!q) return items;
  const term = q.trim().toLowerCase();
  return items.filter(
    (it) =>
      it.nombre.toLowerCase().includes(term) ||
      String(it.nro_obra_social).includes(term)
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export const getObraSocial = (id: number) =>
  getJSON<ObraSocial>(`/api/obras_social/${id}`);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createObraSocial = (form: ObraSocialFormData) =>
  postJSON<ObraSocial>("/api/obras_social/", buildPayload(form));

export const updateObraSocial = (id: number, form: ObraSocialFormData) =>
  patchJSON<ObraSocial>(`/api/obras_social/${id}`, buildPayload(form));

export const deleteObraSocial = (id: number) =>
  delJSON<void>(`/api/obras_social/${id}`);

// ─── Autocomplete ─────────────────────────────────────────────────────────────

export async function searchObrasSociales(
  q: string,
  excludeId?: number
): Promise<ObraSocialRef[]> {
  const all = await listObrasSociales(q);
  return all
    .filter((it) => it.id !== excludeId)
    .slice(0, 20)
    .map((it) => ({
      id: it.id,
      nro_obra_social: it.nro_obra_social,
      nombre: it.nombre,
      denominacion: it.denominacion,
    }));
}

// ─── Documents ────────────────────────────────────────────────────────────────

export const uploadDocumento = (
  obraId: number,
  tipo: string,
  file: File,
  nombreCustom?: string
) => {
  const fd = new FormData();
  fd.append("tipo", tipo);
  fd.append("archivo", file);
  if (nombreCustom) fd.append("nombre_custom", nombreCustom);
  return postForm<{ id: number; tipo: string; nombre_custom: string | null; url: string; created_at: string }>(
    `/api/obras_social/${obraId}/documentos`,
    fd
  );
};

export const deleteDocumento = (obraId: number, docId: number) =>
  delJSON<void>(`/api/obras_social/${obraId}/documentos/${docId}`);

// ─── Link / unlink asociada ───────────────────────────────────────────────────
// Asociadas are read-only on the parent. To associate child → parent:
//   PATCH /api/obras_social/{child_id}  { obra_social_principal_id: parent_id }
// To remove:
//   PATCH /api/obras_social/{child_id}  { obra_social_principal_id: null }

export const setObraSocialPrincipal = (childId: number, principalId: number | null) =>
  patchJSON<void>(`/api/obras_social/${childId}`, { obra_social_principal_id: principalId });
