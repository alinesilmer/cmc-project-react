// Cómo se muestra un concepto (descuento/deducción) en todo el sistema: «<nro> <nombre>», por ejemplo «300 AFIP».
// El número es el del Colegio (`conceptos.nro_colegio`), NO el id de la tabla.

/** Concepto 400: en el sistema anterior la cuota societaria iba junto con la casa quinta, y así la ve el Colegio. */
const NRO_CUOTA_SOCIETARIA = 400;
const NOMBRE_CUOTA_SOCIETARIA = "Cuota societaria y casa quinta";

type NroConcepto = number | string | null | undefined;

/** El número del Colegio como número, o null si no hay (vacío, 0 o no numérico). */
export const nroConcepto = (nro: NroConcepto): number | null => {
  const n = Number(nro);
  return nro != null && String(nro).trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

/** El nombre tal como se muestra (sin el número). */
export const nombreConcepto = (nro: NroConcepto, nombre: string | null | undefined): string =>
  nroConcepto(nro) === NRO_CUOTA_SOCIETARIA ? NOMBRE_CUOTA_SOCIETARIA : (nombre ?? "").trim();

/** «300 AFIP». Sin número (conceptos manuales, datos viejos) queda sólo el nombre. */
export const etiquetaConcepto = (nro: NroConcepto, nombre: string | null | undefined): string => {
  const n = nroConcepto(nro);
  const texto = nombreConcepto(nro, nombre);
  return n == null ? texto : `${n} ${texto}`.trim();
};

/** Para `sort`: por número ascendente; los que no tienen número van al final. */
export const compararPorNroConcepto = (a: NroConcepto, b: NroConcepto): number =>
  (nroConcepto(a) ?? Number.MAX_SAFE_INTEGER) - (nroConcepto(b) ?? Number.MAX_SAFE_INTEGER);

/** Opción de un select de conceptos (`AppSearchSelect` con `ordenar` y `ordenPorCodigo`): «300 AFIP», ordenada por número. */
export const opcionDeConcepto = (c: { id: number | string; nro_colegio?: NroConcepto; nombre: string }) => ({
  id: c.id,
  label: etiquetaConcepto(c.nro_colegio, c.nombre),
  codigo: nroConcepto(c.nro_colegio) ?? undefined,
});
