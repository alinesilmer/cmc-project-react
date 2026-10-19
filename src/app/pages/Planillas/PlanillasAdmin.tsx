import { useRef, useState } from "react";
import { CircleAlert, FileText, Pencil, Trash2, Upload } from "lucide-react";

import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { hoyISO } from "@/app/shared/lib/fechas";
import { useNotify } from "../../hooks/useNotify";
import Modal from "@/app/components/ui/Modal/Modal";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import Button from "@/app/components/ui/Button/Button";
import { createPlanilla, deletePlanilla, editPlanilla } from "./planillas.api";
import { usePlanillas } from "./usePlanillas";
import { urlPlanilla, type Planilla } from "./planillas.types";
import s from "./Planillas.module.scss";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Caja from "@/app/components/ui/Caja/Caja";
import Franja from "@/app/components/layout/Franja/Franja";
import ListaPlanillas from "./components/ListaPlanillas";

/** Alta, edición y baja de las planillas que ven los médicos. */
export default function PlanillasAdmin() {
  // Ver la nota en PlanillasMedico: el objeto de useNotify() no es estable.
  const { error: avisarError, success: avisarOk } = useNotify();
  const { planillas, cargando, actualizar: setPlanillas } = usePlanillas(avisarError);
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);

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
    // `fecha` puede venir en `DD/MM/AAAA` en las filas históricas; el input date necesita ISO, así que se reusa el mismo parser que ordena la tabla.
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
      <Franja titulo="Planillas" icono={FileText} />

      <Caja titulo="Publicar">
        <form className={s.alta} onSubmit={subir}>
          <label className={s.field}>
            <span className={s.label}>Descripción</span>
            <input
              id="planilla-desc"
              type="text"
              className={s.input}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Planilla consulta Swiss Medical"
            />
          </label>

          <div className={`${s.field} ${s.fieldFecha}`}>
            <label className={s.label} htmlFor="planilla-fecha">
              Fecha
            </label>
            <CampoFecha value={fecha} onChange={(valor) => setFecha(valor)} id="planilla-fecha" />
          </div>

          <label className={s.field}>
            <span className={s.label}>PDF</span>
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
          </label>

          <Button
            submit
            size="md"
            variant="primary"
            leftIcon={<Upload size={18} aria-hidden="true" />}
            disabled={!archivo || subiendo}
          >
            {subiendo ? "Subiendo…" : "Subir"}
          </Button>
        </form>

        {error && (
          <p className={s.aviso} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            {error}
          </p>
        )}
      </Caja>

      <ListaPlanillas
        planillas={planillas}
        cargando={cargando}
        vacio="Todavía no hay planillas."
        onVer={ver}
        acciones={(p) => (
          <>
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => abrirEdicion(p)}
              aria-label={`Editar «${p.descripcion}»`}
              title="Editar"
            >
              <Pencil size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={s.iconBtnPeligro}
              onClick={() => setAConfirmar(p)}
              disabled={borrando === p.id}
              aria-label={`Borrar «${p.descripcion}»`}
              title="Borrar"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </>
        )}
      />

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
              <CampoFecha
                value={editFecha}
                onChange={(valor) => setEditFecha(valor)}
                id="edit-fecha"
              />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="edit-file">
                Reemplazar PDF
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
                {guardandoEdit ? "Guardando…" : "Guardar"}
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
