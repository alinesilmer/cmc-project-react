import type { ChequeoPadron } from "@/app/pages/UsersList/auditoria.api";
import type { ExportField, ExportRow } from "./types";
import { pickCuit, pickMatriculaProv, pickNroPrestador, safeStr } from "./helpers";

/** Un chequeo del recuento, con los prestadores que caen en él. */
export type ChequeoRecuento = ChequeoPadron & { filas: ExportRow[] };

// Columnas que se calculan a partir de otra: si falta la de origen ya se cuenta ahí, y contarla dos veces infla el resumen.
const DERIVADAS: Record<string, string> = { antig: "ingreso", espall: "esp" };

const valor = (v: unknown): string => {
  const s = safeStr(v).trim();
  return s === "0" ? "" : s;
};

/** Las filas cuyo valor aparece en más de una. Las vacías no cuentan. */
function repetidas(filas: ExportRow[], leer: (f: ExportRow) => string): ExportRow[] {
  const porValor = new Map<string, ExportRow[]>();
  for (const f of filas) {
    const v = valor(leer(f));
    if (!v) continue;
    const grupo = porValor.get(v) ?? [];
    grupo.push(f);
    porValor.set(v, grupo);
  }
  return [...porValor.values()].filter((g) => g.length > 1).flat();
}

/** Recuento de errores de un padrón: duplicados y datos faltantes. */
export function recontar(filas: ExportRow[], campos: ExportField[]): ChequeoRecuento[] {
  const chequeos: ChequeoRecuento[] = [];

  const duplicados: [string, string, (f: ExportRow) => string][] = [
    ["dup-socio", "N.º de socio repetido", pickNroPrestador],
    ["dup-matricula", "Matrícula provincial repetida", pickMatriculaProv],
    ["dup-cuit", "CUIT repetido", pickCuit],
  ];
  for (const [id, titulo, leer] of duplicados) {
    const casos = repetidas(filas, leer);
    chequeos.push({
      id,
      titulo,
      descripcion: "Más de un prestador de este padrón comparte el mismo valor.",
      severidad: "alta",
      casos: casos.length,
      filas: casos,
    });
  }

  const elegidas = new Set(campos.map((c) => c.key));
  for (const campo of campos) {
    const origen = DERIVADAS[campo.key];
    if (origen && elegidas.has(origen)) continue;
    const casos = filas.filter((f) => !valor(campo.get(f)));
    chequeos.push({
      id: `falta-${campo.key}`,
      titulo: `Sin ${campo.label.toLowerCase()}`,
      descripcion: "Prestadores con esta columna vacía.",
      severidad: "media",
      casos: casos.length,
      filas: casos,
    });
  }

  return chequeos;
}
