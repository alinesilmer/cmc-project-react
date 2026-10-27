import logo from "../../assets/logoCMC.png";
import { formatoPesos } from "@/app/shared/lib/formatos";

export const CONSULTA_COMUN_CODE = "420351";
export const SWISS_MEDICAL_CODE = "42010100";
export const SWISS_MEDICAL_NRO = 256;

export const CMC_NAME = "Colegio Médico de Corrientes";
export const CMC_PHONE = String(
  import.meta.env.VITE_CMC_PHONE ?? "(0379) 425 2323"
);
export const CMC_EMAIL = String(
  import.meta.env.VITE_CMC_EMAIL ??
    "auditoriacolegiomedico23@gmail.com"
);
export const CMC_SUBTITLE = "Sujeto a cambios por actualizaciones permanentes";
export const CMC_LOGO_SRC =
  String(import.meta.env.VITE_CMC_LOGO_URL || "") || logo;

/** Obras sociales excluded from UI, PDF, and Excel. */
export const EXCLUDED_OS = new Set([30, 377, 388, 380, 435, 216]);

export const moneyFormatter = {
  format: (value: number) => {
    const n = Number(value);
    return formatoPesos.format(Number.isFinite(n) ? n : 0);
  },
};
