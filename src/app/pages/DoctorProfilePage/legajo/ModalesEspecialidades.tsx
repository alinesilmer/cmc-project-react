import DatePicker from "react-datepicker";
import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
import { useNotify } from "@/app/hooks/useNotify";
import {
  addMedicoEspecialidad,
  getMedicoEspecialidades,
  removeMedicoEspecialidad,
  uploadDocumento,
} from "../api";
import styles from "../DoctorProfilePage.module.scss";
import { toYmd, mensajeDe } from "./legajo.helpers";
import type { LegajoEspecialidades } from "./useLegajoEspecialidades";

type Props = {
  /** Id de la URL; sólo existe en el legajo del Colegio, no en "Mi perfil". */
  id: string | undefined;
  medicoId: string;
  especialidades: LegajoEspecialidades;
};

export default function ModalesEspecialidades({ id, medicoId, especialidades }: Props) {
  const notify = useNotify();
  const { setEspecs, assocEspOpen, setAssocEspOpen, assocEspId, setAssocEspId, assocEspResol, setAssocEspResol, assocEspDate, setAssocEspDate, assocEspFile, setAssocEspFile, delEspOpen, setDelEspOpen, espToDelete, setEspToDelete, espOptions } = especialidades;

  return (
    <>
      <ActionModal
        open={assocEspOpen}
        onClose={() => setAssocEspOpen(false)}
        size="lg"
        title="Agregar especialidad"
        confirmText="Asociar"
        confirmDisabled={!assocEspId}
        onConfirm={async () => {
          if (!id || !assocEspId) return;
          try {
            let adjuntoId: number | null = null;
            if (assocEspFile) {
              adjuntoId = await uploadDocumento(id, assocEspFile);
            }
            await addMedicoEspecialidad(id, {
              id_colegio: Number(assocEspId),
              n_resolucion: assocEspResol?.trim() || null,
              fecha_resolucion: toYmd(assocEspDate),
              adjunto_id: adjuntoId,
            });
            const rr = await getMedicoEspecialidades(medicoId);
            setEspecs(rr);
            setAssocEspId("");
            setAssocEspResol("");
            setAssocEspDate(null);
            setAssocEspFile(null);
            notify.success("Especialidad asociada");
          } catch (e: unknown) {
            notify.error("No se pudo asociar la especialidad", mensajeDe(e));
            throw e;
          }
        }}
      >
        <div className={styles.modalGrid}>
          <div className={styles.field}>
            <label>Especialidad</label>
            <select
              className={styles.select}
              value={assocEspId}
              onChange={(e) => setAssocEspId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {espOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>N° de resolución</label>
            <input
              className={styles.input}
              value={assocEspResol}
              onChange={(e) => setAssocEspResol(e.target.value)}
              placeholder="Ej: 12345/2024"
            />
          </div>

          <div className={styles.field}>
            <label>Fecha de resolución</label>
            <DatePicker
              selected={assocEspDate}
              onChange={(d) => setAssocEspDate(d)}
              className={styles.dateInput}
              dateFormat="dd-MM-yyyy"
              placeholderText="dd-MM-aaaa"
              closeOnScroll
              showPopperArrow={false}
            />
          </div>

          <div className={styles.field}>
            <label>Adjunto (PDF/JPG/PNG)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setAssocEspFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </ActionModal>

      <ActionModal
        open={delEspOpen}
        onClose={() => {
          setDelEspOpen(false);
          setEspToDelete(null);
        }}
        size="xs"
        title="Quitar especialidad"
        confirmText="Confirmar"
        onConfirm={async () => {
          if (!id || !espToDelete) return;
          try {
            await removeMedicoEspecialidad(id, espToDelete.id);
            const rr = await getMedicoEspecialidades(medicoId);
            setEspecs(rr);
            setEspToDelete(null);

            notify.success("Especialidad quitada");
          } catch (e: unknown) {
            notify.error("No se pudo quitar la especialidad", mensajeDe(e));
            throw e;
          }
        }}
      >
        <p style={{ lineHeight: 1.5 }}>
          Vas a quitar la especialidad{" "}
          <strong>
            {espToDelete
              ? espToDelete.nombre ?? `ID ${espToDelete.id}`
              : "seleccionada"}
          </strong>{" "}
          (ID colegio: {espToDelete?.id}).
        </p>
        <p style={{ marginTop: 8 }}>
          Esta acción solo desvincula la especialidad del profesional; no elimina
          la especialidad del catálogo.
        </p>
        <p style={{ marginTop: 8 }}>¿Querés continuar?</p>
      </ActionModal>
    </>
  );
}
