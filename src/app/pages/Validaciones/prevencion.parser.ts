import { esFechaValida } from "@/app/pages/Validaciones/utiles";
import { fechaCorta } from "@/app/pages/Validaciones/utiles";
import { fechaISO } from "@/app/pages/Validaciones/utiles";

// Lectura del "Reporte de Facturación" que emite Prevención Salud.

/** Una práctica suelta, ya separada de la celda que la traía. */
interface PracticaPrevencion {
  codigo: string;
  descripcion: string;
}

/** Una fila del reporte = una autorización, con sus prácticas sin desarmar. */
interface AutorizacionPrevencion {
  nroAutorizacion: string;
  fecha: string;
  /** `fecha` en ISO (YYYY-MM-DD) para ordenar y comparar; "" si no se pudo leer. */
  fechaISO: string;
  afiliado: string;
  profesional: string;
  /** Tal cual vino: puede ser "NO INFORMADO". */
  matricula: string;
  conformidad: string;
  practicas: PracticaPrevencion[];
  estado: string;
}

/** Grano en el que esto se factura: una práctica de una autorización. */
export interface PrestacionPrevencion
  extends Omit<AutorizacionPrevencion, "practicas"> {
  codigo: string;
  descripcion: string;
  /** Posición dentro de su autorización, para distinguir las multi-práctica. */
  indice: number;
  /** Cuántas prácticas trajo la autorización de la que salió. */
  deTotal: number;
}

export interface ReportePrevencion {
  autorizaciones: AutorizacionPrevencion[];
  prestaciones: PrestacionPrevencion[];
  /** "21/07/2026 al 20/08/2026" — lo declara la hoja Resumen, si viene. */
  rango: string;
  /** Nombre de la hoja de la que se leyeron las filas. */
  hoja: string;
}

type Clave = keyof Omit<AutorizacionPrevencion, "fechaISO">;

interface ColumnaPrevencion {
  key: Clave;
  /** Encabezados aceptados, ya normalizados. */
  alias: string[];
}

const COLUMNAS: ColumnaPrevencion[] = [
  {
    key: "nroAutorizacion",
    alias: [
      "NUMERO DE AUTORIZACION",
      "NUMERO AUTORIZACION",
      "NRO DE AUTORIZACION",
      "NRO AUTORIZACION",
      "N DE AUTORIZACION",
      "N AUTORIZACION",
      "AUTORIZACION",
    ],
  },
  {
    key: "fecha",
    alias: [
      "FECHA DE REALIZACION",
      "FECHA REALIZACION",
      "FECHA DE PRESTACION",
      "FECHA PRESTACION",
      "FECHA",
    ],
  },
  {
    key: "afiliado",
    alias: ["AFILIADO", "PACIENTE", "NOMBRE DEL AFILIADO", "APELLIDO Y NOMBRE"],
  },
  {
    key: "profesional",
    alias: [
      "PROFESIONAL EFECTOR",
      "PROFESIONAL",
      "EFECTOR",
      "MEDICO",
      "PRESTADOR",
    ],
  },
  {
    key: "matricula",
    alias: [
      "MATRICULA MP",
      "MATRICULA PROVINCIAL",
      "MAT PROVINCIAL",
      "MATRICULA",
      "MAT PROV",
      "MAT MP",
      "MP",
    ],
  },
  { key: "conformidad", alias: ["CONFORMIDAD"] },
  {
    key: "practicas",
    alias: [
      "PRACTICAS REALIZADAS",
      "PRACTICA REALIZADA",
      "PRACTICAS",
      "PRACTICA",
      "PRESTACIONES",
      "PRESTACION",
      "CODIGO",
    ],
  },
  { key: "estado", alias: ["ESTADO"] },
];

/** Mayúsculas sin acentos, paréntesis ni puntuación: así "Práctica(s) Realizada(s)", "PRACTICAS REALIZADAS" y "practicas realizadas" caen todas en el mismo alias. */
const normalizar = (valor: unknown) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[()]/g, "")
    .replace(/[.°ºª:,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
const texto = (valor: unknown) =>
  valor instanceof Date && esFechaValida(valor)
    ? fechaCorta(valor)
    : String(valor ?? "").trim();

/** Índice de cada columna buscada dentro de la fila de encabezados. */
function mapearColumnas(fila: unknown[]): Partial<Record<Clave, number>> {
  const mapa: Partial<Record<Clave, number>> = {};
  fila.forEach((celda, i) => {
    const titulo = normalizar(celda);
    if (!titulo) return;
    const col = COLUMNAS.find(
      (c) => mapa[c.key] === undefined && c.alias.includes(titulo)
    );
    if (col) mapa[col.key] = i;
  });
  return mapa;
}

/** "420101 Consulta." → { codigo: "420101", descripcion: "Consulta." } */
function partirPracticas(valor: unknown): PracticaPrevencion[] {
  return String(valor ?? "")
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const m = linea.match(/^(\d{4,})\s+(.*)$/);
      return m
        ? { codigo: m[1], descripcion: m[2].trim() }
        : { codigo: "", descripcion: linea };
    });
}

/** El rango que declara la hoja "Resumen", si el archivo la trae. */
function leerRango(grilla: unknown[][]): string {
  for (const fila of grilla.slice(0, 10)) {
    if (normalizar(fila?.[0]).startsWith("RANGO")) return texto(fila?.[1]);
  }
  return "";
}

const FILAS_ENCABEZADO = 15;
const MIN_COLUMNAS = 3;

const ERROR_ENCABEZADOS =
  "No encontramos los encabezados del reporte de Prevención Salud " +
  "(Número de Autorización, Fecha de Realización, Afiliado, Profesional " +
  "Efector, Matrícula MP, Práctica(s) Realizada(s)).";

export async function leerArchivoPrevencion(
  file: File
): Promise<ReportePrevencion> {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  const aGrilla = (nombre: string): unknown[][] => {
    const hoja = wb.Sheets[nombre];
    if (!hoja) return [];
    return XLSX.utils.sheet_to_json<unknown[]>(hoja, {
      header: 1,
      defval: "",
      blankrows: false,
    });
  };

  // El reporte trae dos hojas ("Reporte Facturacion" y "Resumen") y no hay nada que garantice el orden.
  let hoja = "";
  let grilla: unknown[][] = [];
  let indiceEncabezado = -1;
  let columnas: Partial<Record<Clave, number>> = {};

  for (const nombre of wb.SheetNames) {
    const g = aGrilla(nombre);
    for (let i = 0; i < Math.min(g.length, FILAS_ENCABEZADO); i++) {
      const mapa = mapearColumnas(g[i] ?? []);
      if (Object.keys(mapa).length >= MIN_COLUMNAS) {
        hoja = nombre;
        grilla = g;
        indiceEncabezado = i;
        columnas = mapa;
        break;
      }
    }
    if (indiceEncabezado !== -1) break;
  }

  if (indiceEncabezado === -1) throw new Error(ERROR_ENCABEZADOS);

  const celda = (fila: unknown[], key: Clave) => {
    const i = columnas[key];
    return i === undefined ? "" : fila[i];
  };

  const autorizaciones: AutorizacionPrevencion[] = grilla
    .slice(indiceEncabezado + 1)
    .map((fila) => {
      const cruda = celda(fila, "fecha");
      return {
        nroAutorizacion: texto(celda(fila, "nroAutorizacion")),
        fecha: texto(cruda),
        fechaISO:
          cruda instanceof Date && esFechaValida(cruda) ? fechaISO(cruda) : "",
        afiliado: texto(celda(fila, "afiliado")),
        profesional: texto(celda(fila, "profesional")),
        matricula: texto(celda(fila, "matricula")),
        conformidad: texto(celda(fila, "conformidad")),
        practicas: partirPracticas(celda(fila, "practicas")),
        estado: texto(celda(fila, "estado")),
      };
    })
    // Los reportes suelen cerrar con filas de totales o separadores.
    .filter((a) => a.nroAutorizacion || a.afiliado || a.practicas.length > 0);

  const prestaciones: PrestacionPrevencion[] = autorizaciones.flatMap((a) => {
    const { practicas, ...resto } = a;
    return practicas.map((p, i) => ({
      ...resto,
      codigo: p.codigo,
      descripcion: p.descripcion,
      indice: i,
      deTotal: practicas.length,
    }));
  });

  // El rango sale de la otra hoja: la que no es la de los datos.
  const otra = wb.SheetNames.find((n) => n !== hoja);
  const rango = otra ? leerRango(aGrilla(otra)) : "";

  return { autorizaciones, prestaciones, rango, hoja };
}

/** `true` si la obra social rechazó o no autorizó la práctica. */
export const fueRechazada = (estado: string): boolean =>
  /RECHAZ|NO AUTORIZ/i.test(estado);
