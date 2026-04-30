import { CONSULTA_COMUN_CODE } from "./boletinConsultaComun.constants";
import { formatApiDate } from "./boletinConsultaComun.helpers";
import type { ConsultaComunItem, ObservacionesMap } from "./boletinConsultaComun.types";

export async function generateConsultaComunExcel(
  items: ConsultaComunItem[],
  observaciones: ObservacionesMap
) {
  const [{ utils, write }, { saveAs }] = await Promise.all([
    import("xlsx"),
    import("file-saver"),
  ]);

  const rows = items.map((item) => ({
    "N°": item.nro,
    "Obra Social": item.nombre,
    [`Valor (${CONSULTA_COMUN_CODE})`]: item.valor,
    "Fecha Cambio": formatApiDate(item.fechaCambio),
    "Observación": observaciones[item.nro] ?? "",
    "GALENO Quirúrgico": item.galeno.quirurgico,
    "GALENO Práctica": item.galeno.practica,
    "GALENO Radiológico": item.galeno.radiologico,
    "GALENO Cirugía Adultos": item.galeno.cirugiaAdultos,
    "GALENO Cirugía Infantil": item.galeno.cirugiaInfantil,
  }));

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Consulta Común");

  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const filename = `Boletin-ConsultaComun-${date}.xlsx`;

  const buffer = write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), filename);
}
