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
 * Minúsculas y sin acentos, para comparar nombres sin depender de cómo esté
 * escrito en la planilla ("QUIRÚRGICO", "quirurgico", "Quirurgico").
 */
const normalizar = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Convierte un importe en formato es-AR a número.
 * "$ 1.540,08" → 1540.08 · "4.250.000,00" → 4250000 · 25000 → 25000
 */
export function parseImporte(c: Cell): number | null {
  if (c == null || c === "") return null;
  if (typeof c === "number") return Number.isFinite(c) ? c : null;

  let s = String(c).trim();
  if (!s) return null;
  // El NBSP va con escape a propósito: Excel lo usa como separador de miles y,
  // escrito como carácter literal, era invisible en el fuente.
  s = s.replace(/[$\s\u00A0]/g, "");
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

/**
 * Importe embebido en una celda que ADEMÁS tiene texto.
 *
 * Es el caso más común de galeno que se perdía: al leer un PDF, el nombre y el
 * importe caen en la misma celda si el espacio entre ambos no llega al corte de
 * columna (`CORTE_X` en readPdfGrid), y en Excel pasa lo mismo cuando la
 * planilla usa una línea de puntos como relleno:
 *
 *   "GALENO QUIRURGICO $ 1.540,08"
 *   "GALENO QUIRURGICO ................ 1.540,08"
 *
 * `parseImporte` sobre esas cadenas devuelve null (queda "GALENOQUIRURGICO…"),
 * así que la fila se descartaba por "no tiene importe" y el galeno no aparecía.
 *
 * Se exige que el número TENGA PINTA DE PLATA —signo $, separador de miles o
 * dos decimales— para no confundir el "1" de "NIVEL 1" ni el "2" de
 * "2 ayudantes" con un importe.
 */
const RX_IMPORTE_EN_TEXTO =
  /\$\s*\d[\d.,]*|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{2}\b/g;

function importesEnTexto(s: string): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(RX_IMPORTE_EN_TEXTO)) {
    // Un código con cero a la izquierda no es plata, aunque tenga puntos.
    if (/^0\d/.test(m[0].replace(/[$\s]/g, ""))) continue;
    const v = parseImporte(m[0]);
    if (v != null && v > 0) out.push(v);
  }
  return out;
}

/** Todos los importes de una celda, venga sola o mezclada con texto. */
function importesDeCelda(c: Cell): number[] {
  if (esCodigo(c)) return [];
  if (typeof c === "number") {
    const v = parseImporte(c);
    return v != null && v > 0 ? [v] : [];
  }
  const s = texto(c);
  if (!s) return [];
  // Celda "limpia" (sólo número/moneda): se parsea entera, así no se pierde
  // un entero sin decimales ni separadores ("25000").
  if (/^[$\s]*[\d.,]+$/.test(s)) {
    const v = parseImporte(s);
    return v != null && v > 0 ? [v] : [];
  }
  return importesEnTexto(s);
}

/**
 * Saca de la etiqueta el importe y el relleno, para quedarse con el nombre.
 * "GALENO QUIRURGICO ....... $ 1.540,08" → "GALENO QUIRURGICO"
 */
function nombreSinImporte(s: string): string {
  return s
    .replace(RX_IMPORTE_EN_TEXTO, " ")
    .replace(/\$/g, " ")
    .replace(/[.·•_]{2,}/g, " ") // líneas de puntos de relleno
    .replace(/[:\-–—]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Entero chico y limpio (unidades, nivel). No acepta importes. */
function parseEntero(c: Cell): number | null {
  const s = texto(c);
  if (!s || !/^\d{1,4}$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Nivel de la fila. Contempla las tres formas que traen las planillas reales:
 *   "NIVEL 3" / "Nivel 10"      → hoja de adultos y la de ginecología
 *   "1 SIN AYUD" / "2 (1 AYUD)" → hoja de cirugía infantil, donde la columna se
 *                                 llama "Complejidad" y no dice "NIVEL"
 */
function parseNivel(c: Cell): number | null {
  const s = texto(c);
  if (!s) return null;

  const conPalabra = s.match(/^nivel\s*(\d{1,3})$/i);
  if (conPalabra) return Number(conPalabra[1]);

  // "1 SIN AYUD", "4 (2 AYUD)" — número al principio + mención a ayudantes.
  const complejidad = s.match(/^(\d{1,3})\s*[\s(]\s*(?:sin|x?\s*\d+)\s*ayud/i);
  if (complejidad) return Number(complejidad[1]);

  return null;
}

/**
 * Ayudantes que admite el nivel.
 * "Sin Ayudante"/"SIN AYUD" → 0 · "1 ayudante" → 1 · "X2 AYUD"/"2 (2 AYUD)" → 2
 */
function parseAyudantes(c: Cell): number | null {
  const s = normalizar(texto(c));
  if (!s) return null;
  // "AYUD" a secas es como lo abrevian las hojas de infantil y ginecología.
  if (/sin\s*ayud/.test(s)) return 0;
  const conX = s.match(/x\s*(\d+)\s*ayud/); // "X2 AYUD"
  if (conX) return Number(conX[1]);
  const m = s.match(/(\d+)\s*ayud/);
  return m ? Number(m[1]) : null;
}

// ─── Encabezados de tabla ─────────────────────────────────────────────────────
//
// Las planillas del Colegio traen una fila de encabezado arriba de cada bloque
// de niveles, y es la forma MÁS PRECISA de saber qué es cada columna: mucho
// mejor que adivinar por el contenido. Sin esto, en la hoja de adultos el
// código (80001, que Excel entrega como número y no como "080001") se contaba
// como importe y el valor de la unidad salía cualquier cosa.

type Rol = "codigo" | "nivel" | "unidades" | "ayudantes" | "valor";

const ROLES: { rol: Rol; rx: RegExp }[] = [
  { rol: "codigo", rx: /^codigos?$/ },
  { rol: "nivel", rx: /^nivel$|^complejidad$|^nivel\s*\/\s*ayudantes$|^descripcion$/ },
  { rol: "unidades", rx: /unidad(es)?\b|^galenos?\s+cirujano$/ },
  { rol: "ayudantes", rx: /^ayudantes?$|^cantidad\s+ayudantes$/ },
  // "Valor cirujano" sí; "Valor ayudante" y "+ urgencia" NO — no son el valor
  // base del nivel y elegirlos daría una unidad equivocada.
  { rol: "valor", rx: /^valor\s+cirujano$|^valor\s+actualizado$/ },
];

type MapaColumnas = Partial<Record<Rol, number>>;

function mapaColumnas(fila: Cell[]): MapaColumnas | null {
  const mapa: MapaColumnas = {};
  fila.forEach((c, i) => {
    const s = normalizar(texto(c));
    if (!s) return;
    for (const { rol, rx } of ROLES) {
      if (mapa[rol] === undefined && rx.test(s)) {
        mapa[rol] = i;
        return;
      }
    }
  });
  // Con una sola columna reconocida no alcanza: sería casualidad.
  return Object.keys(mapa).length >= 2 ? mapa : null;
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

// Los patrones corren SIEMPRE sobre el texto normalizado (sin acentos, en
// minúsculas), así "GALENO QUIRÚRGICO", "Galeno Quirurgico" y "GALENO
// QUIRURGICO" son lo mismo.
//
// Tampoco van anclados al principio: en las planillas reales el nombre suele
// venir con algo adelante —numeración ("1. GALENO QUIRURGICO"), una sigla
// ("U.G.Q. GALENO QUIRURGICO") o la celda anterior pegada— y anclar con `^`
// hacía que esos casos se descartaran como "no es un galeno".

/** Nombres válidos de un galeno plano (valores generales). */
const PATRONES_PLANOS: RegExp[] = [
  // GALENO QUIRURGICO · GALENO PRACTICA · GALENO RADIOLOGICO · GALENO ANESTESIA
  /\bgalenos?\b/,
  // GASTOS QUIRURGICOS · GASTOS RADIOLOGICOS · GASTOS BIOQUIMICOS · OTROS GASTOS
  /\bgastos?\b/,
  // Cómo aparecen a veces los mismos valores en las planillas viejas.
  /\bunidad\s+galeno\b/,
  /\bu\.?\s?g\.?\s?q\.?\b/, // U.G.Q. = unidad galeno quirúrgico
];

/** Títulos válidos de un bloque nivelado. */
const PATRONES_NIVELADOS: RegExp[] = [
  /cirugias?\b.*\badulto/,
  /cirugias?\b.*\binfantil/,
  /\bginecolog/,
  // Algunas planillas titulan el bloque por la unidad, no por la especialidad.
  /unidad\s+quirurgica/,
];

/**
 * `false` para lo que tiene pinta de galeno por el nombre pero es otra cosa:
 * las filas del nomenclador de prácticas que mencionan gastos, y los totales.
 */
const ANTIPATRONES: RegExp[] = [
  /\bincluye\s+gastos\b/,
  /\bsin\s+gastos\b/,
  /\bmas\s+gastos\b/,
  /\btotal\b/,
  /\bsubtotal\b/,
];

/**
 * Recorta la etiqueta para que empiece en el galeno.
 *
 * Lo que sobra adelante es numeración, siglas o un encabezado que quedó pegado
 * en la misma línea del PDF. Sin esto el galeno se guardaría en `nm_galenos`
 * con un nombre como "VALORES GENERALES GALENO QUIRURGICO", que después nadie
 * encuentra. Se trabaja palabra por palabra sobre el ORIGINAL (no sobre el
 * normalizado) porque quitar acentos cambia la longitud y desalinea los índices.
 */
const ARRANQUES = new Set(["galeno", "galenos", "gasto", "gastos", "unidad"]);

/** Palabras que SÍ forman parte del nombre aunque vayan antes del arranque. */
const PREFIJOS_DEL_NOMBRE = new Set(["otros", "otro"]);

/** Basura típica adelante: numeración, siglas y restos de encabezado. */
const PREFIJOS_BASURA = new Set([
  "valores", "valor", "generales", "general", "nomenclador",
  "actualizacion", "tabla", "anexo", "vigente", "vigencia",
]);

const esPrefijoBasura = (p: string): boolean => {
  const n = normalizar(p).replace(/[^a-z0-9]/g, "");
  if (!n) return true; // sólo puntuación ("-", "•")
  if (/^\d+$/.test(n)) return true; // numeración "1."
  if (n.length <= 3 && /^[a-z]+$/.test(n) && p.includes(".")) return true; // sigla "U.G.Q."
  return PREFIJOS_BASURA.has(n);
};

function recortarDesdeGaleno(s: string): string {
  const palabras = s.split(" ").filter(Boolean);
  const i = palabras.findIndex((p) =>
    ARRANQUES.has(normalizar(p).replace(/[^a-z]/g, ""))
  );
  if (i <= 0) return s;

  // "OTROS GASTOS" es un galeno propio: no cortar y quedarse con "GASTOS".
  let desde = i;
  while (desde > 0 && PREFIJOS_DEL_NOMBRE.has(normalizar(palabras[desde - 1]))) {
    desde--;
  }
  // Sólo se recorta si TODO lo que queda adelante es basura. Si hay una palabra
  // con significado, se deja el nombre entero: es preferible un nombre largo a
  // uno mutilado.
  if (!palabras.slice(0, desde).every(esPrefijoBasura)) return s;

  return palabras.slice(desde).join(" ").trim() || s;
}

const esNombrePlanoValido = (s: string): boolean => {
  const n = normalizar(s);
  if (!n) return false;
  if (ANTIPATRONES.some((r) => r.test(n))) return false;
  // El título de un bloque nivelado gana: en la planilla del Colegio dice
  // "NOMENCLADOR DE CIRUGIAS DE ADULTO (UNIDAD GALENO VARIABLE…)", que contiene
  // "GALENO" y, al no anclar los patrones, pasaba por galeno plano — con lo
  // cual el bloque de adultos se quedaba sin título y salía como "no conocido".
  if (esTituloNiveladoValido(s)) return false;
  return PATRONES_PLANOS.some((r) => r.test(n));
};

const esTituloNiveladoValido = (s: string): boolean => {
  const n = normalizar(s);
  return PATRONES_NIVELADOS.some((r) => r.test(n));
};

/** Filas de encabezado/relleno que no son datos. */
const ENCABEZADOS =
  /valores?\s+generales|nomenclador|actualizacion|nivel\b.*complejidad|valor\s+cirujano|unidad\s+quir/;

/**
 * `true` si la fila es un encabezado y no un dato.
 *
 * Ojo con el último caso: en un PDF el encabezado y el primer dato pueden caer
 * en la misma línea ("VALORES GENERALES  GALENO QUIRURGICO  $ 1.540,08"). Si la
 * fila trae además un nombre de galeno válido y un importe, es un dato con el
 * encabezado pegado adelante, no un encabezado — y descartarla perdía el galeno.
 */
const esEncabezado = (fila: Cell[], etiqueta = "", tieneImporte = false): boolean => {
  const s = normalizar(fila.map(texto).join(" "));
  if (!ENCABEZADOS.test(s)) return false;
  if (parseNivel(fila.find((c) => parseNivel(c) != null) ?? null)) return false;
  if (tieneImporte && etiqueta && esNombrePlanoValido(etiqueta)) return false;
  return true;
};

/**
 * Deja el título del bloque presentable: saca asteriscos de nota al pie, la
 * aclaración entre paréntesis y las columnas vacías que arrastra la fila.
 */
function limpiarTitulo(s: string): string {
  return nombreSinImporte(
    s
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\*+/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/actualizacion\s+automatica/gi, "")
  )
    // Número suelto al final: es el valor de la unidad que quedó pegado al
    // título ("CIRUGIA INFANTIL 4464"), no parte del nombre.
    .replace(/\s+\d[\d.,]*$/, "")
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

    // Importes: los de las celdas numéricas y también los que vienen pegados al
    // nombre en una celda de texto (ver `importesDeCelda`). Se excluyen los
    // identificadores con cero a la izquierda (080001 es el código, no $80.001).
    const importes: number[] = [];
    for (const c of celdas) importes.push(...importesDeCelda(c));

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

    // Etiqueta de la fila. Se le saca el importe pegado, si lo tiene, y se
    // PREFIERE la celda que matchea un galeno conocido en vez de la primera con
    // letras: en las planillas con una columna de rubro adelante ("Valores",
    // "Cirugía"), quedarse con la primera hacía que "GALENO QUIRURGICO" —que
    // estaba en la celda siguiente— nunca se evaluara.
    const candidatas = celdas
      .map(texto)
      .map(nombreSinImporte)
      .filter((s) => pareceNombre(s) && parseNivel(s) == null);
    const etiqueta =
      candidatas.find((s) => esNombrePlanoValido(s)) ?? candidatas[0] ?? "";

    return { i, celdas, nivel, unidades, ayudantes, importes, etiqueta };
  });
}

/**
 * Reinterpreta una fila usando los roles del encabezado, que mandan sobre lo
 * que hubiera adivinado `clasificar`.
 *
 * Lo importante es la columna de código: Excel entrega "080001" como el número
 * 80001, así que el filtro de "cero a la izquierda" no lo agarra y se colaba
 * como importe. Con el encabezado se sabe cuál es y se la saca del cálculo.
 */
function aplicarMapa(f: FilaClasificada, mapa: MapaColumnas): void {
  if (mapa.valor !== undefined) {
    const v = importesDeCelda(f.celdas[mapa.valor]);
    // Sólo se pisa si la columna de valor trae algo: hay planillas donde está
    // vacía y el valor de la unidad viene en una fila aparte.
    f.importes = v.length ? v : [];
  } else if (mapa.codigo !== undefined) {
    // Sin columna de valor declarada, al menos se descarta el código.
    f.importes = f.celdas.flatMap((c, i) =>
      i === mapa.codigo ? [] : importesDeCelda(c)
    );
  }

  if (mapa.unidades !== undefined) {
    const n = parseEntero(f.celdas[mapa.unidades]) ?? importesDeCelda(f.celdas[mapa.unidades])[0];
    if (n != null && n > 0) f.unidades = n;
  }

  if (mapa.ayudantes !== undefined) {
    const a =
      parseAyudantes(f.celdas[mapa.ayudantes]) ??
      parseEntero(f.celdas[mapa.ayudantes]);
    if (a != null) f.ayudantes = a;
  }

  if (mapa.nivel !== undefined) {
    const n = parseNivel(f.celdas[mapa.nivel]);
    if (n != null) f.nivel = n;
  }
}

/**
 * Encabezado del bloque: se busca hacia arriba desde el primer nivel.
 * Devuelve el mapa de columnas y en qué fila estaba.
 */
function encabezadoDelBloque(
  filas: FilaClasificada[],
  primerNivel: number
): { mapa: MapaColumnas; fila: number } | null {
  for (let i = primerNivel - 1; i >= 0 && i >= primerNivel - 6; i--) {
    const mapa = mapaColumnas(filas[i].celdas);
    if (mapa) return { mapa, fila: i };
  }
  return null;
}

/**
 * Fila que trae el valor de la unidad cuando el bloque no lo tiene por nivel.
 *
 * Es el caso de la hoja "Valores y Adultos": las columnas "Valor cirujano" y
 * "Valor ayudante" vienen VACÍAS, y el valor de la unidad está en una fila
 * suelta ("CIRUGIA ADULTO · $ 25.000,00") DEBAJO del bloque. En la hoja de
 * infantil la misma fila está ARRIBA ("CIRUGIA INFANTIL · $ 4.464,00"), así que
 * se busca para los dos lados y gana la más cercana.
 *
 * Se exige que la fila tenga UN solo importe y una etiqueta de cirugía/galeno,
 * para no confundirla con una fila de prácticas (que trae código + unidades +
 * valor, o sea tres números).
 */
const RX_ETIQUETA_UNIDAD = /\b(cirugia|galeno|unidad)\b/;

function filaDeUnidad(
  filas: FilaClasificada[],
  desde: number,
  hasta: number
): FilaClasificada | null {
  const candidatas = filas.filter(
    (f) =>
      f.nivel == null &&
      f.importes.length === 1 &&
      f.etiqueta &&
      RX_ETIQUETA_UNIDAD.test(normalizar(f.etiqueta)) &&
      // Un galeno plano ("Galeno quirúrgico") NO es el valor de la unidad del
      // bloque de cirugía, aunque quede al lado y también diga "galeno". Sin
      // esta exclusión, la hoja de adultos tomaba 1.540,08 en vez de 25.000 y
      // encima se comía el plano.
      !esNombrePlanoValido(f.etiqueta)
  );
  if (!candidatas.length) return null;

  const distancia = (f: FilaClasificada) =>
    f.i < desde ? desde - f.i : f.i > hasta ? f.i - hasta : 0;

  return candidatas.reduce((mejor, f) =>
    distancia(f) < distancia(mejor) ? f : mejor
  );
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
    // El encabezado de la tabla dice qué es cada columna. Es MUCHO más preciso
    // que adivinar por contenido: en la hoja de adultos el código lo entrega
    // Excel como número (80001, no "080001"), y sin el encabezado se contaba
    // como importe y el valor de la unidad salía cualquier cosa.
    const enc = encabezadoDelBloque(filas, grupo[0].i);
    const mapa = enc?.mapa;

    if (mapa) {
      for (const f of grupo) aplicarMapa(f, mapa);
    }

    let unidad = inferirUnidad(grupo);
    let unidadDeFila: FilaClasificada | null = null;

    // Bloque sin importes por nivel (hoja "Valores y Adultos": las columnas de
    // valor vienen vacías). El valor de la unidad está en una fila suelta,
    // arriba o abajo del bloque.
    if (unidad == null) {
      unidadDeFila = filaDeUnidad(filas, grupo[0].i, grupo[grupo.length - 1].i);
      if (unidadDeFila) unidad = unidadDeFila.importes[0];
    }

    if (unidad == null) {
      avisos.push(
        `No se pudo deducir el valor de la unidad del bloque de niveles que arranca en la fila ${grupo[0].i + 1}.`
      );
      continue;
    }

    // La fila del valor de la unidad no debe además importarse como galeno
    // plano: es el mismo dato contado dos veces.
    if (unidadDeFila) filasUsadas.add(unidadDeFila.i);

    // Título del bloque. Se busca hacia arriba, saltando:
    //   · el encabezado de la tabla (si no, el nombre quedaba "Código Unidades
    //     galeno Descripción Nivel / Ayudantes …");
    //   · los galenos planos, que son otra cosa aunque estén pegados arriba;
    //   · las filas que son sólo la fuente ("Nomenclador AAC - … https://…").
    //
    // Se prioriza un título que sea uno de los NOMENCLADORES CONOCIDOS aunque
    // esté más lejos: en la hoja de ginecología el nombre bueno está 14 filas
    // arriba y el más cercano es un subtítulo genérico.
    let filaTitulo: number | null = null;
    const buscarTitulo = (soloConocidos: boolean): string => {
      for (let i = grupo[0].i - 1; i >= 0 && i >= grupo[0].i - 30; i--) {
        if (enc && i === enc.fila) continue;
        const f = filas[i];
        if (f.etiqueta && esNombrePlanoValido(f.etiqueta)) continue;
        const s = f.celdas.map(texto).join(" ");
        if (/https?:\/\//i.test(s)) continue;
        const n = normalizar(s);
        if (soloConocidos) {
          if (!esTituloNiveladoValido(s)) continue;
        } else if (!/nomenclador|cirug|galeno|modulo/.test(n)) {
          continue;
        }
        const limpio = limpiarTitulo(s);
        if (limpio) {
          filaTitulo = i;
          return limpio;
        }
      }
      return "";
    };

    let nombre = buscarTitulo(true) || buscarTitulo(false);

    // La fila del título no se lista como "descartada": no es una fila que se
    // haya dejado afuera por no reconocerla, es el nombre del bloque.
    if (filaTitulo != null) filasUsadas.add(filaTitulo);
    // Si no hubo título arriba, sirve la etiqueta de la fila del valor de la
    // unidad ("CIRUGIA ADULTO", "CIRUGIA INFANTIL"): nombra al bloque igual de
    // bien y es lo que el usuario reconoce.
    if (!nombre && unidadDeFila) nombre = limpiarTitulo(unidadDeFila.etiqueta);
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
    if (!f.etiqueta) continue;
    if (esEncabezado(f.celdas, f.etiqueta, f.importes.length > 0)) continue;
    if (!pareceNombre(f.etiqueta)) continue;

    // Importe en la fila SIGUIENTE. Pasa al leer PDF: si el nombre y el monto
    // están a distinta altura, el agrupado por coordenada Y los parte en dos
    // líneas y quedan así:
    //     "GALENO PRACTICA"
    //     "$ 731,54"
    // Antes se descartaban por "no tiene importe" y se perdían GALENO PRACTICA
    // y GASTOS BIOQUIMICOS de la planilla del Colegio. Sólo se mira la fila
    // inmediata, sólo si es un importe solo y sin nombre, y sólo para galenos
    // de la lista blanca: así no se le adjudica a un nombre cualquiera el
    // número de la fila de abajo.
    let importes = f.importes;
    let filaImporte: number | null = null;
    if (importes.length === 0 && esNombrePlanoValido(f.etiqueta)) {
      const sig = filas[f.i + 1];
      if (
        sig &&
        !filasUsadas.has(sig.i) &&
        sig.nivel == null &&
        sig.importes.length === 1 &&
        !sig.etiqueta
      ) {
        importes = sig.importes;
        filaImporte = sig.i;
      }
    }
    if (importes.length === 0) continue;

    const importe = importes[importes.length - 1];

    if (!esNombrePlanoValido(f.etiqueta)) {
      descartadas.push({ nombre: f.etiqueta.slice(0, 200), importe });
      continue;
    }

    const nombre = recortarDesdeGaleno(f.etiqueta).slice(0, 200);
    if (filaImporte != null) filasUsadas.add(filaImporte);

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
