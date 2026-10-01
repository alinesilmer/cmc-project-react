// Formateo de vigencias, aparte del componente: un archivo que exporta un
// componente no puede exportar además constantes sin romper el fast refresh.

export interface VigenciaCargada {
  vigencia_desde: string;
  cantidad: number;
}

/** "2026-08-01" → "01/08/2026". */
export const vigenciaLegible = (iso: string): string => {
  const [a, m, d] = (iso || "").split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
};
