import { Pencil, Copy, ArrowRightCircle, ArrowLeftCircle, Trash2 } from "lucide-react";

import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import styles from "./AccionesPrestacion.module.scss";

export type DireccionMover = "siguiente" | "anterior";

interface Props {
  /** Está marcada como auditada (tilde amarillo). Una marcada no se puede mover de período. */
  revisado: boolean;
  /** La prestación está abierta (`estado === "A"`): sólo así se edita, mueve o elimina. */
  editable: boolean;
  /** Hay una acción en curso sobre esta prestación. */
  busy: boolean;
  /** Un complemento (version > 1) es una factura para un período ya cerrado y enviado: mover sus prestaciones a otro período no tiene sentido. */
  esComplemento: boolean;
  /** Quién no puede mover de período (otro permiso) ve los botones apagados. */
  puedeMover?: boolean;
  onToggleRevisado: () => void;
  onEditar: () => void;
  onReplicar: () => void;
  onMover: (direccion: DireccionMover) => void;
  onEliminar: () => void;
  className?: string;
}

/** Los botones de acción de una prestación: tilde de auditoría, editar, replicar, mover de período y eliminar. Los usan las filas de los listados de factura y la ficha de consulta, para que se vean y se habiliten igual. */
export default function AccionesPrestacion({
  revisado, editable, busy, esComplemento, puedeMover = true,
  onToggleRevisado, onEditar, onReplicar, onMover, onEliminar, className,
}: Props) {
  const tituloMover = (txt: string) => (revisado ? "Está marcada: desmarcala para moverla" : txt);
  return (
    <div className={[styles.actionsCell, className].filter(Boolean).join(" ")}>
      <span className={`${styles.auditCheckboxWrap} ${revisado ? styles.auditCheckboxOn : ""}`}>
        <input
          type="checkbox"
          className={styles.auditCheckbox}
          checked={revisado}
          onChange={onToggleRevisado}
          title="Marcar como auditado"
        />
      </span>
      <BotonPlano
        type="button"
        className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
        title="Editar"
        disabled={!editable || busy}
        onClick={onEditar}
      >
        <Pencil size={14} />
      </BotonPlano>
      <BotonPlano
        type="button"
        className={styles.iconBtn}
        title="Replicar carga"
        disabled={busy}
        onClick={onReplicar}
      >
        <Copy size={14} />
      </BotonPlano>
      {!esComplemento && (
        <>
          <BotonPlano
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnMove}`}
            title={tituloMover("Mover al período anterior")}
            disabled={!editable || busy || revisado || !puedeMover}
            onClick={() => onMover("anterior")}
          >
            <ArrowLeftCircle size={15} />
          </BotonPlano>
          <BotonPlano
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnMove}`}
            title={tituloMover("Mover al período siguiente")}
            disabled={!editable || busy || revisado || !puedeMover}
            onClick={() => onMover("siguiente")}
          >
            <ArrowRightCircle size={15} />
          </BotonPlano>
        </>
      )}
      <BotonPlano
        type="button"
        className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
        title="Eliminar"
        disabled={!editable || busy}
        onClick={onEliminar}
      >
        <Trash2 size={14} />
      </BotonPlano>
    </div>
  );
}
