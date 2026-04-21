import logo from "../../assets/logoCMC.png";

export const CMC_NAME = "Colegio Médico de Corrientes";
export const CMC_PHONE = String(
  (import.meta as any).env?.VITE_CMC_PHONE ?? "(0379) 4252323"
);
export const CMC_EMAIL = String(
  (import.meta as any).env?.VITE_CMC_EMAIL ??
    "padronescolegiomedico@gmail.com"
);
export const CMC_LOGO_SRC =
  String((import.meta as any).env?.VITE_CMC_LOGO_URL || "") || logo;

/**
 * Fetches an image URL and returns a data URL string.
 * Returns null on failure so callers can degrade gracefully.
 */
export async function fetchAsDataUrl(src: string): Promise<string | null> {
  try {
    if (!src) return null;
    if (src.startsWith("data:image/")) return src;
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function getImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const lower = dataUrl.toLowerCase();
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg"))
    return "JPEG";
  if (lower.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}
