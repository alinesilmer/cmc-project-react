import { getJSON, http } from "../../app/lib/http"; // ajusta la ruta a tu helper http

export type PubAd = {
  id: number;
  medico_id: number;
  medico_nombre?: string | null;
  activo: boolean;
  adjunto_filename?: string | null;
  adjunto_content_type?: string | null;
  adjunto_size?: number | null;
  adjunto_path?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DoctorLite = {
  id: number;
  nombre: string;
  nro_socio?: string | number | null;
  matricula_prov?: string | null;
  matricula_nac?: string | null;
  documento?: string | null;
};

export async function listAds(params?: {
  q?: string;
  activo?: boolean;
  medico_id?: number;
}) {
  return await getJSON<PubAd[]>("/api/publicidad-medicos/", params);
}

export async function searchDoctors(q: string) {
  return await getJSON<DoctorLite[]>("/api/publicidad-medicos/medicos/buscar", {
    q,
  });
}

export async function createAd(
  fields: { medico_id: number; activo?: boolean },
  file: File
) {
  const fd = new FormData();
  fd.append("medico_id", String(fields.medico_id));
  fd.append("activo", String(fields.activo ?? true));
  fd.append("adjunto", file);
  const { data } = await http.post("/api/publicidad-medicos/", fd);
  return data as PubAd;
}

export async function updateAd(
  id: number,
  fields?: Partial<{
    medico_id: number;
    activo: boolean;
    limpiar_adjunto: boolean;
  }>,
  file?: File | null
) {
  const fd = new FormData();
  if (typeof fields?.medico_id !== "undefined")
    fd.append("medico_id", String(fields.medico_id));
  if (typeof fields?.activo !== "undefined")
    fd.append("activo", String(!!fields.activo));
  if (fields?.limpiar_adjunto) fd.append("limpiar_adjunto", "true");
  if (file) fd.append("adjunto", file);
  const { data } = await http.put(`/api/publicidad-medicos/${id}`, fd);
  return data as PubAd;
}

export async function removeAd(id: number) {
  const { data } = await http.delete(`/api/publicidad-medicos/${id}`);
  return data as { ok: boolean; deleted_id: number };
}
