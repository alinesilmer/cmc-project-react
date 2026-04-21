// ─── Entity ───────────────────────────────────────────────────────────────────

export interface Especialidad {
  id: number;
  id_colegio_espe: number;
  nombre: string;
}

// ─── API payload ──────────────────────────────────────────────────────────────

/** Sent on POST and PATCH — ID is server-assigned and never editable */
export interface EspecialidadPayload {
  id_colegio_espe: number;
  nombre: string;
}

// ─── Form (all strings while editing) ────────────────────────────────────────

export interface EspecialidadFormData {
  id_colegio_espe: string;
  nombre: string;
}

export const EMPTY_ESPECIALIDAD_FORM: EspecialidadFormData = {
  id_colegio_espe: "",
  nombre: "",
};

// ─── Validation ───────────────────────────────────────────────────────────────

export type EspecialidadFormErrors = Partial<Record<keyof EspecialidadFormData, string>>;

export function validateEspecialidadForm(
  data: EspecialidadFormData
): EspecialidadFormErrors {
  const errors: EspecialidadFormErrors = {};

  if (!data.nombre.trim())
    errors.nombre = "El nombre es obligatorio.";

  const idRaw = data.id_colegio_espe.trim();
  if (!idRaw) {
    errors.id_colegio_espe = "El ID Colegio es obligatorio.";
  } else if (!/^\d+$/.test(idRaw) || Number(idRaw) <= 0) {
    errors.id_colegio_espe = "Debe ser un número entero positivo.";
  }

  return errors;
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

export function formToPayload(data: EspecialidadFormData): EspecialidadPayload {
  return {
    id_colegio_espe: Number(data.id_colegio_espe.trim()),
    nombre: data.nombre.trim().toUpperCase(),
  };
}

export function especialidadToForm(item: Especialidad): EspecialidadFormData {
  return {
    id_colegio_espe: String(item.id_colegio_espe),
    nombre: item.nombre,
  };
}
