import { downloadExcelSheet } from "../../lib/excelExport";
import { CONSULTA_COMUN_CODE } from "./boletinConsultaComun.constants";
import { formatApiDate } from "./boletinConsultaComun.helpers";
import type { ConsultaComunItem, ObservacionesMap } from "./boletinConsultaComun.types";

export async function generateConsultaComunExcel(
  items: ConsultaComunItem[],
  observaciones: ObservacionesMap
) {
  const rows = [...items].sort((a, b) => b.valor - a.valor).map((item) => ({
    "N°": item.nro,
    "Obra Social": item.nombre,
    [`Valor (${CONSULTA_COMUN_CODE})`]: item.valor,
    "Fecha Cambio": formatApiDate(item.fechaCambio),
    "Observación": observaciones[item.nro] ?? "",
    "GALENO Quirúrgico": item.galeno.quirurgico,
    "Gastos Quirúrgicos": item.galeno.gastosQuirurgicos,
    "GALENO Práctica": item.galeno.practica,
    "GALENO Radiológico": item.galeno.radiologico,
    "Gastos Radiológico": item.galeno.gastosRadiologico,
    "Gastos Bioquímicos": item.galeno.gastosBioquimicos,
    "Otros Gastos": item.galeno.otrosGastos,
    "GALENO Cirugía Adultos": item.galeno.cirugiaAdultos,
    "GALENO Cirugía Infantil": item.galeno.cirugiaInfantil,
  }));

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
