// Lectura de la planilla de importación de prestaciones.
//
// Es el formato propio del Colegio (plantilla que se descarga en la pantalla; columnas
// definidas en `cmc_api/app/modules/importaciones/planilla/columnas.py`). A diferencia de
// los reportes de las obras sociales, acá no se interpreta nada: cada celda pasa como
// texto y el backend valida todo. Lo único que se hace es ubicar las columnas por su
// título, ignorar las filas vacías y recordar el número de fila del Excel.

import type { FilaPlanilla } from "./importarPrestaciones.api";

export interface ReportePlanilla {
  filas: FilaPlanilla[];
  hoja: string;
}

type Clave = keyof Omit<FilaPlanilla, "fila">;

/** Título de la plantilla (sin acentos, sin «*», con «_») → campo de la fila. */
const COLUMNAS: Record<string, Clave> = {
  TIPO: "tipo",
  NRO_SOCIO: "nroSocio",
  MATRICULA: "matricula",
  CLINICA: "clinica",
  FECHA: "fecha",
  AUTORIZACION: "autorizacion",
  CODIGO: "codigo",
  VIA: "via",
  CANTIDAD: "cantidad",
  SESION: "sesion",
  PORCENTAJE: "porcentaje",
  NRO_AFILIADO: "nroAfiliado",
  AFILIADO: "afiliado",
  CALCULO: "calculo",
  HONORARIOS: "honorarios",
  GASTOS: "gastos",
  AYUDANTE: "ayudante",
  COSEGURO: "coseguro",
  EQUIPO: "equipo",
  ROL: "rol",
  COMENTARIOS: "comentarios",
};

const OBLIGATORIAS = ["TIPO", "NRO_SOCIO", "CODIGO", "CANTIDAD"];
const HOJA_DE_DATOS = "Prestaciones";
/** Cuántas filas de arriba se miran buscando los títulos. */
const FILAS_A_EXPLORAR = 10;

const titulo = (v: unknown): string =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();

const dos = (n: number) => String(n).padStart(2, "0");

/** Las fechas de Excel llegan a medianoche UTC: se leen con getters UTC o, en un huso al
 * oeste de Greenwich —el nuestro—, se correrían un día para atrás. */
const iso = (d: Date) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;

const esFecha = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime());

function celda(v: unknown, clave: Clave): string {
  if (esFecha(v)) return clave === "fecha" ? iso(v) : `${dos(v.getUTCDate())}/${dos(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v ?? "").trim();
}

export async function leerPlanilla(file: File): Promise<ReportePlanilla> {
  // `xlsx` se importa acá adentro para que no entre al bundle de quien no sube planillas.
  const XLSX = await import("xlsx");
  const libro = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });

  // La hoja «Prestaciones» primero; si no está (la renombraron), las demás en orden.
  const hojas = [
    ...libro.SheetNames.filter((n) => n === HOJA_DE_DATOS),
    ...libro.SheetNames.filter((n) => n !== HOJA_DE_DATOS),
  ];

  for (const nombre of hojas) {
    const ws = libro.Sheets[nombre];
    if (!ws?.["!ref"]) continue;
    const primeraFila = XLSX.utils.decode_range(ws["!ref"]).s.r + 1; // número de Excel de la 1.ª fila leída
    const grilla = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", blankrows: true });

    for (let i = 0; i < Math.min(grilla.length, FILAS_A_EXPLORAR); i++) {
      const columnas = new Map<number, Clave>();
      grilla[i].forEach((c, j) => {
        const clave = COLUMNAS[titulo(c)];
        if (clave && ![...columnas.values()].includes(clave)) columnas.set(j, clave);
      });
      if (columnas.size < 3) continue;

      const presentes = new Set(grilla[i].map(titulo));
      const faltan = OBLIGATORIAS.filter((c) => !presentes.has(c));
      if (faltan.length) {
        throw new Error(`A la planilla le faltan las columnas ${faltan.join(", ")}. Descargá la plantilla y usala tal cual.`);
      }

      const filas: FilaPlanilla[] = [];
      for (let k = i + 1; k < grilla.length; k++) {
        const fila: FilaPlanilla = {
          fila: primeraFila + k, tipo: "", nroSocio: "", matricula: "", clinica: "", fecha: "", autorizacion: "",
          codigo: "", via: "", cantidad: "", sesion: "", porcentaje: "", nroAfiliado: "", afiliado: "",
          calculo: "", honorarios: "", gastos: "", ayudante: "", coseguro: "", equipo: "", rol: "", comentarios: "",
        };
        for (const [j, clave] of columnas) fila[clave] = celda(grilla[k][j], clave);
        const vacia = [...columnas.values()].every((c) => fila[c] === "");
        if (!vacia) filas.push(fila);
      }

      if (!filas.length) throw new Error("La planilla no tiene ninguna prestación para importar.");
      return { filas, hoja: nombre };
    }
  }
  throw new Error("No encontramos las columnas de la plantilla (TIPO, NRO_SOCIO, CODIGO, CANTIDAD…). Descargá la plantilla y usala tal cual.");
}
