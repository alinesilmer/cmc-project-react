import styles from "../FilterModal.module.scss";

// BUG FIX: key was "telefono_particular" — ExportColumnKey uses "tele_particular".
// Wrong key caused blank phone column in every export.
export const AVAILABLE_COLUMNS = [
  { key: "nombre", label: "Nombre completo" },
  { key: "sexo", label: "Sexo" },
  { key: "documento", label: "Documento" },
  { key: "cuit", label: "CUIT" },
  { key: "mail_particular", label: "Mail" },
  { key: "tele_particular", label: "Teléfono" },
  { key: "celular_particular", label: "Celular" },
  { key: "matricula_prov", label: "Matrícula Provincial" },
  { key: "matricula_nac", label: "Matrícula Nacional" },
  { key: "domicilio_consulta", label: "Domicilio Consultorio" },
  { key: "fecha_ingreso", label: "Fecha de Ingreso" },
  { key: "telefono_consulta", label: "Teléfono Consultorio" },
  { key: "provincia", label: "Provincia" },
  { key: "categoria", label: "Categoría" },
  { key: "especialidad", label: "Especialidad" },
  { key: "condicion_impositiva", label: "Condición Impositiva" },
  { key: "malapraxis", label: "Mala Praxis" },
  { key: "vencimiento_malapraxis", label: "Venc. Mala Praxis" },
  { key: "vencimiento_anssal", label: "Venc. ANSSAL" },
  { key: "vencimiento_cobertura", label: "Venc. Cobertura" },
] as const;

const ALL_KEYS = AVAILABLE_COLUMNS.map((c) => c.key);

interface Props {
  columns: string[];
  onToggleColumn: (key: string) => void;
  onSetColumns: (keys: string[]) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ColumnsSection({ columns, onToggleColumn, onSetColumns, expanded, onToggle }: Props) {
  const allSelected = ALL_KEYS.every((k) => columns.includes(k));

  return (
    <div className={styles.filterSection}>
      <button className={styles.filterSectionHeader} onClick={onToggle} type="button">
        <span>Columnas a exportar ({columns.length}/{ALL_KEYS.length})</span>
        <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className={styles.filterSectionContent}>
          <button
            type="button"
            className={styles.selectAllBtn}
            onClick={() => onSetColumns(allSelected ? [] : [...ALL_KEYS])}
          >
            {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>

          <div className={styles.checkboxGrid}>
            {AVAILABLE_COLUMNS.map((col) => (
              <label key={col.key} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={columns.includes(col.key)}
                  onChange={() => onToggleColumn(col.key)}
                  className={styles.checkbox}
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
