import { getJSON } from "@/app/shared/lib/http";
import type { Parametros } from "@/app/shared/lib/http";

export type DoctorRow = {
  id: number;
  nro_socio: number;
  nombre: string;
  matricula_prov: number;
  documento: string;
};

export const listarMedicos = (params?: Parametros) => getJSON<DoctorRow[]>("/api/medicos", params);
