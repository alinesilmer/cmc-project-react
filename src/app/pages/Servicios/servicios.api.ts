import { getJSON, patchJSON } from "@/app/shared/lib/http";

type FichaCruda = Record<string, unknown>;

/** Las organizaciones (clínicas y similares) cargadas como socio. */
export const listarOrganizaciones = () => getJSON<FichaCruda[]>("/api/medicos/all", { es_organizacion: 1, limit: 500 });

export const buscarSocios = (q: string) => getJSON<FichaCruda[]>("/api/medicos/all", { q, limit: 50 });

export const marcarOrganizacion = (id: number, esOrganizacion: number) =>
  patchJSON(`/api/medicos/${id}/organizacion`, { es_organizacion: esOrganizacion });
