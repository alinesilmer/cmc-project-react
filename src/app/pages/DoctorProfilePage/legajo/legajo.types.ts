import type { DoctorProfile } from "../api";

export type DoctorProfileX = DoctorProfile & { fecha_ingreso?: string | null };

export type TabKey =
  | "datos"
  | "documentos"
  | "conceptos"
  | "especialidades"
  | "padrones"
  | "credencial"
  | "valoresPdf"
  | "reportes"
  | "permisos";

export type SeccionDatos = "personales" | "profesionales" | "impositivos";
