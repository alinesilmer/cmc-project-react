// src/app/shared/lib/archivos.ts Abre un adjunto respetando lo que devuelve la API (§8 del doc de backend).
import { http } from "./http";
import { comoErrorApi } from "./httpErrors";

const ARCHIVOS_PREFIX = "/api/archivos/";

function mensajeDeError(status: number | undefined, detail?: string): string {
  switch (status) {
    case 403:
      return "No tenés permiso para ver este adjunto.";
    case 404:
      return "El archivo no está disponible (referencia rota).";
    case 400:
      return "Ruta de archivo inválida.";
    default:
      return detail || "No se pudo abrir el adjunto.";
  }
}

async function detalleDeBlobError(err: unknown): Promise<string | undefined> {
  const data: unknown = comoErrorApi(err).response?.data;
  if (!(data instanceof Blob)) {
    const detalle = comoErrorApi(err).response?.data?.detail;
    return typeof detalle === "string" ? detalle : undefined;
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as { detail?: unknown } | null;
    return typeof parsed?.detail === "string" ? parsed.detail : undefined;
  } catch {
    return undefined;
  }
}

export async function abrirAdjunto(ruta?: string | null): Promise<void> {
  if (!ruta) return;

  const esAbsoluta = /^https?:\/\//i.test(ruta);
  if (esAbsoluta || !ruta.startsWith(ARCHIVOS_PREFIX)) {
    window.open(ruta, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const res = await http.get(ruta, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(res.data as Blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    // El blob se entregó a otra pestaña: liberamos después de darle tiempo a cargar, en vez de al desmontar (acá no hay un componente montado).
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    const error = comoErrorApi(err);
    const status = error?.response?.status;
    const detail = await detalleDeBlobError(err);
    throw new Error(mensajeDeError(status, detail));
  }
}
