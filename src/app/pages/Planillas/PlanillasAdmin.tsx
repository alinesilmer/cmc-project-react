import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderOpen, Info, Trash2, Upload } from "lucide-react";

import { abrirAdjunto } from "../../lib/archivos";
import { useNotify } from "../../hooks/useNotify";
import { createPlanilla, deletePlanilla, getPlanillas } from "./planillas.api";
import {
  formatFechaPlanilla,
  ordenarPlanillas,
  urlPlanilla,
  type Planilla,
} from "./planillas.types";
import s from "./Planillas.module.scss";

/**
 * Alta y baja de las planillas que ven los médicos. Reemplaza
 * `planilla_consulta_colegio.php` del legacy.
 *
 * El alta sube el PDF a `uploads/planillas/` y la baja es lógica
 * (`avisos.EXISTE='N'`), igual que `borrar_avisos.php`: el archivo no se borra.
 */
export default function PlanillasAdmin() {
  // Ver la nota en PlanillasMedico: el objeto de useNotify() no es estable.
  const { error: avisarError, success: avisarOk } = useNotify();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(
    () =>
      getPlanillas()
        .then(setPlanillas)
        .catch(() => avisarError("No se pudieron cargar las planillas."))
        .finally(() => setCargando(false)),
    [avisarError]
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ordenadas = useMemo(() => ordenarPlanillas(planillas), [planillas]);

  const subir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || subiendo) return;

    if (!archivo.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se permiten archivos PDF.");
      return;
    }

    setSubiendo(true);
    setError(null);
    try {
      // Sin descripción el backend usa el nombre del archivo, como el legacy.
      const nueva = await createPlanilla(archivo, descripcion);
      setPlanillas((prev) => [nueva, ...prev]);
      setDescripcion("");
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = "";
      avisarOk("Planilla publicada.");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo subir la planilla.");
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = async (p: Planilla) => {
    if (borrando !== null) return;
    setBorrando(p.id);
    try {
      await deletePlanilla(p.id);
      setPlanillas((prev) => prev.filter((x) => x.id !== p.id));
      avisarOk("Planilla dada de baja.");
    } catch (err: any) {
      avisarError(err?.response?.data?.detail ?? "No se pudo dar de baja la planilla.");
    } finally {
      setBorrando(null);
    }
  };

  const ver = (p: Planilla) =>
    abrirAdjunto(urlPlanilla(p)).catch((e) => avisarError(e.message));

  return (
    <div className={s.container}>
      <header className={s.header}>
        <FileText size={32} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Planillas de consulta</h1>
          <p className={s.subtitle}>
            Lo que subas acá es lo que ven los médicos en su portal.
          </p>
        </div>
      </header>

      <form className={s.uploadCard} onSubmit={subir}>
        <h2 className={s.uploadTitle}>
          <Upload size={17} /> Subir una planilla
        </h2>

        <div className={s.uploadRow}>
          <div className={s.field}>
            <label className={s.label} htmlFor="planilla-desc">
              Descripción
            </label>
            <input
              id="planilla-desc"
              type="text"
              className={s.input}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Planilla consulta Swiss Medical"
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="planilla-file">
              Archivo PDF
            </label>
            <input
              id="planilla-file"
              ref={fileRef}
              type="file"
              accept=".pdf"
              className={`${s.input} ${s.inputFile}`}
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null);
                setError(null);
              }}
              required
            />
          </div>

          <button type="submit" className={s.submitBtn} disabled={!archivo || subiendo}>
            <Upload size={15} /> {subiendo ? "Subiendo…" : "Subir"}
          </button>
        </div>

        {error && (
          <p className={s.aviso}>
            <Info size={16} />
            {error}
          </p>
        )}
      </form>

      {ordenadas.length === 0 ? (
        <div className={s.empty}>
          <FolderOpen size={30} />
          <p>{cargando ? "Cargando planillas…" : "No hay planillas publicadas."}</p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.colFecha}>Fecha</th>
                <th>Planilla</th>
                <th className={s.colAccion}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((p) => (
                <tr key={p.id}>
                  <td className={s.colFecha}>{formatFechaPlanilla(p.fecha)}</td>
                  <td>
                    <span className={s.descripcion}>{p.descripcion}</span>
                    <span className={s.archivo}>{p.archivo}</span>
                  </td>
                  <td className={s.colAccion}>
                    <button type="button" className={s.verBtn} onClick={() => ver(p)}>
                      <FileText size={13} /> Ver PDF
                    </button>
                    <button
                      type="button"
                      className={s.deleteBtn}
                      onClick={() => borrar(p)}
                      disabled={borrando === p.id}
                    >
                      <Trash2 size={13} /> Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
