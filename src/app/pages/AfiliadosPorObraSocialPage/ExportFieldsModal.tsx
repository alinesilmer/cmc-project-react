import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Database, Info, X } from "lucide-react";

import { CAMPOS, GRUPOS } from "./exportFields";
import type { FieldGroup } from "./types";
import s from "./ExportFieldsModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  keys: Set<string>;
  sensibles: number;
  necesitaFicha: boolean;
  onToggle: (key: string) => void;
  onToggleGroup: (grupo: FieldGroup) => void;
};

const ExportFieldsModal = ({
  open, onClose, keys, sensibles, necesitaFicha,
  onToggle, onToggleGroup,
}: Props) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // El fondo no debe scrollear detrás del panel en celular.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={s.overlay} onMouseDown={onClose} role="presentation">
      <div
        ref={panelRef}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campos-titulo"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={s.head}>
          <h2 id="campos-titulo" className={s.title}>Datos a incluir</h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className={s.body}>
          {GRUPOS.map((g) => {
            const campos = CAMPOS.filter((c) => c.group === g.id);
            const puestos = campos.filter((c) => keys.has(c.key)).length;
            return (
              <section key={g.id} className={s.group}>
                <div className={s.groupHead}>
                  <h3 className={s.groupTitle}>
                    {g.label}
                    {g.id === "personal" && (
                      <span className={s.personalTag}>
                        <AlertTriangle size={11} aria-hidden="true" /> Personales
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    className={s.groupToggle}
                    onClick={() => onToggleGroup(g.id)}
                  >
                    {puestos === campos.length ? "Quitar todos" : "Agregar todos"}
                  </button>
                </div>

                <div className={s.options}>
                  {campos.map((c) => {
                    const activo = keys.has(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        role="checkbox"
                        aria-checked={activo}
                        className={`${s.option} ${activo ? s.optionOn : ""}`}
                        onClick={() => onToggle(c.key)}
                      >
                        <span className={s.box} aria-hidden="true">
                          {activo && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className={s.optionLabel}>{c.label}</span>
                        {c.source === "medico" && (
                          <span className={s.slow} title="Requiere leer la ficha completa">
                            <Database size={11} aria-hidden="true" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <footer className={s.foot}>
          <div className={s.notes}>
            <span className={s.count}>
              {keys.size} {keys.size === 1 ? "columna" : "columnas"}
            </span>
            {necesitaFicha && (
              <span className={s.note}>
                <Database size={12} aria-hidden="true" />
                La primera exportación tarda un poco más: se leen las fichas completas.
              </span>
            )}
            {sensibles > 0 && (
              <span className={`${s.note} ${s.noteWarn}`}>
                <AlertTriangle size={12} aria-hidden="true" />
                Incluye {sensibles} {sensibles === 1 ? "dato personal" : "datos personales"}.
                Revisá antes de enviarlo fuera del Colegio.
              </span>
            )}
            {/* Pasadas las 12, el reparto de anchos deja todas las columnas en
                el mínimo de 11 mm y el PDF se vuelve ilegible. El Excel no
                tiene ese techo. */}
            {keys.size > 12 && (
              <span className={s.note}>
                <Info size={12} aria-hidden="true" />
                Con {keys.size} columnas el PDF queda muy apretado. Para este nivel
                de detalle conviene el Excel.
              </span>
            )}
            {!necesitaFicha && sensibles === 0 && keys.size <= 12 && (
              <span className={s.note}>
                <Info size={12} aria-hidden="true" />
                Todas estas columnas ya están en pantalla: la exportación es inmediata.
              </span>
            )}
          </div>
          <button type="button" className={s.done} onClick={onClose}>Listo</button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default ExportFieldsModal;
