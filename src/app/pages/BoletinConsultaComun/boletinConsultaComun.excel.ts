import { etiquetaGaleno } from "@/app/features/nomenclador/galenos";
import { hoyISO } from "@/app/shared/lib/fechas";
import { exportarExcel } from "@/app/pages/Reportes/exportar";
import type { ColumnaExport } from "@/app/pages/Reportes/exportar";
import { CONSULTA_COMUN_CODE } from "./boletinConsultaComun.constants";
import { formatApiDate } from "./boletinConsultaComun.helpers";
import type { ConsultaComunItem, ObservacionesMap } from "./boletinConsultaComun.types";

/** Las columnas de galeno ya no son nueve fijas: cada obra social tiene las suyas. */
function columnasDeGaleno(items: ConsultaComunItem[]): string[] {
  const vistas = new Set<string>();
  for (const item of items) {
    for (const g of item.galenos) vistas.add(etiquetaGaleno(g));
  }
  return [...vistas].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

/** Excel del boletín, con la misma hoja que los reportes y el padrón (título en banda azul, tarjetas de resumen, tabla sin grilla). */
export async function generateConsultaComunExcel(
  items: ConsultaComunItem[],
  observaciones: ObservacionesMap
) {
  const filas = [...items].sort((a, b) => b.valor - a.valor);

  const columnas: ColumnaExport<ConsultaComunItem>[] = [
    { header: "N°", value: (i) => i.nro },
    { header: "Obra social", value: (i) => i.nombre },
    { header: `Valor (${CONSULTA_COMUN_CODE})`, value: (i) => i.valor, tipo: "moneda" },
    { header: "Último cambio", value: (i) => formatApiDate(i.fechaCambio) },
    { header: "Observación", value: (i) => observaciones[i.nro] ?? "" },
    ...columnasDeGaleno(items).map(
      (etiqueta): ColumnaExport<ConsultaComunItem> => ({
        header: etiqueta,
        value: (i) => i.galenos.find((g) => etiquetaGaleno(g) === etiqueta)?.valor ?? null,
        tipo: "moneda",
      }),
    ),
  ];

  const hoy = new Date();
  await exportarExcel({
    encabezado: "Boletín de consulta común",
    titulo: "Consulta común",
    periodo: hoy.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    obraSocial: "Todas las obras sociales",
    columnas,
    filas,
    // El total de una columna de precios unitarios no significa nada.
    sinTotal: true,
    nombre: `Boletin-ConsultaComun-${hoyISO().replace(/-/g, "")}`,
  });
}
