import { X, RotateCcw } from "lucide-react";
import type { VistaOpciones } from "./types";
import { VISTA_OPCIONES_DEFAULT } from "./types";
import OrdenVistaSection from "./OrdenVistaSection";
import AgrupacionVistaSection from "./AgrupacionVistaSection";
import FiltrosVistaSection from "./FiltrosVistaSection";
import ColumnasVistaSection from "./ColumnasVistaSection";
import s from "../export/export.module.scss";

interface PrestadorOpcion {
  cod_medico: string;
  nombre: string | null;
}

interface Props {
  opciones: VistaOpciones;
  onChange: (opciones: VistaOpciones) => void;
  prestadores: PrestadorOpcion[];
  onClose: () => void;
}

export default function VistaPanel({ opciones, onChange, prestadores, onClose }: Props) {
  return (
    <>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <aside className={s.drawer} aria-label="Parámetros de visualización" role="complementary">
        <div className={s.drawerHeader}>
          <div>
            <h2 className={s.drawerTitle}>Vista de la tabla</h2>
            <p className={s.drawerSub}>
              Ordená, agrupá, filtrá y elegí columnas — se aplica solo en pantalla, no cambia los datos.
            </p>
          </div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Cerrar panel">
            <X size={18} />
          </button>
        </div>

        <div className={s.drawerBody}>
          <OrdenVistaSection orden={opciones.orden} onChange={(orden) => onChange({ ...opciones, orden })} />
          <AgrupacionVistaSection
            agrupacion={opciones.agrupacion}
            agruparEquipo={opciones.agruparEquipo}
            onChangeAgrupacion={(agrupacion) => onChange({ ...opciones, agrupacion })}
            onChangeAgruparEquipo={(agruparEquipo) => onChange({ ...opciones, agruparEquipo })}
          />
          <FiltrosVistaSection
            filtros={opciones}
            onChange={(filtros) => onChange({ ...opciones, ...filtros })}
            prestadores={prestadores}
          />
          <ColumnasVistaSection
            columnas={opciones.columnas}
            onChange={(columnas) => onChange({ ...opciones, columnas })}
          />
          <div className={s.section}>
            <button
              type="button"
              className={s.presetSaveBtn}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => onChange(VISTA_OPCIONES_DEFAULT)}
            >
              <RotateCcw size={13} /> Restablecer vista
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
