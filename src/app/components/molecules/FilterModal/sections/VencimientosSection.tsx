import type { VencimientosFilter } from "../../../../types/filters";
import styles from "../FilterModal.module.scss";

interface Props {
  vencimientos: VencimientosFilter;
  onPatch: (patch: Partial<VencimientosFilter>) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function VencimientosSection({ vencimientos: v, onPatch, expanded, onToggle }: Props) {
  return (
    <div className={styles.filterSection}>
      <button className={styles.filterSectionHeader} onClick={onToggle} type="button">
        <span>Vencimientos</span>
        <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className={styles.filterSectionContent}>
          <div className={styles.vencTopHint}>
            Elegí qué documentos querés filtrar. <b>"Por vencer"</b> usa el rango seleccionado.
          </div>

          <div className={styles.vencCards}>
            {(
              [
                { title: "Mala Praxis", vencida: "malapraxisVencida", porVencer: "malapraxisPorVencer" },
                { title: "ANSSAL", vencida: "anssalVencido", porVencer: "anssalPorVencer" },
                { title: "Cobertura", vencida: "coberturaVencida", porVencer: "coberturaPorVencer" },
              ] as const
            ).map(({ title, vencida, porVencer }) => (
              <div key={title} className={styles.vencCard}>
                <div className={styles.vencCardTitle}>{title}</div>
                <div className={styles.vencCardChecks}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={v[vencida]}
                      onChange={(e) => onPatch({ [vencida]: e.target.checked })}
                      className={styles.checkbox}
                    />
                    <span>Vencida</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={v[porVencer]}
                      onChange={(e) => onPatch({ [porVencer]: e.target.checked })}
                      className={styles.checkbox}
                    />
                    <span>Por vencer</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.vencRangeBox}>
            <div className={styles.vencRangeTitle}>Rango para "por vencer"</div>

            <div className={styles.vencRangeGrid}>
              <div className={styles.vencRangeField}>
                <label className={styles.exportLabel}>Próximos días</label>
                <select
                  value={v.dias}
                  onChange={(e) => onPatch({ dias: Number(e.target.value) || 0 })}
                  className={styles.diasSelect}
                >
                  <option value={0}>Sin rango</option>
                  <option value={30}>Próximos 30 días</option>
                  <option value={60}>Próximos 60 días</option>
                  <option value={90}>Próximos 90 días</option>
                </select>
              </div>

              <div className={styles.vencRangeField}>
                <label className={styles.exportLabel}>Desde</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={v.fechaDesde || ""}
                  onChange={(e) => onPatch({ fechaDesde: e.target.value })}
                />
              </div>

              <div className={styles.vencRangeField}>
                <label className={styles.exportLabel}>Hasta</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={v.fechaHasta || ""}
                  onChange={(e) => onPatch({ fechaHasta: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.vencRangeHint}>
              Tip: si cargás fechas, se usa ese rango. Si no, se usa "Próximos días".
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
