import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { listarExportPresets, crearExportPreset, eliminarExportPreset } from "../../api";
import type { ExportOpciones, ExportPreset, TipoDocumentoPreset } from "./types";
import s from "./export.module.scss";

interface Props {
  tipoDocumento: TipoDocumentoPreset;
  opciones: ExportOpciones;
  onAplicar: (opciones: ExportOpciones) => void;
}

export default function PresetsSection({ tipoDocumento, opciones, onAplicar }: Props) {
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [cargando, setCargando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const recargar = async () => {
    setCargando(true);
    try {
      setPresets(await listarExportPresets(tipoDocumento));
    } catch {
      // silencioso: los presets son una comodidad, no bloquean el export
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoDocumento]);

  const guardar = async () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setGuardando(true);
    try {
      await crearExportPreset({ nombre, tipo_documento: tipoDocumento, opciones });
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
      await eliminarExportPreset(id);
    } catch {
      await recargar();
    }
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Presets guardados</h3>
      </div>

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
