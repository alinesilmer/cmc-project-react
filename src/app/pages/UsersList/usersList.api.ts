import { getJSON } from "@/app/shared/lib/http";
import type { Parametros } from "@/app/shared/lib/http";

/** Una ficha de socio como llega de la API: se lee por claves, con las variantes de mayúsculas del padrón. */
export type MedicoRow = Record<string, unknown>;

export const listarSocios = (params: Parametros) => getJSON<MedicoRow[]>("/api/medicos/all", params);
