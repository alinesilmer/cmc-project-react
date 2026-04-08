import { useMemo } from "react";
import type { EspecialidadOption } from "../../../../lib/especialidadesCatalog";
import type { OtrosFilter } from "../../../../types/filters";
import styles from "../FilterModal.module.scss";

interface Props {
  otros: OtrosFilter;
  onPatch: (patch: Partial<OtrosFilter>) => void;
  especialidades: EspecialidadOption[];
  espLoading: boolean;
  espError: string | null;
  expanded: boolean;
  onToggle: () => void;
}

export function OtrosSection({
  otros,
  onPatch,
  especialidades,
  espLoading,
  espError,
  expanded,
  onToggle,
}: Props) {
  const selectedEspId = useMemo(() => {
    const v = otros.especialidad || "";
    return v.startsWith("id:") ? v.slice(3) : "";
  }, [otros.especialidad]);

  return (
    <div className={styles.filterSection}>
      <button className={styles.filterSectionHeader} onClick={onToggle} type="button">
        <span>Otros</span>
        <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className={styles.filterSectionContent}>
          <div className={styles.otrosGrid}>
            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Sexo</label>
              <input
                type="text"
                className={styles.exportInput}
                value={otros.sexo}
                onChange={(e) => onPatch({ sexo: e.target.value })}
                placeholder="M / F"
              />
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>CUIT</label>
              <input
                type="text"
                className={styles.exportInput}
                value={otros.cuit}
                onChange={(e) => onPatch({ cuit: e.target.value })}
                placeholder="Ej: 20-12345678-9"
              />
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Estado</label>
              <select
                className={styles.exportSelect}
                value={otros.estado}
                onChange={(e) => onPatch({ estado: e.target.value as OtrosFilter["estado"] })}
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Adherente</label>
              <select
                className={styles.exportSelect}
                value={otros.adherente}
                onChange={(e) => onPatch({ adherente: e.target.value as OtrosFilter["adherente"] })}
              >
                <option value="">Todos</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Provincia</label>
              <input
                type="text"
                className={styles.exportInput}
                value={otros.provincia}
                onChange={(e) => onPatch({ provincia: e.target.value })}
                placeholder="Ej: Corrientes"
              />
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Especialidad</label>
              <select
                className={styles.exportSelect}
                value={selectedEspId}
                onChange={(e) =>
                  onPatch({ especialidad: e.target.value ? `id:${e.target.value}` : "" })
                }
                disabled={espLoading || !!espError}
              >
                <option value="">{espLoading ? "Cargando..." : "Todas"}</option>
                {espError ? (
                  <option value="" disabled>{`Error: ${espError}`}</option>
                ) : (
                  especialidades.map((opt) => (
                    <option key={`${opt.value}-${opt.label}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Categoría</label>
              <select
                className={styles.exportSelect}
                value={otros.categoria || ""}
                onChange={(e) => onPatch({ categoria: e.target.value })}
              >
                <option value="">Todas</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Condición Impositiva</label>
              <select
                className={styles.exportSelect}
                value={otros.condicionImpositiva || ""}
                onChange={(e) => onPatch({ condicionImpositiva: e.target.value })}
              >
                <option value="">Todas</option>
                <option value="Monotributista">Monotributista</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
              </select>
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Mala Praxis</label>
              <select
                className={styles.exportSelect}
                value={otros.tieneMalapraxis || ""}
                onChange={(e) =>
                  onPatch({ tieneMalapraxis: e.target.value as OtrosFilter["tieneMalapraxis"] })
                }
              >
                <option value="">Todos</option>
                <option value="true">Con mala praxis</option>
                <option value="false">Sin mala praxis</option>
              </select>
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Fecha Ingreso Desde</label>
              <input
                type="date"
                className={styles.exportInput}
                value={otros.fechaIngresoDesde}
                onChange={(e) => onPatch({ fechaIngresoDesde: e.target.value })}
              />
            </div>

            <div className={styles.exportField}>
              <label className={styles.exportLabel}>Fecha Ingreso Hasta</label>
              <input
                type="date"
                className={styles.exportInput}
                value={otros.fechaIngresoHasta}
                onChange={(e) => onPatch({ fechaIngresoHasta: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
