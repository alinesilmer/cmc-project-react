import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  Check,
  Database,
  IdCard,
  Landmark,
  MapPin,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import { Solapa } from "@/app/components/layout/Franja/Franja";
// El mismo modal que «Filtrar y exportar» de Socios.
import m from "@/app/pages/UsersList/components/FilterModal/FilterModal.module.scss";
import { CAMPOS, GRUPOS } from "./exportFields";
import type { FieldGroup } from "./types";
import { useDialogo } from "./useDialogo";
import s from "./ExportFieldsModal.module.scss";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  open: boolean;
  onClose: () => void;
  keys: Set<string>;
  sensibles: number;
  necesitaFicha: boolean;
  onToggle: (key: string) => void;
  onToggleGroup: (grupo: FieldGroup) => void;
};

// Cada grupo es una solapa: rótulo de una palabra y su ícono.
const SOLAPAS: Record<FieldGroup, { rotulo: string; Icono: LucideIcon }> = {
  identificacion: { rotulo: "Identificación", Icono: IdCard },
  profesional: { rotulo: "Profesional", Icono: Briefcase },
  consultorio: { rotulo: "Consultorio", Icono: MapPin },
  fiscal: { rotulo: "Fiscal", Icono: Landmark },
  personal: { rotulo: "Personal", Icono: User },
};

/** «Datos a mostrar» del padrón: qué columnas lleva la tabla y lo que se exporta. */
const ExportFieldsModal = ({ open, onClose, keys, necesitaFicha, onToggle, onToggleGroup }: Props) => {
  const panelRef = useDialogo(open, onClose);
  const [grupo, setGrupo] = useState<FieldGroup>(GRUPOS[0].id);

  if (!open) return null;

  const campos = CAMPOS.filter((c) => c.group === grupo);
  const puestos = campos.filter((c) => keys.has(c.key)).length;
  const elegidos = CAMPOS.filter((c) => keys.has(c.key));

  return createPortal(
    <MarcoModal onClose={onClose} ref={panelRef} className={s.panel} aria-labelledby="campos-titulo">
        <div className={m.modal}>
          <header className={m.franja}>
            <BotonPlano type="button" className={m.cerrar} onClick={onClose} aria-label="Cerrar">
              <X size={22} aria-hidden="true" />
            </BotonPlano>
            <h2 id="campos-titulo" className={m.titulo}>Datos a mostrar</h2>
            <div className={m.solapas} role="tablist">
              {GRUPOS.map((g) => {
                const { rotulo, Icono } = SOLAPAS[g.id];
                return (
                  <Solapa
                    key={g.id}
                    activa={grupo === g.id}
                    onClick={() => setGrupo(g.id)}
                    cuenta={CAMPOS.filter((c) => c.group === g.id && keys.has(c.key)).length}
                  >
                    <Icono size={18} aria-hidden="true" /> {rotulo}
                  </Solapa>
                );
              })}
            </div>
          </header>

          <div className={m.cuerpo}>
            <section className={m.caja}>
              <BotonPlano type="button" className={m.selectAllBtn} onClick={() => onToggleGroup(grupo)}>
                {puestos === campos.length ? "Quitar todos" : "Agregar todos"}
              </BotonPlano>

              <div className={`${m.colOptions} ${s.opciones}`}>
                {campos.map((c) => {
                  const activo = keys.has(c.key);
                  return (
                    <BotonPlano
                      key={c.key}
                      type="button"
                      role="checkbox"
                      aria-checked={activo}
                      className={`${m.colOption} ${activo ? m.colOptionOn : ""}`}
                      onClick={() => onToggle(c.key)}
                    >
                      <span className={m.colBox} aria-hidden="true">
                        {activo && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className={m.colOptionLabel}>{c.label}</span>
                      {c.source === "medico" && (
                        <span className={s.slow} title="Se lee de la ficha completa">
                          <Database size={13} aria-hidden="true" />
                        </span>
                      )}
                    </BotonPlano>
                  );
                })}
              </div>
            </section>

            <aside className={m.resumen}>
              <div className={m.resumenCabeza}>
                <h3 className={m.resumenTitulo}>Resumen</h3>
              </div>
              <dl className={m.resumenLista}>
                <div>
                  <dt>Columnas</dt>
                  <dd>{keys.size}</dd>
                </div>
              </dl>
              <ul className={s.elegidos}>
                {elegidos.map((c) => (
                  <li key={c.key}>{c.label}</li>
                ))}
              </ul>
              {/* Pasadas las 12, el reparto de anchos deja todas las columnas en el mínimo de 11 mm y el PDF se vuelve ilegible. */}
              {keys.size > 12 && <p className={s.nota}>Más de 12: mejor Excel que PDF.</p>}
              {necesitaFicha && keys.size <= 12 && <p className={s.nota}>La primera vez tarda más.</p>}
            </aside>
          </div>

          <footer className={m.pie}>
            <Button onClick={onClose} variant="primary" size="lg">
              Listo
            </Button>
          </footer>
        </div>
      </MarcoModal>,
    document.body
  );
};

export default ExportFieldsModal;
