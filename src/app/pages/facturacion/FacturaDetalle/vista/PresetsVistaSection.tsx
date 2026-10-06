import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { crearVistaPreset, eliminarVistaPreset, listarVistaPresets } from "../../api";
import type { VistaOpciones, VistaPreset } from "./types";
import s from "../export/export.module.scss";

interface Props {
  opciones: VistaOpciones;
  onAplicar: (opciones: Partial<VistaOpciones>) => void;
}

// Los presets son de la vista: lo que se guarda acá es lo que después sale en el export.
export default function PresetsVistaSection({ opciones, onAplicar }: Props) {
  const [presets, setPresets] = useState<VistaPreset[]>([]);
  const [cargando, setCargando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const recargar = async () => {
    setCargando(true);
    try {
      setPresets(await listarVistaPresets());
    } catch {
      // silencioso: los presets son una comodidad, no bloquean la vista
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    recargar();
  }, []);

  const guardar = async () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setGuardando(true);
    try {
      await crearVistaPreset(nombre, opciones);
      setNombreNuevo("");
      await recargar();
    } catch {
      // el error ya queda logueado por `traced()`
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    try {
      await eliminarVistaPreset(id);
    } catch {
      await recargar();
    }
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Presets de la vista</h3>
      </div>
      <p className={s.sectionHint}>Guardan cómo ves el listado (agrupación, orden, filtros y columnas); el export sale igual.</p>

      {cargando && <p className={s.sectionHint}>Cargando…</p>}
      {!cargando && presets.length === 0 && <p className={s.sectionHint}>Todavía no guardaste ninguno.</p>}

      {presets.length > 0 && (
        <ul className={s.presetList}>
          {presets.map((p) => (
            <li key={p.id} className={s.presetItem}>
              <button type="button" className={s.presetApply} onClick={() => onAplicar(p.opciones)}>
                {p.nombre}
              </button>
              <button type="button" className={s.presetDelete} onClick={() => eliminar(p.id)} aria-label="Eliminar preset">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={s.presetSaveRow}>
        <input
          type="text" className={s.filterInput} placeholder="Nombre del preset…"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
        />
        <button type="button" className={s.presetSaveBtn} onClick={guardar} disabled={!nombreNuevo.trim() || guardando}>
          Guardar
        </button>
      </div>
    </div>
  );
}
