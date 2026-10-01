// Lectura del reporte de transacciones que emite Swiss Medical (O.S. 256).
//
// Como el de Prevención Salud, viene por el Colegio entero y no por médico: el
// prestador es siempre el Colegio (48178) y lo que ata cada fila a alguien de
// `listado_medico` es la matrícula del efector.
//
// Forma real del reporte (verificada sobre el de 20/08/2026 al 20/09/2026,
// 1.127 filas): una sola hoja con 26 columnas —
//
//   prestador · Razón_Social · cuit · transacción_ticket · transacción_item ·
//   fecha_transaccion · fecha_prestacion · credencial · apellido_afiliado ·
//   condición_iva · prestación · prestación_denominación · cantidad ·
//   transacción_tipo · autorización · copago · efector · efector_matricula ·
//   efector_cuit · efector_razón_social · prescriptor · prescriptor_matricula ·
//   prescriptor_razón_social · icd · terminal · terminal_domicilio
//
// Tres diferencias con el de Prevención Salud:
//
//  1. El grano ya viene desarmado. Una fila es un ítem facturable, con su
//     código y su cantidad; no hay que partir celdas multi-práctica. Lo que sí
//     se repite es el ticket: 48 de los 1.055 tickets traen más de un ítem
//     (hasta 6), y eso se muestra como "2/3" igual que allá.
//  2. Trae importe (`copago`) y número de afiliado (`credencial`), que en
//     Prevención Salud no venían.
//  3. La matrícula viene con la letra de la provincia adelante ("W-3972"). Ver
//     `matriculaDeEfector` más abajo: no es un detalle cosmético.
//
// Las tres primeras columnas son constantes en todo el archivo (son los datos
// del Colegio como prestador), así que se leen una vez como cabecera y no se
// repiten en la tabla.

import {
  abrirLibro,
  fechaDeCelda,
  filasDeDatos,
  lectorDeFila,
  numeroDeCelda,
  textoCelda,
  ubicarEncabezado,
} from "./reporteXlsx";
import type { ColumnaSpec } from "./reporteXlsx";

/** Un ítem de transacción: el grano en el que Swiss Medical factura. */
export interface PrestacionSwiss {
  /** Agrupa los ítems de una misma atención. */
  ticket: string;
  /** Único en todo el reporte; es la clave de la fila. */
  item: string;
  /** Posición dentro de su ticket, para las atenciones de varios ítems. */
  indice: number;
  /** Cuántos ítems trajo el ticket del que salió. */
  deTotal: number;

  fecha: string;
  fechaISO: string;
  fechaTransaccion: string;

  credencial: string;
  afiliado: string;
  condicionIva: string;

  codigo: string;
  descripcion: string;
  cantidad: number;

  autorizacion: string;
  copago: number;

  /** Tal cual vino: "W-3972". */
  matricula: string;
  /** Letra de provincia de la matrícula, en mayúscula. "" si no trae. */
  provincia: string;
  efector: string;
  efectorCuit: string;
  /** Nombre del efector según Swiss, para cuando no se resuelve el padrón. */
  efectorNombre: string;

  prescriptorMatricula: string;
  prescriptorNombre: string;

  terminal: string;
  terminalDomicilio: string;
}

/** Los datos del Colegio como prestador: constantes en todo el archivo. */
export interface CabeceraSwiss {
  prestador: string;
  razonSocial: string;
  cuit: string;
}

export interface ReporteSwiss {
  cabecera: CabeceraSwiss;
  prestaciones: PrestacionSwiss[];
  /** "20/08/2026 al 20/09/2026", deducido de las fechas de prestación. */
  rango: string;
  hoja: string;
}

type Clave =
  | "prestador"
  | "razonSocial"
  | "cuit"
  | "ticket"
  | "item"
  | "fechaTransaccion"
  | "fechaPrestacion"
  | "credencial"
  | "afiliado"
  | "condicionIva"
  | "codigo"
  | "descripcion"
  | "cantidad"
  | "autorizacion"
  | "copago"
  | "efector"
  | "matricula"
  | "efectorCuit"
  | "efectorNombre"
  | "prescriptorMatricula"
  | "prescriptorNombre"
  | "terminal"
  | "terminalDomicilio";

// `normalizarTitulo` ya pasó a mayúsculas, sacó acentos y convirtió guiones
// bajos y puntos en espacios, así que "Razón_Social" llega como "RAZON SOCIAL".
const COLUMNAS: ColumnaSpec<Clave>[] = [
  { key: "prestador", alias: ["PRESTADOR"] },
  { key: "razonSocial", alias: ["RAZON SOCIAL"] },
  { key: "cuit", alias: ["CUIT"] },
  { key: "ticket", alias: ["TRANSACCION TICKET", "TICKET"] },
  { key: "item", alias: ["TRANSACCION ITEM", "ITEM"] },
  { key: "fechaTransaccion", alias: ["FECHA TRANSACCION"] },
  { key: "fechaPrestacion", alias: ["FECHA PRESTACION", "FECHA"] },
  { key: "credencial", alias: ["CREDENCIAL", "NRO AFILIADO", "AFILIADO NRO"] },
  { key: "afiliado", alias: ["APELLIDO AFILIADO", "AFILIADO", "PACIENTE"] },
  { key: "condicionIva", alias: ["CONDICION IVA"] },
  { key: "codigo", alias: ["PRESTACION", "CODIGO"] },
  {
    key: "descripcion",
    alias: ["PRESTACION DENOMINACION", "DENOMINACION", "DESCRIPCION"],
  },
  { key: "cantidad", alias: ["CANTIDAD"] },
  { key: "autorizacion", alias: ["AUTORIZACION"] },
  { key: "copago", alias: ["COPAGO"] },
  { key: "efector", alias: ["EFECTOR"] },
  { key: "matricula", alias: ["EFECTOR MATRICULA", "MATRICULA"] },
  { key: "efectorCuit", alias: ["EFECTOR CUIT"] },
  { key: "efectorNombre", alias: ["EFECTOR RAZON SOCIAL"] },
  { key: "prescriptorMatricula", alias: ["PRESCRIPTOR MATRICULA"] },
  { key: "prescriptorNombre", alias: ["PRESCRIPTOR RAZON SOCIAL"] },
  { key: "terminal", alias: ["TERMINAL"] },
  { key: "terminalDomicilio", alias: ["TERMINAL DOMICILIO"] },
];

/**
 * Provincia y número de una matrícula del reporte.
 *
 * Swiss la manda con la letra de la provincia adelante: "W-3972" es Corrientes,
 * y en el reporte de septiembre hay una "H-6395", que es Chaco. La distinción
 * importa porque `claveMatricula` (el índice del padrón) se queda sólo con los
 * dígitos: sin mirar la letra, esa "H-6395" matchearía contra el médico 6395 de
 * Corrientes, que es otra persona. Por eso la pantalla marca las que no son W
 * en vez de darlas por resueltas.
 */
export const CORRIENTES = "W";

export const matriculaDeEfector = (
  valor: unknown
): { matricula: string; provincia: string } => {
  const matricula = textoCelda(valor);
  const m = matricula.match(/^([A-Za-z])\s*-/);
  return { matricula, provincia: m ? m[1].toUpperCase() : "" };
};

/** `true` si la matrícula no es de Corrientes y por lo tanto no se puede
 * resolver contra `listado_medico` sólo por su número. */
export const esDeOtraProvincia = (p: PrestacionSwiss): boolean =>
  p.provincia !== "" && p.provincia !== CORRIENTES;

const ERROR_ENCABEZADOS =
  "No encontramos los encabezados del reporte de Swiss Medical " +
  "(transacción_ticket, fecha_prestacion, credencial, prestación, " +
  "efector_matricula).";

/** "20/08/2026 al 20/09/2026" a partir de las fechas que trajeron las filas. */
function rangoDeFechas(prestaciones: PrestacionSwiss[]): string {
  const isos = prestaciones.map((p) => p.fechaISO).filter(Boolean).sort();
  if (isos.length === 0) return "";

  const aCorta = (iso: string) => {
    const [anio, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${anio}`;
  };
  const desde = aCorta(isos[0]);
  const hasta = aCorta(isos[isos.length - 1]);
  return desde === hasta ? desde : `${desde} al ${hasta}`;
}

export async function leerArchivoSwiss(file: File): Promise<ReporteSwiss> {
  const libro = await abrirLibro(file);
  const enc = ubicarEncabezado(libro, COLUMNAS, { minColumnas: 5 });
  if (!enc) throw new Error(ERROR_ENCABEZADOS);

  const celda = lectorDeFila(enc);

  const crudas = filasDeDatos(enc)
    .map((fila) => {
      const prestacion = fechaDeCelda(celda(fila, "fechaPrestacion"));
      const { matricula, provincia } = matriculaDeEfector(celda(fila, "matricula"));

      return {
        ticket: textoCelda(celda(fila, "ticket")),
        item: textoCelda(celda(fila, "item")),
        fecha: prestacion.corta,
        fechaISO: prestacion.iso,
        // La celda trae fecha y hora juntas, rellenadas a ancho fijo.
        fechaTransaccion: textoCelda(celda(fila, "fechaTransaccion")).replace(
          /\s+/g,
          " "
        ),
        credencial: textoCelda(celda(fila, "credencial")),
        afiliado: textoCelda(celda(fila, "afiliado")),
        condicionIva: textoCelda(celda(fila, "condicionIva")),
        codigo: textoCelda(celda(fila, "codigo")),
        descripcion: textoCelda(celda(fila, "descripcion")),
        cantidad: numeroDeCelda(celda(fila, "cantidad")),
        autorizacion: textoCelda(celda(fila, "autorizacion")),
        copago: numeroDeCelda(celda(fila, "copago")),
        matricula,
        provincia,
        efector: textoCelda(celda(fila, "efector")),
        efectorCuit: textoCelda(celda(fila, "efectorCuit")),
        efectorNombre: textoCelda(celda(fila, "efectorNombre")),
        prescriptorMatricula: textoCelda(celda(fila, "prescriptorMatricula")),
        prescriptorNombre: textoCelda(celda(fila, "prescriptorNombre")),
        terminal: textoCelda(celda(fila, "terminal")),
        terminalDomicilio: textoCelda(celda(fila, "terminalDomicilio")),
      };
    })
    // Los reportes pueden cerrar con filas de totales o separadores.
    .filter((f) => f.item || f.ticket || f.codigo);

  // Cuántos ítems trae cada ticket, para poder mostrar "2/3" en los que se
  // repiten. Se cuenta sobre las filas ya filtradas.
  const porTicket = new Map<string, number>();
  for (const f of crudas) porTicket.set(f.ticket, (porTicket.get(f.ticket) ?? 0) + 1);

  const vistos = new Map<string, number>();
  const prestaciones: PrestacionSwiss[] = crudas.map((f) => {
    const indice = vistos.get(f.ticket) ?? 0;
    vistos.set(f.ticket, indice + 1);
    return { ...f, indice, deTotal: porTicket.get(f.ticket) ?? 1 };
  });

  const primera = filasDeDatos(enc)[0] ?? [];
  const cabecera: CabeceraSwiss = {
    prestador: textoCelda(celda(primera, "prestador")),
    razonSocial: textoCelda(celda(primera, "razonSocial")),
    cuit: textoCelda(celda(primera, "cuit")),
  };

  return {
    cabecera,
    prestaciones,
    rango: rangoDeFechas(prestaciones),
    hoja: enc.hoja,
  };
}
