// website/src/lib/api.ts
const BASE = import.meta.env.VITE_API_URL_BASE ?? "http://localhost:5000";

export type ISODateString = string;

export interface Usuario { email: string; nombre: string; role: string; }
export interface Noticia {
  id: string; titulo: string; contenido: string; resumen: string;
  autor: string; publicada: boolean; fechaCreacion: ISODateString;
  fechaActualizacion: ISODateString; imagen?: string; archivo?: string;
}
export interface NoticiaCreate { titulo: string; contenido: string; resumen: string; imagen?: string; archivo?: string; publicada?: boolean; }
export interface NoticiaUpdate { titulo?: string; contenido?: string; resumen?: string; imagen?: string; archivo?: string; publicada?: boolean; }
export interface LoginResponse { token: string; user: Usuario; mensaje?: string; }
export interface VerifyResponse { valido: boolean; user?: Usuario; }

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return (await res.json()) as T;
}

const abs = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${BASE}${u}`;
  return `${BASE}/${u}`;
};

export const api = {
  login(email: string, password: string) {
    return fetchJson<LoginResponse>(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  verificarToken(token: string) {
    return fetchJson<VerifyResponse>(`${BASE}/api/auth/verificar`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  },
  obtenerNoticias() {
    return fetchJson<Noticia[]>(`${BASE}/api/noticias`, { cache: "no-store" });
  },
  obtenerNoticia(id: string) {
    return fetchJson<Noticia>(`${BASE}/api/noticias/${encodeURIComponent(id)}`, { cache: "no-store" });
  },
  crearNoticia(token: string, noticia: NoticiaCreate) {
    return fetchJson<{ mensaje: string; id: string; noticia: Noticia }>(`${BASE}/api/noticias`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(noticia),
    });
  },
  actualizarNoticia(token: string, id: string, noticia: NoticiaUpdate) {
    return fetchJson<{ mensaje: string }>(`${BASE}/api/noticias/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(noticia),
    });
  },
  eliminarNoticia(token: string, id: string) {
    return fetchJson<{ mensaje: string }>(`${BASE}/api/noticias/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async subirArchivo(token: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }
    const json = (await res.json()) as { url: string; mimetype: string; filename: string };
    return { ...json, url: abs(json.url) };
  },
};

// ---- Médicos promo ----
export type MediaType = "image" | "video";
export interface MedicoPromo {
  id: string; nombre: string; especialidad: string;
  mediaUrl?: string; mediaType?: MediaType; orden: number; activo: boolean;
  createdAt: string;
}
export type MedicoPromoCreate = Omit<MedicoPromo, "id" | "createdAt">;

export const medicosPromo = {
  async list(opts?: { all?: boolean }, token?: string): Promise<MedicoPromo[]> {
    const q = opts?.all ? "?all=1" : "";
    const r = await fetch(`${BASE}/api/medicos-promo${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!r.ok) throw new Error("Error listando médicos");
    const rows = (await r.json()) as MedicoPromo[];
    return rows.map((m) => ({ ...m, mediaUrl: abs(m.mediaUrl) }));
  },
  async create(token: string, payload: MedicoPromoCreate) {
    const r = await fetch(`${BASE}/api/medicos-promo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error creando");
    const out = await r.json();
    if (out?.item?.mediaUrl) out.item.mediaUrl = abs(out.item.mediaUrl);
    return out;
  },
  async update(token: string, id: string, payload: Partial<MedicoPromo>) {
    const r = await fetch(`${BASE}/api/medicos-promo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error actualizando");
    return r.json();
  },
  async remove(token: string, id: string) {
    const r = await fetch(`${BASE}/api/medicos-promo/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error("Error eliminando");
    return r.json();
  },
  async upload(token: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${BASE}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!r.ok) throw new Error("Error subiendo archivo");
    const json = (await r.json()) as { url: string; mimetype: string };
    return { ...json, url: abs(json.url) };
  },
};
