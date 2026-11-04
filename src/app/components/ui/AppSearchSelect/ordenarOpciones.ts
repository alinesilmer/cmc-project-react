import type { AppSearchSelectOption } from "./AppSearchSelect";

// Orden de las opciones de un select de búsqueda: de la A a la Z y, al buscar, por cercanía.
//
// Al buscar, primero lo que coincide completo y después lo que coincide en parte:
//   0 · el código es igual a lo tipeado   (buscar «36» trae primero al 36)
//   1 · el nombre es igual
//   2 · el código empieza así             (36, 360, 361…, del más chico al más grande)
//   3 · el nombre empieza así
//   4 · una palabra del nombre empieza así
//   5 · el nombre o el código lo contienen
// A igual cercanía, alfabético. El código es el N° de socio (en el subtítulo, «#36») o el número que
// encabeza una etiqueta como «433 - Swiss Medical». Si la opción trae `codigo` (ej. conceptos: «300 AFIP»), manda ese.

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const ETIQUETA_CON_CODIGO = /^(\d+)\s*[-–—]\s*(.*)$/;
const SUBTITULO_CODIGO = /^#?\s*(\d+)$/;

type Partes = { codigo: string | null; nombre: string };

/** El código y el nombre de una opción, ya sin tildes ni mayúsculas. */
const partesDe = (o: AppSearchSelectOption): Partes => {
  if (o.codigo != null) {
    const codigo = String(o.codigo);
    const resto = o.label.startsWith(codigo) ? o.label.slice(codigo.length).replace(/^\s*[-–—]?\s*/, "") : o.label;
    return { codigo, nombre: sinTildes(resto) };
  }
  const deSubtitulo = o.subtitle ? SUBTITULO_CODIGO.exec(o.subtitle.trim()) : null;
  const deEtiqueta = ETIQUETA_CON_CODIGO.exec(o.label);
  return {
    codigo: deSubtitulo ? deSubtitulo[1] : deEtiqueta ? deEtiqueta[1] : null,
    nombre: sinTildes(deEtiqueta ? deEtiqueta[2] : o.label),
  };
};

const alfabetico = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true });

const cercania = (p: Partes, q: string, palabras: string[]): number => {
  if (p.codigo === q) return 0;
  if (p.nombre === q) return 1;
  if (p.codigo?.startsWith(q)) return 2;
  if (p.nombre.startsWith(q)) return 3;
  if (p.nombre.includes(` ${q}`)) return 4;
  if (palabras.every((w) => p.nombre.includes(w)) || (p.codigo?.includes(q) ?? false)) return 5;
  return 6;
};

/**
 * Ordena las opciones por nombre y, si hay consulta, por cercanía.
 * `descartar`: saca las que no coinciden (listas locales). Con listas que ya filtró el servidor se deja en falso.
 * `porCodigo`: sin consulta, de menor a mayor código en vez de alfabético (conceptos: 100, 101, 102…).
 */
export function ordenarOpciones(
  opciones: AppSearchSelectOption[],
  consulta: string,
  descartar = true,
  porCodigo = false,
): AppSearchSelectOption[] {
  const q = sinTildes(consulta);
  const items = opciones.map((o) => ({ o, p: partesDe(o) }));

  if (!q) {
    return items
      .sort((a, b) => (porCodigo ? Number(a.p.codigo ?? Infinity) - Number(b.p.codigo ?? Infinity) || 0 : 0) || alfabetico(a.p.nombre, b.p.nombre))
      .map((x) => x.o);
  }

  const palabras = q.split(/\s+/).filter(Boolean);
  return items
    .map((x) => ({ ...x, t: cercania(x.p, q, palabras) }))
    .filter((x) => !descartar || x.t < 6)
    .sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t;
      if (a.t === 2) {
        const dif = Number(a.p.codigo) - Number(b.p.codigo);
        if (dif !== 0) return dif;
      }
      return alfabetico(a.p.nombre, b.p.nombre);
    })
    .map((x) => x.o);
}
