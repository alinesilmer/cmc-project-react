// Parser de planillas de galenos.
//
// A diferencia del importador de precios —una fila por código, columnas fijas—
// una planilla de galenos trae DOS formas mezcladas en la misma hoja:
//
//   1. Galenos planos: un nombre y un valor.
//        GALENO QUIRURGICO ............ $ 1.540,08
//        GASTOS QUIRURGICOS ........... $ 1.155,06
//
//   2. Galenos nivelados: un valor de unidad y una fila por nivel, donde el
//      importe de cada nivel es DERIVADO (unidad × unidades del nivel).
//        NIVEL 1    3 unidades   Sin Ayudante   $     75.000,00   (= 25.000 × 3)
//        NIVEL 10   170 unidades 2 ayudantes    $  4.250.000,00   (= 25.000 × 170)
//
// Por eso no se pide mapeo de columnas: se detecta por contenido. La posición
// de las columnas puede cambiar entre planillas y el resultado es el mismo.
//
// Del bloque nivelado se guarda `valor_unitario` + `unidades` por nivel, NO el
// importe final: es redundante y se usa sólo para verificar la cuenta y avisar
// si una fila no cierra.

import type { Cell, SheetData } from "../precios/types";

export interface NivelParseado {
  nivel: number;
  /** "Unidad quirúrgica según nivel de complejidad". */
  unidades: number;
  /** Ayudantes que admite el nivel (0 = sin ayudante). */
  ayudantes: number | null;
  /** Importe que traía la planilla; sólo para verificar. */
  importeArchivo: number | null;
  /** `false` si unidades × valor_unitario no da el importe del archivo. */
  reconcilia: boolean;
  /** Código de la planilla (ej. 080001), si lo trae. */
  codigoArchivo?: string;
}

export interface GalenoParseado {
  nombre: string;
  /** Valor de la unidad. En los planos es el importe; en los nivelados, la unidad. */
  valorUnitario: number;
  niveles: NivelParseado[];
  /** `true` cuando es un galeno plano (una sola fila, sin nivel). */
  plano: boolean;
  /** Fila de la hoja donde se detectó, para poder señalarla en el preview. */
  fila: number;
  /**
   * `false` para un bloque con niveles cuyo título no es ninguno de los
   * conocidos (adultos / infantil / ginecología). Se muestra pero no se importa
   * salvo que el usuario lo tilde a mano.
   */
  reconocido: boolean;
}

export interface ResultadoParse {
  galenos: GalenoParseado[];
  /** Avisos no bloqueantes (filas que no cierran, valores raros, etc.). */
  avisos: string[];
  /**
   * Filas con nombre e importe que NO son galenos: el nomenclador de prácticas,
   * notas al pie, mails de contacto. Se informan para que se vea que se
   * descartaron a propósito.
   */
  descartadas: { nombre: string; importe: number }[];
}

// ─── Utilidades de celda ──────────────────────────────────────────────────────

const texto = (c: Cell): string =>
  c == null ? "" : String(c).replace(/\s+/g, " ").trim();

/**
 * Convierte un importe en formato es-AR a número.
 * "$ 1.540,08" → 1540.08 · "4.250.000,00" → 4250000 · 25000 → 25000
 */
export function parseImporte(c: Cell): number | null {
  if (c == null || c === "") return null;
  if (typeof c === "number") return Number.isFinite(c) ? c : null;

  let s = String(c).trim();
  if (!s) return null;
  s = s.replace(/[$\s ]/g, "");
  if (!/[\d]/.test(s)) return null;

  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");

  if (tieneComa && tienePunto) {
    // es-AR: el punto separa miles y la coma decimales.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (tieneComa) {
    s = s.replace(",", ".");
  } else if (tienePunto) {
    // Un punto solo puede ser decimal ("1540.08") o de miles ("4.250.000").
    // Si los grupos posteriores son de 3 dígitos, es separador de miles.
    const partes = s.split(".");
    const milesPuro = partes.slice(1).every((p) => p.length === 3);
    if (partes.length > 2 || milesPuro) s = partes.join("");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Identificador, no importe: un número con cero a la izquierda es el código de
 * la fila (080001), nunca plata. Sin esto, el código se cuela como importe y
 * rompe la verificación del nivel.
 */
const esCodigo = (c: Cell): boolean => /^0\d{4,}$/.test(texto(c));

/** Entero chico y limpio (unidades, nivel). No acepta importes. */
function parseEntero(c: Cell): number | null {
  const s = texto(c);
  if (!s || !/^\d{1,4}$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "NIVEL 3" → 3 · "Nivel 10" → 10 · cualquier otra cosa → null */
function parseNivel(c: Cell): number | null {
  const m = texto(c).match(/^nivel\s*(\d{1,3})$/i);
  return m ? Number(m[1]) : null;
}

/** "Sin Ayudante" → 0 · "1 ayudante" → 1 · "2 ayudantes" → 2 */
function parseAyudantes(c: Cell): number | null {
  const s = texto(c).toLowerCase();
  if (!s) return null;
  if (/sin\s+ayudante/.test(s)) return 0;
  const m = s.match(/(\d+)\s*ayudante/);
  return m ? Number(m[1]) : null;
}

// ─── Qué es un galeno y qué no ────────────────────────────────────────────────
//
// La planilla trae, además de los galenos, TODO el nomenclador de prácticas
// (ESCLEROTERAPIA, PERIMETRIA COMPUTADA, …) y hasta líneas sueltas como un mail
// de contacto. Nada de eso es un galeno. La lista de galenos es corta y cerrada:
//
//   · valores generales → GALENO * y GASTOS * (quirúrgico, práctica,
//     radiológico, bioquímicos) + OTROS GASTOS
//   · nivelados         → cirugía de adultos, cirugía infantil y ginecología
//
// Por eso el reconocimiento es por lista blanca: lo que no matchea no se
// importa. Se cuenta aparte para poder informarlo, no para cargarlo.

/** Nombres válidos de un galeno plano (valores generales). */
const PATRONES_PLANOS: RegExp[] = [
  /^galenos?\b/i, // GALENO QUIRURGICO · GALENO PRACTICA · GALENO RADIOLOGICO
  /^gastos?\b/i, // GASTOS QUIRURGICOS · GASTOS RADIOLOGICOS · GASTOS BIOQUIMICOS
  /^otros\s+gastos\b/i, // OTROS GASTOS
];

/** Títulos válidos de un bloque nivelado. */
const PATRONES_NIVELADOS: RegExp[] = [
  /cirug[ií]as?\b.*\badulto/i,
  /cirug[ií]as?\b.*\binfantil/i,
  /ginecolog/i,
];

const esNombrePlanoValido = (s: string) => PATRONES_PLANOS.some((r) => r.test(s.trim()));

const esTituloNiveladoValido = (s: string) =>
  PATRONES_NIVELADOS.some((r) => r.test(s));

/** Filas de encabezado/relleno que no son datos. */
const ENCABEZADOS = /valores?\s+generales|nomenclador|actualizacion|nivel\b.*complejidad|valor\s+cirujano|unidad\s+quir/i;

const esEncabezado = (fila: Cell[]): boolean => {
  const s = fila.map(texto).join(" ");
  return ENCABEZADOS.test(s) && !parseNivel(fila.find((c) => parseNivel(c) != null) ?? null);
};

/**
 * Deja el título del bloque presentable: saca asteriscos de nota al pie, la
 * aclaración entre paréntesis y las columnas vacías que arrastra la fila.
 */
function limpiarTitulo(s: string): string {
  return s
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\*+/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/actualizacion\s+automatica/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200);
}

/** Nombre de un galeno plano: texto con letras, sin pinta de encabezado. */
const pareceNombre = (s: string) =>
  s.length >= 3 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(s) && !/^\$/.test(s);

// ─── Detección ────────────────────────────────────────────────────────────────

interface FilaClasificada {
  i: number;
  celdas: Cell[];
  nivel: number | null;
  unidades: number | null;
  ayudantes: number | null;
  importes: number[];
  etiqueta: string;
}

function clasificar(grid: Cell[][]): FilaClasificada[] {
  return grid.map((celdas, i) => {
    const nivel = celdas.map(parseNivel).find((n) => n != null) ?? null;
    const ayudantes = celdas.map(parseAyudantes).find((n) => n != null) ?? null;

    // Importes: todo lo que parsee como número. Se excluyen los identificadores
    // con cero a la izquierda (080001 es el código del nivel, no $80.001).
    const importes: number[] = [];
    for (const c of celdas) {
      if (esCodigo(c)) continue;
      const v = parseImporte(c);
      if (v != null && v > 0) importes.push(v);
    }

    // Unidades: entero chico que NO sea el nivel ni un importe.
    let unidades: number | null = null;
    for (const c of celdas) {
      const n = parseEntero(c);
      if (n == null || n === 0) continue;
      if (nivel != null && n === nivel) continue;
      // Un entero de hasta 3 dígitos junto a un nivel es la unidad quirúrgica.
      if (n <= 999) {
        unidades = n;
        break;
      }
    }

    const etiqueta =
      celdas.map(texto).find((s) => pareceNombre(s) && parseNivel(s) == null) ?? "";

    return { i, celdas, nivel, unidades, ayudantes, importes, etiqueta };
  });
}

/**
 * Valor de la unidad de un bloque nivelado.
 * Se toma el cociente importe/unidades más repetido: aguanta que una fila suelta
 * esté mal cargada sin arrastrar el resto.
 */
function inferirUnidad(filas: FilaClasificada[]): number | null {
  const cocientes: number[] = [];
  for (const f of filas) {
    if (!f.unidades || f.importes.length === 0) continue;
    const importe = Math.max(...f.importes);
    const q = importe / f.unidades;
    if (Number.isFinite(q) && q > 0) cocientes.push(Math.round(q * 100) / 100);
  }
  if (cocientes.length === 0) return null;

  const conteo = new Map<number, number>();
  for (const q of cocientes) conteo.set(q, (conteo.get(q) ?? 0) + 1);
  let mejor = cocientes[0];
  let max = 0;
  for (const [q, n] of conteo) {
    if (n > max) {
      max = n;
      mejor = q;
    }
  }
  return mejor;
}

const TOLERANCIA = 0.02; // 2% — cubre redondeos de la planilla

export function parseGalenos(hoja: SheetData): ResultadoParse {
  const filas = clasificar(hoja.grid);
  const galenos: GalenoParseado[] = [];
  const avisos: string[] = [];
  const descartadas: { nombre: string; importe: number }[] = [];

  // ── 1. Bloques nivelados ────────────────────────────────────────────────
  // Filas consecutivas (con huecos chicos) que traen "NIVEL n".
  const conNivel = filas.filter((f) => f.nivel != null);
  const grupos: FilaClasificada[][] = [];
  for (const f of conNivel) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && f.i - ultimo[ultimo.length - 1].i <= 3) ultimo.push(f);
    else grupos.push([f]);
  }

  const filasUsadas = new Set<number>();

  for (const grupo of grupos) {
    const unidad = inferirUnidad(grupo);
    if (unidad == null) {
      avisos.push(
        `No se pudo deducir el valor de la unidad del bloque de niveles que arranca en la fila ${grupo[0].i + 1}.`
      );
      continue;
    }

    // Título del bloque: se busca hacia arriba y se descartan las filas que son
    // sólo una fuente/URL ("Nomenclador AAC - … https://aac.org.ar/…"), que
    // suelen estar más cerca de los niveles que el título real.
    let nombre = "";
    for (let i = grupo[0].i - 1; i >= 0 && i >= grupo[0].i - 8; i--) {
      const s = filas[i].celdas.map(texto).join(" ");
      if (!/nomenclador|cirug|galeno|modulo|módulo/i.test(s)) continue;
      if (/https?:\/\//i.test(s)) continue;
      nombre = limpiarTitulo(s);
      if (nombre) break;
    }
    if (!nombre) nombre = `Galeno nivelado (${grupo.length} niveles)`;

    const niveles: NivelParseado[] = [];
    for (const f of grupo) {
      filasUsadas.add(f.i);
      const importe = f.importes.length ? Math.max(...f.importes) : null;
      const unidades = f.unidades ?? 0;
      const esperado = unidades * unidad;
      const reconcilia =
        importe == null || esperado === 0
          ? true
          : Math.abs(importe - esperado) / Math.max(esperado, 1) <= TOLERANCIA;

      if (!reconcilia) {
        avisos.push(
          `Nivel ${f.nivel}: la planilla dice ${importe?.toLocaleString("es-AR")} ` +
            `pero ${unidades} × ${unidad.toLocaleString("es-AR")} da ${esperado.toLocaleString("es-AR")}.`
        );
      }

      const codigoArchivo = f.celdas
        .map(texto)
        .find((s) => /^\d{6}$/.test(s));

      niveles.push({
        nivel: f.nivel as number,
        unidades,
        ayudantes: f.ayudantes,
        importeArchivo: importe,
        reconcilia,
        codigoArchivo,
      });
    }

    const reconocido = esTituloNiveladoValido(nombre);
    if (!reconocido) {
      avisos.push(
        `El bloque de niveles «${nombre}» no es ninguno de los conocidos ` +
          `(cirugía de adultos, cirugía infantil o ginecología). Queda destildado: ` +
          `revisalo y tildalo si corresponde.`
      );
    }

    galenos.push({
      nombre,
      valorUnitario: unidad,
      niveles: niveles.sort((a, b) => a.nivel - b.nivel),
      plano: false,
      fila: grupo[0].i,
      reconocido,
    });
  }

  // ── 2. Galenos planos (valores generales) ───────────────────────────────
  // Sólo los de la lista blanca. Todo lo demás con nombre + importe es el
  // nomenclador de prácticas y va a `descartadas`.
  for (const f of filas) {
    if (filasUsadas.has(f.i) || f.nivel != null) continue;
    if (esEncabezado(f.celdas)) continue;
    if (!f.etiqueta || f.importes.length === 0) continue;
    if (!pareceNombre(f.etiqueta)) continue;

    const nombre = f.etiqueta.slice(0, 200);
    const importe = f.importes[f.importes.length - 1];

    if (!esNombrePlanoValido(nombre)) {
      descartadas.push({ nombre, importe });
      continue;
    }

    galenos.push({
      nombre,
      valorUnitario: importe,
      niveles: [],
      plano: true,
      fila: f.i,
      reconocido: true,
    });
  }

  return {
    galenos: galenos.sort((a, b) => a.fila - b.fila),
    avisos,
    descartadas,
  };
}
