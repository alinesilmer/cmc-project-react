import { useMemo, useState } from "react";

import ReporteOS from "./components/reporte/ReporteOS";
import type { DatoResumen } from "./components/reporte/ReporteOS";
import MedicoResuelto from "./components/reporte/MedicoResuelto";
import { useReporteConPadron } from "./components/reporte/useReporteConPadron";
import { useTablaReporte } from "./components/reporte/useTablaReporte";
import {
  BuscadorTabla,
  PaginadoTabla,
} from "./components/reporte/ControlesTabla";
import r from "./components/reporte/reporte.module.scss";
import { fueRechazada, leerArchivoPrevencion } from "./prevencion.parser";
import type { PrestacionPrevencion, ReportePrevencion } from "./prevencion.parser";
import { buscarPorMatricula, esIdentificado } from "./medicosPorMatricula";
import type { ResultadoMatricula } from "./medicosPorMatricula";
import s from "./PrevencionSalud.module.scss";

/**
 * Lectura del reporte de facturación de Prevención Salud.
 *
 * Es la única obra social del panel que no valida prestación por prestación:
 * manda un reporte mensual del Colegio entero y hay que repartirlo entre los
 * médicos. Acá se lee ese archivo, se parte cada autorización en sus prácticas
 * y se busca a cada efector en `listado_medico` por su matrícula provincial,
 * para poder revisar antes de facturar qué filas quedaron sin dueño.
 *
 * El andamiaje (carga, resumen, avisos, estado vacío) lo pone `ReporteOS`, que
 * comparte con Swiss Medical; acá queda sólo la tabla y lo que es propio de
 * este reporte.
 *
 * **Todavía no graba.** Prevención Salud es la obra social 103, pero el
 * backend no la conoce: `POST /api/validaciones/prestaciones` despacha por
 * `obras.POR_NRO`, que no la tiene, así que hoy responde 422. Aunque la
 * tuviera, ese endpoint graba de a una prestación y para el médico logueado, y
 * este archivo son ~580 prácticas de ~150 médicos distintos. Falta el import
 * masivo del lado de la API.
 */

type Fila = PrestacionPrevencion & { medico: ResultadoMatricula };

const contarPrestaciones = (rep: ReportePrevencion) => rep.prestaciones.length;

const MENSAJE_VACIO = "El archivo no tiene ninguna práctica para leer.";

const AYUDA =
  "Se acepta el reporte de facturación de Prevención Salud (.xlsx, .xls o " +
  ".csv), con las columnas Número de Autorización, Fecha de Realización, " +
  "Afiliado, Profesional Efector, Matrícula MP, Conformidad, Práctica(s) " +
  "Realizada(s) y Estado.";

const PIE =
  "Por ahora esto se lee y se revisa, pero todavía no queda guardado: falta " +
  "el import de Prevención Salud del lado de la API.";

export default function PrevencionSalud() {
  const estado = useReporteConPadron(leerArchivoPrevencion, {
    contar: contarPrestaciones,
    mensajeVacio: MENSAJE_VACIO,
  });
  const [soloSinMedico, setSoloSinMedico] = useState(false);

  const { reporte, indice } = estado;

  const filas: Fila[] = useMemo(() => {
    if (!reporte) return [];
    return reporte.prestaciones.map((p) => ({
      ...p,
      medico: indice
        ? buscarPorMatricula(indice, p.matricula)
        : ({ tipo: "sin-matricula" } as const),
    }));
  }, [reporte, indice]);

  const sinMedico = filas.filter((f) => !esIdentificado(f.medico)).length;

  // Las que no cayeron en ningún médico no van en la tabla: son filas que no
  // se pueden facturar y sólo ensucian la lectura de las que sí. Siguen
  // contadas en el resumen y se ven con el filtro de arriba.
  const enTabla = useMemo(
    () =>
      soloSinMedico
        ? filas.filter((f) => !esIdentificado(f.medico))
        : filas.filter((f) => esIdentificado(f.medico)),
    [filas, soloSinMedico]
  );

  const tabla = useTablaReporte(enTabla, (f) =>
    [
      f.nroAutorizacion,
      f.afiliado,
      f.matricula,
      f.codigo,
      f.descripcion,
      f.medico.tipo === "encontrado" || f.medico.tipo === "ambiguo"
        ? f.medico.medico.nombre
        : f.profesional,
    ].join(" ")
  );

  const visibles = tabla.visibles;

  const resumen: DatoResumen[] = useMemo(() => {
    const rechazadas = filas.filter((f) => fueRechazada(f.estado)).length;
    const datos: DatoResumen[] = [
      { valor: reporte?.autorizaciones.length ?? 0, label: "Autorizaciones" },
      { valor: filas.length, label: "Prácticas" },
      { valor: new Set(filas.map((f) => f.matricula)).size, label: "Matrículas" },
      { valor: filas.length - sinMedico, label: "Con médico" },
      { valor: sinMedico, label: "Sin identificar", alerta: sinMedico > 0 },
    ];
    if (rechazadas > 0) {
      datos.push({ valor: rechazadas, label: "Rechazadas", alerta: true });
    }
    return datos;
  }, [filas, reporte, sinMedico]);

  return (
    <ReporteOS
      titulo="Prevención Salud"
      subtitulo="Subí el reporte de facturación y revisá cómo quedó repartido entre los médicos antes de facturarlo."
      ayuda={AYUDA}
      estado={estado}
      detalleArchivo={reporte?.rango}
      resumen={resumen}
      hayFilas={filas.length > 0}
      pie={PIE}
      filtros={
        <div className={r.filtros2}>
          <BuscadorTabla
            valor={tabla.busqueda}
            onCambio={tabla.setBusqueda}
            placeholder="Buscar médico, afiliado, matrícula o código"
          />
          {sinMedico > 0 && (
            <label className={r.filtro}>
              <input
                type="checkbox"
                checked={soloSinMedico}
                onChange={(e) => setSoloSinMedico(e.target.checked)}
              />
              Ver las {sinMedico} que no cayeron en ningún médico
            </label>
          )}
        </div>
      }
    >
      <div className={r.tableWrap}>
        <table className={r.table}>
          <thead>
            <tr>
              <th className={r.num}>#</th>
              <th>Autorización</th>
              <th>Fecha</th>
              <th>Afiliado</th>
              <th className={r.num}>Matrícula</th>
              <th>Médico</th>
              <th className={r.num}>Código</th>
              <th>Práctica</th>
              <th>Conformidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr
                key={`${f.nroAutorizacion}-${f.indice}`}
                className={fueRechazada(f.estado) ? s.rechazada : undefined}
              >
                <td className={r.num}>{tabla.desde + i}</td>
                <td>
                  {f.nroAutorizacion}
                  {f.deTotal > 1 && (
                    <span className={r.parte}>
                      {f.indice + 1}/{f.deTotal}
                    </span>
                  )}
                </td>
                <td>{f.fecha}</td>
                <td>{f.afiliado}</td>
                <td className={r.num}>{f.matricula || "—"}</td>
                <td>
                  <MedicoResuelto
                    resultado={f.medico}
                    nombreEnReporte={f.profesional}
                  />
                </td>
                <td className={r.num}>{f.codigo || "—"}</td>
                <td className={s.practica}>{f.descripcion}</td>
                <td>{f.conformidad || "—"}</td>
                <td>{f.estado || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginadoTabla
        pagina={tabla.pagina}
        paginas={tabla.paginas}
        desde={tabla.desde}
        hasta={tabla.hasta}
        total={tabla.encontradas.length}
        onPagina={tabla.setPagina}
      />
    </ReporteOS>
  );
}
