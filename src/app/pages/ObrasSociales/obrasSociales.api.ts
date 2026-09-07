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
    // Sólo dígitos: la base guarda el CUIT crudo (columna legacy
    // `varchar(11)`), y mandar los guiones que agrega el input de una
    // obra social a otra rompía esa longitud. Ver auditoría O-12.
    cuit: form.cuit.replace(/\D/g, "") || null,
    direccion_real: form.direccion_real.trim() || null,
    condicion_iva: form.condicion_iva || null,
    plazo_vencimiento: plazo,
    fecha_alta_convenio: form.fecha_alta_convenio || null,
    obra_social_principal_id: form.obra_social_principal_id
      ? Number(form.obra_social_principal_id)
      : null,
    // Operación: sin esto una obra social nueva quedaba deshabilitada para el
    // padrón por el default del backend (ver auditoría O-02).
    marca: form.marca,
    ver_valor: form.ver_valor,
    dia_corte: Number(form.dia_corte) || 20,
    contactos,
    direcciones,
  };
}

// ─── List ─────────────────────────────────────────────────────────────────────
// CRUD operations (detail/create/update/delete) use the same base: /api/obras_social/

function normalizeListItem(raw: ObraSocial): ObraSocialListItem {
  return {
    id: raw.id,
    nro_obra_social: raw.nro_obra_social,
    nombre: raw.nombre,
    denominacion: raw.denominacion,
    condicion_iva: raw.condicion_iva ?? null,
    marca: raw.marca ?? null,
    ver_valor: raw.ver_valor ?? null,
    cuit: raw.cuit ?? null,
    direccion_real: raw.direccion_real ?? null,
    plazo_vencimiento: raw.plazo_vencimiento ?? null,
    emails: raw.emails ?? [],
    telefonos: raw.telefonos ?? [],
    fecha_alta_convenio: raw.fecha_alta_convenio ?? null,
    updated_at: raw.updated_at ?? null,
  };
}

export async function listObrasSociales(
  q?: string,
  incluirInactivas?: boolean
): Promise<ObraSocialListItem[]> {
  const { data } = await http.get<ObraSocial[]>("/api/obras_social/", {
    timeout: 20_000,
    // Por default el backend oculta las dadas de baja (MARCA='N'). Un deep
    // link que busca por número puntual —p.ej. desde O.S. Actualizadas—
    // necesita poder traerlas de vuelta. Ver auditoría A-05.
    params: incluirInactivas ? { incluir_inactivas: true } : undefined,
  });

  // El backend ya devuelve orden alfabético ascendente (ver auditoría O-15):
  // no hace falta reordenar acá.
  const items = data.map(normalizeListItem);

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
