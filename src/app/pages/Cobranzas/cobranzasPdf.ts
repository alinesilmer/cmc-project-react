// PDF de Cobranzas (Formato A): deuda por concepto y socio, con el filtro aplicado en la cabecera.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, fechaCorta, importe, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";

export type FilaCobranzaPdf = {
  socio: string;
  nroSocio: number;
  concepto: string;
  periodo: string;
  origen: string;
  estado: string;
  saldo: number;
};

export type FiltroCobranzaPdf = {
  /** «Octubre 2026», «Julio a septiembre 2026» o «Todos los períodos». */
  periodo: string;
  /** «con saldo», más lo que se haya elegido en pantalla. */
  filtro: string;
};

const capitalizar = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function armar(filas: FilaCobranzaPdf[], f: FiltroCobranzaPdf, logo: string | null, paginas: string): Promise<PdfFormatoA> {
  return PdfFormatoA.crear().then((pdf) => {
    pdf.cabecera({
      titulo: "Cobranzas",
      subtitulo: "Deudas por concepto y socio",
      logo,
      meta: [{ t: "", b: f.periodo }, { t: `Filtro: ${f.filtro}` }, { t: `Emitido el ${fechaCorta()}` }],
    });
    pdf.datos([["Período", f.periodo], ["Filtro", capitalizar(f.filtro)], ["Registros", String(filas.length)], ["Páginas", paginas]]);

    const cuerpo: Fila[] = filas.map((r) => [
      { t: r.socio, sub: `Socio ${r.nroSocio}` },
      r.concepto,
      r.periodo,
      r.origen,
      capitalizar(r.estado),
      importe(r.saldo),
    ]);
    if (filas.length > 0) {
      cuerpo.push({ total: true, celdas: [{ t: "Total", cols: 5 }, importe(filas.reduce((s, r) => s + r.saldo, 0))] });
    }
    pdf.seccion("Detalle");
    pdf.tabla(
      [
        { titulo: "Socio", ancho: 27 },
        { titulo: "Concepto", ancho: 27 },
        { titulo: "Período", ancho: 13 },
        { titulo: "Origen", ancho: 12 },
        { titulo: "Estado", ancho: 10 },
        { titulo: "Saldo", ancho: 11, der: true },
      ],
      cuerpo,
    );
    return pdf;
  });
}

export async function generarCobranzasPdf(filas: FilaCobranzaPdf[], f: FiltroCobranzaPdf, logo: string | null): Promise<jsPDF> {
  // La cantidad de hojas va arriba de todo: se arma una vez para contarlas y otra con el número ya puesto.
  const prueba = await armar(filas, f, logo, "—");
  const paginas = prueba.doc.getNumberOfPages();
  const pdf = await armar(filas, f, logo, String(paginas));
  return pdf.cerrar("Cobranzas");
}
