import type { ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import s from "./Dialogo.module.scss";

type Props = {
  titulo: ReactNode;
  icono?: LucideIcon;
  /** Cierra con la cruz, Escape o tocando afuera; sin esto (p. ej. mientras guarda) no se puede cerrar. */
  onClose?: () => void;
  /** Los botones del pie, a la derecha. */
  acciones?: ReactNode;
  ancho?: "chico" | "medio" | "grande";
  /** Cabecera roja: para borrar o deshacer algo. */
  peligro?: boolean;
  children: ReactNode;
};

/** EL diálogo del panel: cabecera azul con el título, el contenido y el pie con los botones. */
export default function Dialogo({ titulo, icono: Icono, onClose, acciones, ancho = "chico", peligro = false, children }: Props) {
  return (
    <MarcoModal onClose={onClose} className={`${s.dialogo} ${s[ancho]}`} aria-label={typeof titulo === "string" ? titulo : undefined}>
      <header className={`${s.cabecera} ${peligro ? s.peligro : ""}`}>
        {Icono && <Icono size={20} aria-hidden="true" className={s.icono} />}
        <h2 className={s.titulo}>{titulo}</h2>
        {onClose && (
          <button type="button" className={s.cerrar} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        )}
      </header>
      <div className={s.cuerpo}>{children}</div>
      {acciones && <footer className={s.pie}>{acciones}</footer>}
    </MarcoModal>
  );
}

/** Ficha de datos dentro de un diálogo: rótulo a la izquierda, valor a la derecha. */
export function DialogoDatos({ filas }: { filas: { rotulo: string; valor: ReactNode }[] }) {
  return (
    <dl className={s.datos}>
      {filas.map((f) => (
        <div key={f.rotulo} className={s.dato}>
          <dt>{f.rotulo}</dt>
          <dd>{f.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Aviso dentro de un diálogo: amarillo para advertir, rojo para lo que no se puede deshacer. */
export function DialogoAviso({ tono = "aviso", children }: { tono?: "aviso" | "peligro"; children: ReactNode }) {
  return (
    <p className={`${s.aviso} ${tono === "peligro" ? s.avisoPeligro : ""}`} role={tono === "peligro" ? "alert" : undefined}>
      {children}
    </p>
  );
}

/** Un campo del formulario de un diálogo: el rótulo arriba y el control debajo. */
export function DialogoCampo({ rotulo, htmlFor, children }: { rotulo: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className={s.campo}>
      <label className={s.rotulo} htmlFor={htmlFor}>
        {rotulo}
      </label>
      {children}
    </div>
  );
}
