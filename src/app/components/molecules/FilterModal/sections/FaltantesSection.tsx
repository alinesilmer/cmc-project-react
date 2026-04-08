import type { FaltantesFilter, MissingFieldKey } from "../../../../types/filters";
import { MISSING_FIELD_LABELS } from "../../../../types/filters";
import styles from "../FilterModal.module.scss";

interface Props {
  faltantes: FaltantesFilter;
  onPatch: (patch: Partial<FaltantesFilter>) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function FaltantesSection({ faltantes, onPatch, expanded, onToggle }: Props) {
  return (
    <div className={styles.filterSection}>
      <button className={styles.filterSectionHeader} onClick={onToggle} type="button">
        <span>Faltantes o Presentes</span>
        <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className={styles.filterSectionContent}>
          <div className={styles.faltantesBox}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={faltantes.enabled}
                onChange={(e) => onPatch({ enabled: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Activar filtro de faltantes</span>
            </label>

            {faltantes.enabled && (
              <div className={styles.faltantesGrid}>
                <div className={styles.exportField}>
                  <label className={styles.exportLabel}>Campo</label>
                  <select
                    className={styles.exportSelect}
                    value={faltantes.field}
                    onChange={(e) => onPatch({ field: e.target.value as MissingFieldKey })}
                  >
                    {Object.entries(MISSING_FIELD_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.exportField}>
                  <label className={styles.exportLabel}>Modo</label>
                  <select
                    className={styles.exportSelect}
                    value={faltantes.mode}
                    onChange={(e) =>
                      onPatch({ mode: e.target.value as "missing" | "present" })
                    }
                  >
                    <option value="missing">Mostrar faltantes</option>
                    <option value="present">Mostrar presentes</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
