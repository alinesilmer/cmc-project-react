// Totales de los recibos de un pago, por socio (Formato A): brutos (honorarios, gastos y total) o netos
// (con deducciones, débitos, créditos, adelantos y compensaciones). Salen del detalle que guardó cada recibo.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, conSigno, fechaCorta, importe, periodoLargo, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";
import type { ReciboParaPdf } from "./reciboPdf";

export type TipoTotales = "brutos" | "netos";

type Fila_ = {
  nombre: string;
  nroSocio: number | null;
  honorarios: number;
  gastos: number;
  bruto: number;
  deducciones: number;
  debitos: number;
  creditos: number;
  adelantos: number;
  compensaciones: number;
  neto: number;
};

const num = (n: number | string | null | undefined) => Number(n ?? 0);

function filaDe(r: ReciboParaPdf): Fila_ {
  const res = r.detalle_json?.resumen;
  const info = r.detalle_json?.info_medico;
  const honorarios = num(res?.honorarios);
  const gastos = num(res?.gastos);
  return {
    nombre: info?.nombre ?? `Médico #${r.medico_id}`,
    nroSocio: info?.nro_socio ?? null,
    honorarios,
    gastos,
    bruto: res?.bruto != null ? num(res.bruto) : honorarios + gastos,
    deducciones: num(res?.deducciones),
    debitos: num(res?.debitos),
    creditos: num(res?.creditos),
    adelantos: num(r.detalle_json?.detalle?.adelantos?.total),
    compensaciones: num(res?.compensaciones),
    neto: num(r.total_neto),
  };
}

const suma = (filas: Fila_[], k: keyof Omit<Fila_, "nombre" | "nroSocio">) => filas.reduce((s, f) => s + f[k], 0);
/** Importe con signo; el cero va sin signo. */
const firmado = (n: number) => (n === 0 ? importe(0) : conSigno(n));

export async function generarTotalesRecibosPdf(
  recibos: ReciboParaPdf[],
  tipo: TipoTotales,
  pago: { mes: number; anio: number },
  logo: string | null,
  /** Estado elegido en el filtro de la pantalla («Emitido»), si hay uno: se aclara en la cabecera. */
  filtro?: string,
): Promise<jsPDF> {
  const filas = recibos.map(filaDe).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const nroPago = `${String(pago.mes).padStart(2, "0")}/${pago.anio}`;
  const netos = tipo === "netos";

  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: netos ? "Totales netos" : "Totales brutos",
    logo,
    meta: [
      { t: "Pago ", b: `Nº ${nroPago}` },
      { t: periodoLargo(pago.mes, pago.anio) },
      ...(filtro ? [{ t: "", b: `Filtro: ${filtro}` }] : []),
      { t: `Emitido el ${fechaCorta()}` },
    ],
  });

  const socio = (f: Fila_) => ({ t: f.nombre, sub: f.nroSocio != null ? String(f.nroSocio) : undefined });

  let cuerpo: Fila[];
  if (netos) {
    cuerpo = filas.map((f) => [
      socio(f), importe(f.honorarios), importe(f.gastos), firmado(-f.deducciones), firmado(-f.debitos),
      firmado(f.creditos), importe(f.adelantos), firmado(f.compensaciones), importe(f.neto),
    ]);
    if (filas.length > 0) {
      cuerpo.push({
        total: true,
        celdas: [
          "Total", importe(suma(filas, "honorarios")), importe(suma(filas, "gastos")), firmado(-suma(filas, "deducciones")),
          firmado(-suma(filas, "debitos")), firmado(suma(filas, "creditos")), importe(suma(filas, "adelantos")),
          firmado(suma(filas, "compensaciones")), importe(suma(filas, "neto")),
        ],
      });
    }
  } else {
    cuerpo = filas.map((f) => [socio(f), importe(f.honorarios), importe(f.gastos), importe(f.bruto)]);
    if (filas.length > 0) {
      cuerpo.push({ total: true, celdas: ["Total", importe(suma(filas, "honorarios")), importe(suma(filas, "gastos")), importe(suma(filas, "bruto"))] });
    }
  }

  pdf.seccion("Detalle", `${filas.length} ${filas.length === 1 ? "socio" : "socios"}`);
  pdf.tabla(
    netos
      ? [
          { titulo: "Socio", ancho: 18 },
          { titulo: "Honorarios", ancho: 11.5, der: true },
          { titulo: "Gastos", ancho: 10.5, der: true },
          { titulo: "Deducciones", ancho: 11, der: true },
          { titulo: "Débitos", ancho: 10.5, der: true },
          { titulo: "Créditos", ancho: 9, der: true },
          { titulo: "Adelantos", ancho: 9.5, der: true },
          { titulo: "Comp", ancho: 8.5, der: true },
          { titulo: "Total", ancho: 11.5, der: true },
        ]
      : [
          { titulo: "Socio" },
          { titulo: "Honorarios", ancho: 20, der: true },
          { titulo: "Gastos", ancho: 17, der: true },
          { titulo: "Total", ancho: 20, der: true },
        ],
    cuerpo,
    { compacta: netos },
  );
  return pdf.cerrar(`${netos ? "Totales netos" : "Totales brutos"} · pago ${nroPago}`);
}
