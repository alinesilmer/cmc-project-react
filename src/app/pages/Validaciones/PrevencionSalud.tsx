import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  Trash2,
  Upload,
} from "lucide-react";

import Button from "../../components/atoms/Button/Button";
import {
  fueRechazada,
  leerArchivoPrevencion,
} from "./prevencion.parser";
import type { PrestacionPrevencion, ReportePrevencion } from "./prevencion.parser";
import {
  buscarPorMatricula,
  getIndiceMatriculas,
} from "./medicosPorMatricula";
import type { IndiceMatriculas, ResultadoMatricula } from "./medicosPorMatricula";
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
 * **Todavía no graba.** Prevención Salud es la obra social 103, pero el
 * backend no la conoce: `POST /api/validaciones/prestaciones` despacha por
 * `obras.POR_NRO`, que no la tiene, así que hoy responde 422. Aunque la
 * tuviera, ese endpoint graba de a una prestación y para el médico logueado, y
 * este archivo son ~580 prácticas de ~150 médicos distintos. Falta el import
 * masivo del lado de la API.
 */

type Fila = PrestacionPrevencion & { medico: ResultadoMatricula };

/** Cómo se muestra cada resultado de la búsqueda por matrícula. */
const SIN_MEDICO: Record<ResultadoMatricula["tipo"], string> = {
  "sin-matricula": "Sin matrícula en el reporte",
  "no-encontrado": "Matrícula fuera del padrón",
  encontrado: "",
  ambiguo: "",
};

export default function PrevencionSalud() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReportePrevencion | null>(null);
  const [indice, setIndice] = useState<IndiceMatriculas | null>(null);
  const [avisoPadron, setAvisoPadron] = useState("");
  const [error, setError] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [soloSinMedico, setSoloSinMedico] = useState(false);

  const filas: Fila[] = useMemo(() => {
    if (!reporte) return [];
    return reporte.prestaciones.map((p) => ({
      ...p,
      medico: indice
        ? buscarPorMatricula(indice, p.matricula)
        : { tipo: "sin-matricula" as const },
    }));
  }, [reporte, indice]);

  const visibles = useMemo(
    () => (soloSinMedico ? filas.filter((f) => !esIdentificado(f.medico)) : filas),
    [filas, soloSinMedico]
  );

  const resumen = useMemo(() => {
    const sinMedico = filas.filter((f) => !esIdentificado(f.medico)).length;
    return {
      autorizaciones: reporte?.autorizaciones.length ?? 0,
      practicas: filas.length,
      sinMedico,
      identificados: filas.length - sinMedico,
      rechazadas: filas.filter((f) => fueRechazada(f.estado)).length,
      matriculas: new Set(filas.map((f) => f.matricula)).size,
    };
  }, [filas, reporte]);

  async function onArchivo(file: File) {
    setLeyendo(true);
    setError("");
    setAvisoPadron("");
    try {
      // El padrón y el archivo se piden a la vez: el índice de matrículas no
      // depende de lo que traiga la planilla.
      const [leido, idx] = await Promise.all([
        leerArchivoPrevencion(file),
        getIndiceMatriculas().catch((e) => {
          // Sin `medico:leer` no se puede mapear, pero el reporte se muestra
          // igual: es preferible ver las filas sin médico que no ver nada.
          setAvisoPadron(
            "No pudimos leer el padrón de médicos, así que las filas quedan sin " +
              "identificar. Hace falta el permiso de lectura de médicos."
          );
          console.error("Padrón de matrículas:", e);
          return null;
        }),
      ]);

      setArchivo(file.name);
      setReporte(leido);
      setIndice(idx);
      if (leido.prestaciones.length === 0) {
        setError("El archivo no tiene ninguna práctica para leer.");
      }
    } catch (e) {
      limpiar();
      setError(e instanceof Error ? e.message : "No pudimos leer el archivo.");
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function limpiar() {
    setArchivo(null);
    setReporte(null);
    setError("");
    setAvisoPadron("");
    setSoloSinMedico(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={s.container}>
      <Link to="/panel/validaciones" className={s.back}>
        <ArrowLeft size={16} /> Volver a validaciones
      </Link>

      <header className={s.header}>
        <FileSpreadsheet size={32} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Prevención Salud</h1>
          <p className={s.subtitle}>
            Subí el reporte de facturación y revisá cómo quedó repartido entre
            los médicos antes de facturarlo.
          </p>
        </div>
      </header>

      <div className={s.uploader}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className={s.fileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onArchivo(file);
          }}
        />

        <Button
          type="button"
          variant="primary"
          isLoading={leyendo}
          onClick={() => inputRef.current?.click()}
          leftIcon={<Upload size={18} />}
        >
          Subir reporte
        </Button>

        {archivo && (
          <>
            <span className={s.archivo}>
              {archivo}
              {reporte?.rango && ` · ${reporte.rango}`}
            </span>
            <button type="button" className={s.limpiar} onClick={limpiar}>
              <Trash2 size={15} /> Quitar
            </button>
          </>
        )}
      </div>

      {error && <p className={s.error}>{error}</p>}
      {avisoPadron && (
        <p className={s.aviso}>
          <AlertTriangle size={16} /> {avisoPadron}
        </p>
      )}

      {filas.length > 0 && (
        <>
          <div className={s.resumen}>
            <Dato valor={resumen.autorizaciones} label="Autorizaciones" />
            <Dato valor={resumen.practicas} label="Prácticas" />
            <Dato valor={resumen.matriculas} label="Matrículas" />
            <Dato valor={resumen.identificados} label="Con médico" />
            <Dato
              valor={resumen.sinMedico}
              label="Sin identificar"
              alerta={resumen.sinMedico > 0}
            />
            {resumen.rechazadas > 0 && (
              <Dato valor={resumen.rechazadas} label="Rechazadas" alerta />
            )}
          </div>

          {resumen.sinMedico > 0 && (
            <label className={s.filtro}>
              <input
                type="checkbox"
                checked={soloSinMedico}
                onChange={(e) => setSoloSinMedico(e.target.checked)}
              />
              Ver sólo las que no cayeron en ningún médico
            </label>
          )}

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.num}>#</th>
                  <th>Autorización</th>
                  <th>Fecha</th>
                  <th>Afiliado</th>
                  <th className={s.num}>Matrícula</th>
                  <th>Médico</th>
                  <th className={s.num}>Código</th>
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
                    <td className={s.num}>{i + 1}</td>
                    <td>
                      {f.nroAutorizacion}
                      {f.deTotal > 1 && (
                        <span className={s.parte}>
                          {f.indice + 1}/{f.deTotal}
                        </span>
                      )}
                    </td>
                    <td>{f.fecha}</td>
                    <td>{f.afiliado}</td>
                    <td className={s.num}>{f.matricula || "—"}</td>
                    <td>
                      <Medico resultado={f.medico} reporte={f.profesional} />
                    </td>
                    <td className={s.num}>{f.codigo || "—"}</td>
                    <td className={s.practica}>{f.descripcion}</td>
                    <td>{f.conformidad || "—"}</td>
                    <td>{f.estado || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={s.pendiente}>
            <AlertTriangle size={16} /> Por ahora esto se lee y se revisa, pero
            todavía no queda guardado: falta el import de Prevención Salud del
            lado de la API.
          </p>
        </>
      )}

      {filas.length === 0 && !error && (
        <div className={s.empty}>
          <FileSpreadsheet size={30} />
          <p>
            Se acepta el reporte de facturación de Prevención Salud (.xlsx, .xls
            o .csv), con las columnas Número de Autorización, Fecha de
            Realización, Afiliado, Profesional Efector, Matrícula MP,
            Conformidad, Práctica(s) Realizada(s) y Estado.
          </p>
        </div>
      )}
    </div>
  );
}

const esIdentificado = (r: ResultadoMatricula) =>
  r.tipo === "encontrado" || r.tipo === "ambiguo";

function Dato({
  valor,
  label,
  alerta,
}: {
  valor: number;
  label: string;
  alerta?: boolean;
}) {
  return (
    <div className={alerta ? `${s.dato} ${s.datoAlerta}` : s.dato}>
      <strong>{valor}</strong>
      <span>{label}</span>
    </div>
  );
}

/** El médico del padrón, o por qué no se pudo resolver.
 *
 * Cuando no se resuelve se muestra igual el nombre que escribió la obra social:
 * es lo único que le queda a quien tenga que buscarlo a mano. */
function Medico({
  resultado,
  reporte,
}: {
  resultado: ResultadoMatricula;
  reporte: string;
}) {
  if (resultado.tipo === "encontrado" || resultado.tipo === "ambiguo") {
    const { medico } = resultado;
    return (
      <div className={s.medico}>
        <span>{medico.nombre}</span>
        <span className={s.meta}>
          {medico.nroSocio ? `Socio ${medico.nroSocio}` : "Sin N° de socio"}
          {!medico.activo && " · inactivo"}
          {resultado.tipo === "ambiguo" &&
            ` · ${resultado.total} fichas con esta matrícula`}
        </span>
      </div>
    );
  }

  return (
    <div className={s.medico}>
      <span className={s.badge}>{SIN_MEDICO[resultado.tipo]}</span>
      <span className={s.meta}>{reporte || "—"}</span>
    </div>
  );
}
