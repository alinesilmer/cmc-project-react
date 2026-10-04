// Lectura del Excel que exporta el sistema de UNNE (O.S. 81),
// «presentación de liquidación web».
//
// Forma real (verificada sobre el de 09/2026, 1.468 filas): una sola hoja con
// 18 columnas —
//
//   N° Referencia · N° Factura · Periodo · Provincia · Matrícula ·
//   Apellido y Nombre Prestador · Reg. · Orden N° · Orden Tipo ·
//   Fecha Práctica · Cantidad · Práctica · Descripción · Función · Norma ·
//   DNI Paciente · Apellido y Nombre Paciente · Importe
//
// y cierra con una fila «TOTAL». Una orden puede traer varios ítems (`Reg.`
// 1, 2, 3…): cada uno es una prestación aparte. El importe es el de la línea,
// ya multiplicado por la cantidad. Qué hace el backend con cada columna está en
// `cmc_api/app/modules/importaciones/unne/servicio.py`.

import {
  abrirLibro,
  fechaDeCelda,
  filasDeDatos,
  lectorDeFila,
  numeroDeCelda,
  textoCelda,
  ubicarEncabezado,
} from "@/app/pages/Validaciones/reporteXlsx";
import type { ColumnaSpec } from "@/app/pages/Validaciones/reporteXlsx";

export interface PrestacionUnne {
  referencia: string;
  orden: string;
  reg: number;
  matricula: string;
  prestador: string;
  /** Periodo que declara el Excel, AAAAMM. */
  periodo: string;
  provincia: string;
  fecha: string;
  fechaISO: string;
  cantidad: number;
  codigo: string;
  descripcion: string;
  funcion: string;
  /** El porcentaje de la columna «Norma» ("Sin norma (449) - 100%" → 100). */
  porcentaje: number;
  dni: string;
  paciente: string;
  /** Importe de la línea (cantidad incluida). */
  importe: number;
}

export interface ReporteUnne {
  prestaciones: PrestacionUnne[];
  /** Periodo que declara el archivo (el más repetido), AAAAMM; "" si no trae. */
  periodo: string;
  rango: string;
  hoja: string;
}

type Columna =
  | "referencia" | "periodo" | "provincia" | "matricula" | "prestador" | "reg" | "orden"
  | "fecha" | "cantidad" | "codigo" | "descripcion" | "funcion" | "norma" | "dni"
  | "paciente" | "importe";

// Títulos ya normalizados por `normalizarTitulo` ("N° Referencia" → "N REFERENCIA").
const COLUMNAS: ColumnaSpec<Columna>[] = [
  { key: "referencia", alias: ["N REFERENCIA", "NRO REFERENCIA", "REFERENCIA"] },
  { key: "periodo", alias: ["PERIODO"] },
  { key: "provincia", alias: ["PROVINCIA"] },
  { key: "matricula", alias: ["MATRICULA"] },
  { key: "prestador", alias: ["APELLIDO Y NOMBRE PRESTADOR", "PRESTADOR"] },
  { key: "reg", alias: ["REG", "REGISTRO"] },
  { key: "orden", alias: ["ORDEN N", "ORDEN NRO", "NRO ORDEN", "ORDEN"] },
  { key: "fecha", alias: ["FECHA PRACTICA", "FECHA"] },
  { key: "cantidad", alias: ["CANTIDAD"] },
  { key: "codigo", alias: ["PRACTICA", "CODIGO"] },
  { key: "descripcion", alias: ["DESCRIPCION"] },
  { key: "funcion", alias: ["FUNCION"] },
  { key: "norma", alias: ["NORMA"] },
  { key: "dni", alias: ["DNI PACIENTE", "DNI"] },
  { key: "paciente", alias: ["APELLIDO Y NOMBRE PACIENTE", "PACIENTE"] },
  { key: "importe", alias: ["IMPORTE"] },
];

const ERROR_ENCABEZADOS =
  "No encontramos los encabezados del Excel de UNNE (Matrícula, Orden N°, " +
  "Fecha Práctica, Práctica, Importe).";

const utf8 = new TextDecoder("utf-8");

/**
 * Repara los nombres que el sistema de UNNE exporta con el encoding roto.
 *
 * Vienen dos daños distintos:
 *  - UTF-8 leído como Latin-1 ("MUÃ\u0091OZ"): se recupera exacto.
 *  - La letra perdida del todo (`ÿ`): pasa con Ñ, Í, É, Á y Ü, sin forma de saber
 *    cuál era. Entre vocales, o al principio de palabra antes de vocal, casi
 *    siempre es Ñ (NUÑEZ, IBAÑEZ, ÑAÑEZ); en el resto queda "?". El DNI, que es lo
 *    que identifica al paciente, no se toca.
 */
export function repararNombre(texto: string): string {
  const recuperado = texto.replace(/Ã([\u0080-¿])/g, (_, c: string) =>
    utf8.decode(new Uint8Array([0xc3, c.charCodeAt(0)]))
  );
  return recuperado.replace(/[ÿ⿿]/g, (_, i: number, s: string) => {
    const antes = s[i - 1] ?? " ";
    const despues = s[i + 1] ?? " ";
    const vocal = (ch: string) => /[AEIOUÁÉÍÓÚ]/i.test(ch);
    return vocal(despues) && (vocal(antes) || /\s|[ÿ⿿]/.test(antes)) ? "Ñ" : "?";
  });
}

const porcentajeDeNorma = (norma: string): number => {
  const m = norma.match(/(\d{1,3})\s*%/);
  return m ? Number(m[1]) : 100;
};

const entero = (valor: unknown): string => {
  const n = numeroDeCelda(valor);
  return n ? String(Math.trunc(n)) : textoCelda(valor);
};

export async function leerArchivoUnne(file: File): Promise<ReporteUnne> {
  const libro = await abrirLibro(file);
  const enc = ubicarEncabezado(libro, COLUMNAS, { minColumnas: 6 });
  if (!enc) throw new Error(ERROR_ENCABEZADOS);
  const celda = lectorDeFila(enc);

  const prestaciones: PrestacionUnne[] = filasDeDatos(enc)
    // Sólo filas con número de orden: así se descartan la fila «TOTAL» y los separadores.
    .filter((fila) => numeroDeCelda(celda(fila, "orden")) > 0)
    .map((fila) => {
      const fecha = fechaDeCelda(celda(fila, "fecha"));
      const periodo = fechaDeCelda(celda(fila, "periodo")).iso;
      return {
        referencia: entero(celda(fila, "referencia")),
        orden: entero(celda(fila, "orden")),
        reg: Math.max(1, Math.trunc(numeroDeCelda(celda(fila, "reg"))) || 1),
        matricula: entero(celda(fila, "matricula")),
        prestador: repararNombre(textoCelda(celda(fila, "prestador"))),
        periodo: periodo ? periodo.slice(0, 7).replace("-", "") : "",
        provincia: textoCelda(celda(fila, "provincia")),
        fecha: fecha.corta,
        fechaISO: fecha.iso,
        cantidad: Math.max(1, Math.trunc(numeroDeCelda(celda(fila, "cantidad"))) || 1),
        codigo: entero(celda(fila, "codigo")),
        descripcion: textoCelda(celda(fila, "descripcion")),
        funcion: textoCelda(celda(fila, "funcion")),
        porcentaje: porcentajeDeNorma(textoCelda(celda(fila, "norma"))),
        dni: entero(celda(fila, "dni")),
        paciente: repararNombre(textoCelda(celda(fila, "paciente"))),
        importe: numeroDeCelda(celda(fila, "importe")),
      };
    });

  const conteo = new Map<string, number>();
  for (const p of prestaciones) if (p.periodo) conteo.set(p.periodo, (conteo.get(p.periodo) ?? 0) + 1);
  const periodo = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const isos = prestaciones.map((p) => p.fechaISO).filter(Boolean).sort();
  const corta = (iso: string) => iso.split("-").reverse().join("/");
  const rango = isos.length ? `${corta(isos[0])} al ${corta(isos[isos.length - 1])}` : "";

  return { prestaciones, periodo, rango, hoja: enc.hoja };
}
