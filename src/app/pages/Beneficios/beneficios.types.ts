// ─── Entity ───────────────────────────────────────────────────────────────────

export interface Beneficio {
  id: number;
  titulo: string;
  descripcion: string;
  descuento: string | null;
  categoria: string;
  color: string | null; // hex "#RRGGBB" — acento de la tarjeta en la app
  ubicacion: string | null;
  vigencia_hasta: string | null; // ISO date (YYYY-MM-DD)
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Paleta curada para el acento de la tarjeta. Se guarda el hex; `null` = sin
 *  color (la app usa su color por defecto). Mantener legible sobre texto claro. */
export const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Azul", value: "#2563EB" },
  { label: "Turquesa", value: "#0D9488" },
  { label: "Verde", value: "#16A34A" },
  { label: "Ámbar", value: "#F59E0B" },
  { label: "Naranja", value: "#EA580C" },
  { label: "Rojo", value: "#DC2626" },
  { label: "Violeta", value: "#7C3AED" },
  { label: "Rosa", value: "#DB2777" },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Espejo de CATEGORIAS_BENEFICIO en app/db/models/beneficios.py.
 *  El backend valida contra esa lista: si se agrega una, hay que agregarla acá
 *  (o leerla de GET /api/beneficios/categorias, que devuelve exactamente esto). */
export const CATEGORIAS_BENEFICIO = [
  "Salud",
  "Gastronomía",
  "Educación",
  "Turismo",
  "Bienestar",
  "Comercios",
  "Automotor",
  "Servicios",
] as const;

// ─── API payloads ─────────────────────────────────────────────────────────────

export interface BeneficioCreatePayload {
  titulo: string;
  descripcion: string;
  descuento: string | null;
  categoria: string;
  color: string | null;
  ubicacion: string | null;
  vigencia_hasta: string | null;
  activo: boolean;
}

/** PATCH parcial — se manda el objeto completo del form, el backend sólo aplica
 *  las claves presentes. */
export type BeneficioUpdatePayload = Partial<BeneficioCreatePayload>;

// ─── Form (todo string mientras se edita) ─────────────────────────────────────

export interface BeneficioFormData {
  titulo: string;
  descripcion: string;
  descuento: string;
  categoria: string;
  color: string; // "" = sin color
  ubicacion: string;
  vigencia_hasta: string;
  activo: boolean;
}

export const EMPTY_BENEFICIO_FORM: BeneficioFormData = {
  titulo: "",
  descripcion: "",
  descuento: "",
  categoria: "",
  color: "",
  ubicacion: "",
  vigencia_hasta: "",
  activo: true,
};

// ─── Validation ───────────────────────────────────────────────────────────────

export type BeneficioFormErrors = Partial<
  Record<keyof BeneficioFormData, string>
>;

export function validateBeneficioForm(
  data: BeneficioFormData
): BeneficioFormErrors {
  const errors: BeneficioFormErrors = {};

  if (!data.titulo.trim()) errors.titulo = "El título es obligatorio.";
  else if (data.titulo.trim().length > 160)
    errors.titulo = "Máximo 160 caracteres.";

  if (!data.descripcion.trim())
    errors.descripcion = "La descripción es obligatoria.";
  else if (data.descripcion.trim().length > 4000)
    errors.descripcion = "Máximo 4000 caracteres.";

  if (!data.categoria) errors.categoria = "Elegí una categoría.";
  else if (!CATEGORIAS_BENEFICIO.includes(data.categoria as never))
    errors.categoria = "Categoría inválida.";

  if (data.descuento.trim().length > 60)
    errors.descuento = "Máximo 60 caracteres.";
  if (data.ubicacion.trim().length > 200)
    errors.ubicacion = "Máximo 200 caracteres.";

  const vig = data.vigencia_hasta.trim();
  if (vig && !/^\d{4}-\d{2}-\d{2}$/.test(vig))
    errors.vigencia_hasta = "Fecha inválida.";

  if (data.color && !HEX_RE.test(data.color))
    errors.color = "Color inválido.";

  return errors;
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

const orNull = (v: string) => {
  const s = v.trim();
  return s ? s : null;
};

export function formToPayload(data: BeneficioFormData): BeneficioCreatePayload {
  return {
    titulo: data.titulo.trim(),
    descripcion: data.descripcion.trim(),
    descuento: orNull(data.descuento),
    categoria: data.categoria,
    color: data.color ? data.color.toUpperCase() : null,
    ubicacion: orNull(data.ubicacion),
    vigencia_hasta: orNull(data.vigencia_hasta),
    activo: data.activo,
  };
}

export function beneficioToForm(item: Beneficio): BeneficioFormData {
  return {
    titulo: item.titulo,
    descripcion: item.descripcion,
    descuento: item.descuento ?? "",
    categoria: item.categoria,
    color: item.color ?? "",
    ubicacion: item.ubicacion ?? "",
    vigencia_hasta: item.vigencia_hasta ?? "",
    activo: item.activo,
  };
}

/** DD/MM/AAAA sin construir un Date (evita el corrimiento por zona horaria). */
export function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Un beneficio activo cuya vigencia ya pasó: la app lo sigue mostrando, así
 *  que el panel lo marca para que el admin lo desactive. */
export function estaVencido(item: Beneficio): boolean {
  if (!item.vigencia_hasta) return false;
  return item.vigencia_hasta < new Date().toISOString().slice(0, 10);
}
