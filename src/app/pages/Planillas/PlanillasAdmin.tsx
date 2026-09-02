import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderOpen, Info, Pencil, Search, Trash2, Upload } from "lucide-react";

import { abrirAdjunto } from "../../lib/archivos";
import { hoyISO } from "../../lib/fechas";
import { useNotify } from "../../hooks/useNotify";
import Modal from "../../components/atoms/Modal/Modal";
import ConfirmModal from "../../components/atoms/ConfirmModal/ConfirmModal";
import Button from "../../components/atoms/Button/Button";
import { createPlanilla, deletePlanilla, editPlanilla, getPlanillas } from "./planillas.api";
import {
  formatFechaPlanilla,
  ordenarPlanillas,
  urlPlanilla,
  type Planilla,
} from "./planillas.types";
import s from "./Planillas.module.scss";

/**
 * Alta, edición y baja de las planillas que ven los médicos. Reemplaza
 * `planilla_consulta_colegio.php` del legacy.
 *
 * El alta sube el PDF a `uploads/planillas/`; la edición corrige descripción,
 * fecha o el PDF sin tener que dar de baja y volver a publicar; la baja es
 * lógica (`avisos.EXISTE='N'`), igual que `borrar_avisos.php`.
 */
export default function PlanillasAdmin() {
  // Ver la nota en PlanillasMedico: el objeto de useNotify() no es estable.
  const { error: avisarError, success: avisarOk } = useNotify();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editando, setEditando] = useState<Planilla | null>(null);
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [editArchivo, setEditArchivo] = useState<File | null>(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const [aConfirmar, setAConfirmar] = useState<Planilla | null>(null);

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

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return ordenadas;
    return ordenadas.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(q) || p.archivo.toLowerCase().includes(q)
    );
  }, [ordenadas, busqueda]);

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
      const nueva = await createPlanilla(archivo, descripcion, fecha);
      setPlanillas((prev) => [nueva, ...prev]);
      setDescripcion("");
      setFecha(hoyISO());
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = "";
      avisarOk("Planilla publicada.");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo subir la planilla.");
    } finally {
      setSubiendo(false);
    }
  };

  const abrirEdicion = (p: Planilla) => {
    setEditando(p);
    setEditDescripcion(p.descripcion);
    // `fecha` puede venir en `DD/MM/AAAA` en las filas históricas; el input
    // date necesita ISO, así que se reusa el mismo parser que ordena la tabla.
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : "";
    setEditFecha(iso);
    setEditArchivo(null);
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando || guardandoEdit) return;

    if (editArchivo && !editArchivo.name.toLowerCase().endsWith(".pdf")) {
      avisarError("Solo se permiten archivos PDF.");
      return;
    }

    setGuardandoEdit(true);
    try {
      const actualizada = await editPlanilla(editando.id, {
        descripcion: editDescripcion,
        fecha: editFecha || undefined,
        archivo: editArchivo ?? undefined,
      });
      setPlanillas((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)));
      setEditando(null);
      avisarOk("Planilla actualizada.");
    } catch (err: any) {
      avisarError(err?.response?.data?.detail ?? "No se pudo actualizar la planilla.");
    } finally {
      setGuardandoEdit(false);
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
      setAConfirmar(null);
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

          <div className={`${s.field} ${s.fieldFecha}`}>
            <label className={s.label} htmlFor="planilla-fecha">
              Fecha
            </label>
            <input
              id="planilla-fecha"
              type="date"
              className={s.input}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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

      <div className={s.searchBox}>
        <Search size={17} />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar planilla…"
          aria-label="Buscar planilla"
        />
      </div>

      {visibles.length === 0 ? (
        <div className={s.empty}>
          <FolderOpen size={30} />
          <p>
            {cargando
              ? "Cargando planillas…"
              : busqueda
                ? `No encontramos planillas que coincidan con «${busqueda}».`
                : "No hay planillas publicadas."}
          </p>
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
              {visibles.map((p) => (
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
                      className={s.verBtn}
                      onClick={() => abrirEdicion(p)}
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      className={s.deleteBtn}
                      onClick={() => setAConfirmar(p)}
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

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title="Editar planilla"
        size="small"
      >
        {editando && (
          <form onSubmit={guardarEdicion} className={s.modalForm}>
            <div className={s.field}>
              <label className={s.label} htmlFor="edit-desc">
                Descripción
              </label>
              <input
                id="edit-desc"
                type="text"
                className={s.input}
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
              />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="edit-fecha">
                Fecha
              </label>
              <input
                id="edit-fecha"
                type="date"
                className={s.input}
                value={editFecha}
                onChange={(e) => setEditFecha(e.target.value)}
              />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="edit-file">
                Reemplazar PDF (opcional)
              </label>
              <input
                id="edit-file"
                type="file"
                accept=".pdf"
                className={`${s.input} ${s.inputFile}`}
                onChange={(e) => setEditArchivo(e.target.files?.[0] ?? null)}
              />
              <span className={s.archivo}>Archivo actual: {editando.archivo}</span>
            </div>

            <div className={s.modalActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditando(null)}
                disabled={guardandoEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={guardandoEdit}>
                {guardandoEdit ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={aConfirmar !== null}
        title="¿Dar de baja esta planilla?"
        message={
          aConfirmar
            ? `«${aConfirmar.descripcion}» dejará de verse en el portal de los médicos. El PDF no se borra y se puede reactivar por soporte.`
            : ""
        }
        confirmLabel={borrando !== null ? "Dando de baja…" : "Sí, dar de baja"}
        variant="danger"
        onConfirm={() => aConfirmar && borrar(aConfirmar)}
        onCancel={() => setAConfirmar(null)}
      />
    </div>
  );
}
