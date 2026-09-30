import { downloadExcelSheet } from "@/app/shared/lib/excelExport";
import { etiquetaGaleno } from "@/app/features/nomenclador/galenos";
import { CONSULTA_COMUN_CODE } from "./boletinConsultaComun.constants";
import { formatApiDate } from "./boletinConsultaComun.helpers";
import type { ConsultaComunItem, ObservacionesMap } from "./boletinConsultaComun.types";

/**
 * Las columnas de galeno ya no son nueve fijas: cada obra social tiene las
 * suyas. Se arma la unión de todas para que la hoja quede rectangular, y la que
 * no tenga una queda vacía —no en cero, que se leería como un precio pactado.
 */
function columnasDeGaleno(items: ConsultaComunItem[]): string[] {
  const vistas = new Set<string>();
  for (const item of items) {
    for (const g of item.galenos) vistas.add(etiquetaGaleno(g));
  }
  return [...vistas].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

export async function generateConsultaComunExcel(
  items: ConsultaComunItem[],
  observaciones: ObservacionesMap
) {
  const columnas = columnasDeGaleno(items);

  const rows = [...items].sort((a, b) => b.valor - a.valor).map((item) => {
    const valores = new Map(item.galenos.map((g) => [etiquetaGaleno(g), g.valor]));
    const galenos: Record<string, number | string> = {};
    for (const col of columnas) galenos[col] = valores.get(col) ?? "";

    return {
      "N°": item.nro,
      "Obra Social": item.nombre,
      [`Valor (${CONSULTA_COMUN_CODE})`]: item.valor,
      "Fecha Cambio": formatApiDate(item.fechaCambio),
      "Observación": observaciones[item.nro] ?? "",
      ...galenos,
    };
  });

  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  await downloadExcelSheet(
    `Boletin-ConsultaComun-${date}.xlsx`,
    "Consulta Común",
    rows
  );
}
