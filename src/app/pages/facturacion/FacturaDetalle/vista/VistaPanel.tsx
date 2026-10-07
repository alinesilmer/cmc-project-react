import { X, RotateCcw } from "lucide-react";
import type { VistaOpciones } from "./types";
import { VISTA_OPCIONES_DEFAULT } from "./types";
import OrdenVistaSection from "./OrdenVistaSection";
import AgrupacionVistaSection from "./AgrupacionVistaSection";
import FiltrosVistaSection from "./FiltrosVistaSection";
import ColumnasVistaSection from "./ColumnasVistaSection";
import PresetsVistaSection from "./PresetsVistaSection";
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
              Ordená, agrupá, filtrá y elegí columnas — no cambia los datos. El exportable sale tal como lo ves acá.
            </p>
          </div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Cerrar panel">
            <X size={18} />
          </button>
        </div>

        <div className={s.drawerBody}>
          <AgrupacionVistaSection
            agrupacion={opciones.agrupacion}
            onChangeAgrupacion={(agrupacion) => onChange({ ...opciones, agrupacion })}
          />
          {/* En "Por socio" el orden es fijo: no hay nada que elegir. */}
          {opciones.agrupacion !== "por_socio" && (
            <OrdenVistaSection
              orden={opciones.orden}
              direccion={opciones.direccion}
              agrupacion={opciones.agrupacion}
              onChangeOrden={(orden) => onChange({ ...opciones, orden })}
              onChangeDireccion={(direccion) => onChange({ ...opciones, direccion })}
            />
          )}
          <FiltrosVistaSection
            filtros={opciones}
            onChange={(filtros) => onChange({ ...opciones, ...filtros })}
            prestadores={prestadores}
          />
          <ColumnasVistaSection
            columnas={opciones.columnas}
            onChange={(columnas) => onChange({ ...opciones, columnas })}
          />
          <PresetsVistaSection
            opciones={opciones}
            // Un preset puede ser de antes de que existiera alguna opción: lo que falte toma el valor por defecto.
            onAplicar={(preset) => onChange({ ...VISTA_OPCIONES_DEFAULT, ...preset })}
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
