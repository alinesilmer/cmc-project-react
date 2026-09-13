import { AlertTriangle, Check } from "lucide-react";

import styles from "../FilterModal.module.scss";

type ColumnGroup = "identificacion" | "profesional" | "consultorio" | "fiscal" | "personal";

const GRUPOS: { id: ColumnGroup; label: string }[] = [
  { id: "identificacion", label: "Identificación" },
  { id: "profesional", label: "Datos profesionales" },
  { id: "consultorio", label: "Consultorio" },
  { id: "fiscal", label: "Fiscales" },
  { id: "personal", label: "Datos personales" },
];

// BUG FIX: key was "telefono_particular" — ExportColumnKey uses "tele_particular".
// Wrong key caused blank phone column in every export.
//
// `group` sólo ordena el selector; `sensible` marca lo que no debería salir del
// Colegio por descuido (mismo criterio que el selector de campos del padrón).
export const AVAILABLE_COLUMNS: {
  key: string;
  label: string;
  group: ColumnGroup;
  sensible?: boolean;
}[] = [
  { key: "nombre", label: "Nombre completo", group: "identificacion" },
  { key: "matricula_prov", label: "Matrícula Provincial", group: "identificacion" },
  { key: "matricula_nac", label: "Matrícula Nacional", group: "identificacion" },

  { key: "especialidad", label: "Especialidad", group: "profesional" },
  { key: "categoria", label: "Categoría", group: "profesional" },
  { key: "fecha_ingreso", label: "Fecha de Ingreso", group: "profesional" },
  { key: "malapraxis", label: "Mala Praxis", group: "profesional" },
  { key: "vencimiento_malapraxis", label: "Venc. Mala Praxis", group: "profesional" },
  { key: "vencimiento_anssal", label: "Venc. ANSSAL", group: "profesional" },
  { key: "vencimiento_cobertura", label: "Venc. Cobertura", group: "profesional" },

  { key: "domicilio_consulta", label: "Domicilio Consultorio", group: "consultorio" },
  { key: "telefono_consulta", label: "Teléfono Consultorio", group: "consultorio" },
  { key: "provincia", label: "Provincia", group: "consultorio" },

  { key: "cuit", label: "CUIT", group: "fiscal", sensible: true },
  { key: "condicion_impositiva", label: "Condición Impositiva", group: "fiscal" },

  { key: "documento", label: "Documento", group: "personal", sensible: true },
  { key: "sexo", label: "Sexo", group: "personal", sensible: true },
  { key: "mail_particular", label: "Mail", group: "personal", sensible: true },
  { key: "tele_particular", label: "Teléfono", group: "personal", sensible: true },
  { key: "celular_particular", label: "Celular", group: "personal", sensible: true },
];

const ALL_KEYS = AVAILABLE_COLUMNS.map((c) => c.key);

interface Props {
  columns: string[];
  onToggleColumn: (key: string) => void;
  onSetColumns: (keys: string[]) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ColumnsSection({ columns, onToggleColumn, onSetColumns, expanded, onToggle }: Props) {
  const elegidas = new Set(columns);
  const allSelected = ALL_KEYS.every((k) => elegidas.has(k));
  const sensibles = AVAILABLE_COLUMNS.filter((c) => c.sensible && elegidas.has(c.key)).length;

  const alternarGrupo = (grupo: ColumnGroup) => {
    const delGrupo = AVAILABLE_COLUMNS.filter((c) => c.group === grupo);
    const todosPuestos = delGrupo.every((c) => elegidas.has(c.key));
    const next = new Set(elegidas);
    for (const c of delGrupo) {
      if (todosPuestos) next.delete(c.key);
      else next.add(c.key);
    }
    onSetColumns(ALL_KEYS.filter((k) => next.has(k)));
  };

  return (
    <div className={styles.filterSection}>
      <button className={styles.filterSectionHeader} onClick={onToggle} type="button">
        <span>Datos a incluir ({columns.length}/{ALL_KEYS.length})</span>
        <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className={styles.filterSectionContent}>
          <button
            type="button"
            className={styles.selectAllBtn}
            onClick={() => onSetColumns(allSelected ? [] : [...ALL_KEYS])}
          >
            {allSelected ? "Quitar todos" : "Agregar todos"}
          </button>

          <div className={styles.colGroups}>
            {GRUPOS.map((g) => {
              const campos = AVAILABLE_COLUMNS.filter((c) => c.group === g.id);
              const puestos = campos.filter((c) => elegidas.has(c.key)).length;
              return (
                <section key={g.id} className={styles.colGroup}>
                  <div className={styles.colGroupHead}>
                    <h4 className={styles.colGroupTitle}>
                      {g.label}
                      {g.id === "personal" && (
                        <span className={styles.colPersonalTag}>
                          <AlertTriangle size={11} aria-hidden="true" /> Personales
                        </span>
                      )}
                    </h4>
                    <button
                      type="button"
                      className={styles.colGroupToggle}
                      onClick={() => alternarGrupo(g.id)}
                    >
                      {puestos === campos.length ? "Quitar todos" : "Agregar todos"}
                    </button>
                  </div>

                  <div className={styles.colOptions}>
                    {campos.map((c) => {
                      const activo = elegidas.has(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          role="checkbox"
                          aria-checked={activo}
                          className={`${styles.colOption} ${activo ? styles.colOptionOn : ""}`}
                          onClick={() => onToggleColumn(c.key)}
                        >
                          <span className={styles.colBox} aria-hidden="true">
                            {activo && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span className={styles.colOptionLabel}>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className={styles.colNotes}>
            <span className={styles.colCount}>
              {columns.length} {columns.length === 1 ? "columna" : "columnas"}
            </span>
            {sensibles > 0 && (
              <span className={styles.colNoteWarn}>
                <AlertTriangle size={12} aria-hidden="true" />
                Incluye {sensibles} {sensibles === 1 ? "dato personal" : "datos personales"}.
                Revisá antes de enviarlo fuera del Colegio.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
