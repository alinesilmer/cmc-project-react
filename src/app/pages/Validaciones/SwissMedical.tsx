import { useMemo, useState } from "react";

import ReporteOS from "./components/reporte/ReporteOS";
import type { DatoResumen } from "./components/reporte/ReporteOS";
import MedicoResuelto from "./components/reporte/MedicoResuelto";
import { useReporteConPadron } from "./components/reporte/useReporteConPadron";
import r from "./components/reporte/reporte.module.scss";
import { buscarPorMatricula, esIdentificado } from "./medicosPorMatricula";
import type { ResultadoMatricula } from "./medicosPorMatricula";
import { esDeOtraProvincia, leerArchivoSwiss } from "./swissMedical.parser";
import type { PrestacionSwiss, ReporteSwiss } from "./swissMedical.parser";
import { formatMoneda } from "./validaciones.types";
import s from "./SwissMedical.module.scss";

/**
 * Lectura del reporte de transacciones de Swiss Medical (O.S. 256).
 *
 * Es la herramienta del Colegio, no del médico: Swiss manda un archivo mensual
 * de todo el padrón y hay que repartirlo entre los efectores antes de
 * facturarlo. El médico no tiene nada que hacer acá —`destinoObraSocial` lo
 * manda al portal de Swiss, y `MedicoRouteGuard` le corta la URL directa.
 *
 * **Todavía no graba.** Swiss Medical no está en `obras.POR_NRO` del backend,
 * así que `POST /api/validaciones/prestaciones` responde 422. Y aunque
 * estuviera, ese endpoint graba de a una prestación para el médico logueado,
 * mientras que este archivo son ~1.100 ítems de ~180 médicos distintos: falta
 * el import masivo del lado de la API, igual que en Prevención Salud.
 */

type Fila = PrestacionSwiss & {
  medico: ResultadoMatricula;
  /** Por qué hay que mirar esta fila a mano; "" si está resuelta. */
  revisar: string;
};

const contarPrestaciones = (rep: ReporteSwiss) => rep.prestaciones.length;

const MENSAJE_VACIO = "El archivo no tiene ninguna transacción para leer.";

const AYUDA =
  "Se acepta el reporte de transacciones de Swiss Medical (.xlsx, .xls o " +
  ".csv), con las columnas transacción_ticket, fecha_prestacion, credencial, " +
  "apellido_afiliado, prestación, cantidad, copago y efector_matricula.";

const PIE =
  "Por ahora esto se lee y se revisa, pero todavía no queda guardado: falta " +
  "el import de Swiss Medical del lado de la API.";

export default function SwissMedical() {
  const estado = useReporteConPadron(leerArchivoSwiss, {
    contar: contarPrestaciones,
    mensajeVacio: MENSAJE_VACIO,
  });
  const [soloRevisar, setSoloRevisar] = useState(false);

  const { reporte, indice } = estado;

  const filas: Fila[] = useMemo(() => {
    if (!reporte) return [];
    return reporte.prestaciones.map((p) => {
      const medico = indice
        ? buscarPorMatricula(indice, p.matricula)
        : ({ tipo: "sin-matricula" } as const);

      // La provincia se avisa aunque la matrícula haya matcheado: justamente el
      // riesgo es que matchee contra el médico equivocado.
      const revisar = esDeOtraProvincia(p)
        ? `Matrícula de otra provincia (${p.provincia})`
        : esIdentificado(medico)
          ? ""
          : "Sin médico";

      return { ...p, medico, revisar };
    });
  }, [reporte, indice]);

  const visibles = useMemo(
    () => (soloRevisar ? filas.filter((f) => f.revisar) : filas),
    [filas, soloRevisar]
  );

  const totales = useMemo(
    () =>
      visibles.reduce(
        (acc, f) => ({
          cantidad: acc.cantidad + f.cantidad,
          copago: acc.copago + f.copago,
        }),
        { cantidad: 0, copago: 0 }
      ),
    [visibles]
  );

  const aRevisar = useMemo(() => filas.filter((f) => f.revisar).length, [filas]);

  const resumen: DatoResumen[] = useMemo(() => {
    const otraProvincia = filas.filter(esDeOtraProvincia).length;
    const copago = filas.reduce((a, f) => a + f.copago, 0);

    const datos: DatoResumen[] = [
      { valor: new Set(filas.map((f) => f.ticket)).size, label: "Tickets" },
      { valor: filas.length, label: "Ítems" },
      { valor: new Set(filas.map((f) => f.matricula)).size, label: "Matrículas" },
      { valor: filas.length - aRevisar, label: "Con médico" },
      { valor: aRevisar, label: "A revisar", alerta: aRevisar > 0 },
    ];
    if (otraProvincia > 0) {
      datos.push({ valor: otraProvincia, label: "Otra provincia", alerta: true });
    }
    if (copago > 0) datos.push({ valor: formatMoneda(copago), label: "Copago" });
    return datos;
  }, [filas, aRevisar]);

  return (
    <ReporteOS
      titulo="Swiss Medical"
      subtitulo="Subí el reporte de transacciones y revisá cómo quedó repartido entre los médicos antes de facturarlo."
      ayuda={AYUDA}
      estado={estado}
      detalleArchivo={reporte?.rango}
      resumen={resumen}
      hayFilas={filas.length > 0}
      pie={PIE}
      filtros={
        aRevisar > 0 ? (
          <label className={r.filtro}>
            <input
              type="checkbox"
              checked={soloRevisar}
              onChange={(e) => setSoloRevisar(e.target.checked)}
            />
            Ver sólo las {aRevisar} que hay que revisar
          </label>
        ) : undefined
      }
    >
      <div className={r.tableWrap}>
        <table className={r.table}>
          <thead>
            <tr>
              <th className={r.num}>#</th>
              <th>Ticket</th>
              <th>Fecha</th>
              <th>Afiliado</th>
              <th className={r.num}>Matrícula</th>
              <th>Médico</th>
              <th className={r.num}>Código</th>
              <th>Prestación</th>
              <th className={r.num}>Cant.</th>
              <th className={r.num}>Copago</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={f.item} className={f.revisar ? s.revisar : undefined}>
                <td className={r.num}>{i + 1}</td>
                <td>
                  {f.ticket}
                  {f.deTotal > 1 && (
                    <span className={r.parte}>
                      {f.indice + 1}/{f.deTotal}
                    </span>
                  )}
                  {f.autorizacion && (
                    <div className={r.meta}>{f.autorizacion}</div>
                  )}
                </td>
                <td>{f.fecha}</td>
                <td className={s.afiliado}>
                  {f.afiliado}
                  <div className={r.meta}>{f.credencial}</div>
                </td>
                <td className={r.num}>{f.matricula || "—"}</td>
                <td>
                  <MedicoResuelto
                    resultado={f.medico}
                    nombreEnReporte={f.efectorNombre}
                    advertencia={esDeOtraProvincia(f) ? f.revisar : undefined}
                  />
                </td>
                <td className={r.num}>{f.codigo || "—"}</td>
                <td className={s.practica}>{f.descripcion}</td>
                <td className={r.num}>{f.cantidad}</td>
                <td className={r.num}>{formatMoneda(f.copago)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}>
                {visibles.length} de {filas.length} ítems
              </td>
              <td className={r.num}>{totales.cantidad}</td>
              <td className={r.num}>{formatMoneda(totales.copago)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReporteOS>
  );
}
