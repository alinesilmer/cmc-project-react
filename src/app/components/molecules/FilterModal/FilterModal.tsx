"use client";

import type React from "react";
import { useEffect, useState } from "react";
import styles from "./FilterModal.module.scss";
import Button from "../../atoms/Button/Button";
import type { FilterSelection, MissingFieldKey } from "../../../types/filters";
import { getJSON } from "../../../lib/http";

const AVAILABLE_COLUMNS = [
  { key: "nombre", label: "Nombre completo" },
  { key: "sexo", label: "Sexo" },
  { key: "documento", label: "Documento" },
  { key: "mail_particular", label: "Mail" },
  { key: "tele_particular", label: "Teléfono" },
  { key: "celular_particular", label: "Celular" },
  { key: "matricula_prov", label: "Matrícula Provincial" },
  { key: "matricula_nac", label: "Matrícula Nacional" },
  { key: "domicilio_consulta", label: "Domicilio Consultorio" },
  { key: "telefono_consulta", label: "Teléfono Consultorio" },
  { key: "provincia", label: "Provincia" },
  { key: "categoria", label: "Categoría" },
  { key: "especialidad", label: "Especialidad" },
  { key: "condicion_impositiva", label: "Condición Impositiva" },

  // ✅ empresa
  { key: "malapraxis", label: "Mala Praxis (empresa)" },

  // ✅ vencimientos exportables
  { key: "vencimiento_malapraxis", label: "Venc. Mala Praxis" },
  { key: "vencimiento_anssal", label: "Venc. ANSSAL" },
  { key: "vencimiento_cobertura", label: "Venc. Cobertura" },
];

const missingLabelByKey: Record<MissingFieldKey, string> = {
  telefono_consulta: "Teléfono consultorio",
  domicilio_consulta: "Domicilio consultorio",
  mail_particular: "Mail",
  tele_particular: "Teléfono particular",
  celular_particular: "Celular",
  matricula_prov: "Matrícula provincial",
  matricula_nac: "Matrícula nacional",
  provincia: "Provincia",
  categoria: "Categoría",
  especialidad: "Especialidad",
  condicion_impositiva: "Condición impositiva",
  malapraxis: "Mala praxis (empresa)",
};

interface FilterModalProps {
  filters: FilterSelection;
  setFilters: React.Dispatch<React.SetStateAction<FilterSelection>>;
  exportError: string | null;
  exportLoading: boolean;
  onExport: (format: "xlsx" | "csv", logoFile: File | null) => void;
  onClose: () => void;
  resetFilters: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  filters,
  setFilters,
  exportError,
  exportLoading,
  onExport,
  onClose,
  resetFilters,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    columns: true,
    vencimientos: true,
    otros: false,
    faltantes: false,
  });

  type EspecialidadOption = { value: string; label: string };
  const [espLoading, setEspLoading] = useState(false);
  const [espError, setEspError] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>([]);

  useEffect(() => {
    let abort = false;

    async function loadEspecialidades() {
      setEspLoading(true);
      setEspError(null);
      try {
        const data = await getJSON<any[]>("/api/especialidades/");
        const opts: EspecialidadOption[] = Array.isArray(data)
          ? data.map((e: any) => {
              const rawVal = e?.id ?? e?.ID ?? e?.codigo ?? e?.CODIGO ?? e?.value ?? e?.nombre ?? e?.NOMBRE;
              const rawLabel = e?.nombre ?? e?.NOMBRE ?? e?.descripcion ?? e?.DESCRIPCION ?? e?.detalle ?? e?.DETALLE ?? rawVal;
              return { value: String(rawVal ?? ""), label: String(rawLabel ?? "") };
            })
          : [];
        if (!abort) setEspecialidades(opts);
      } catch (err: any) {
        if (!abort) setEspError(err?.message || "No se pudo cargar especialidades");
      } finally {
        if (!abort) setEspLoading(false);
      }
    }

    loadEspecialidades();
    return () => {
      abort = true;
    };
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleColumn = (key: string) => {
    setFilters((prev) => ({
      ...prev,
      columns: prev.columns.includes(key) ? prev.columns.filter((c) => c !== key) : [...prev.columns, key],
    }));
  };

  const onChangeDias: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const n = Number(e.target.value);
    setFilters((prev) => ({
      ...prev,
      vencimientos: { ...prev.vencimientos, dias: Number.isFinite(n) ? n : 0 },
    }));
  };

  const activeFiltersCount = () => {
    let count = 0;

    // vencimientos
    if (filters.vencimientos.malapraxisVencida) count++;
    if (filters.vencimientos.malapraxisPorVencer) count++;
    if (filters.vencimientos.anssalVencido) count++;
    if (filters.vencimientos.anssalPorVencer) count++;
    if (filters.vencimientos.coberturaVencida) count++;
    if (filters.vencimientos.coberturaPorVencer) count++;
    if (filters.vencimientos.fechaDesde) count++;
    if (filters.vencimientos.fechaHasta) count++;
    if (filters.vencimientos.dias > 0) count++;

    // otros
    if (filters.otros.estado) count++;
    if (filters.otros.adherente) count++;
    if (filters.otros.provincia) count++;
    if (filters.otros.sexo) count++;
    if (filters.otros.categoria) count++;
    if (filters.otros.condicionImpositiva) count++;
    if (filters.otros.especialidad) count++;
    if (filters.otros.fechaIngresoDesde) count++;
    if (filters.otros.fechaIngresoHasta) count++;
    if (filters.otros.conMalapraxis) count++;

    // faltantes
    if (filters.faltantes.enabled) count++;

    return count;
  };

  const especialidadLabel = (val: string) => especialidades.find((o) => o.value === val)?.label ?? val;

  return (
    <div className={styles.exportModalNew}>
      <div className={styles.exportContent}>
        <div className={styles.filterSections}>
          {/* ===================== Columns ===================== */}
          <div className={styles.filterSection}>
            <button className={styles.filterSectionHeader} onClick={() => toggleSection("columns")} type="button">
              <span>Columnas a exportar</span>
              <span className={styles.chevron}>{expandedSections.columns ? "▲" : "▼"}</span>
            </button>

            {expandedSections.columns && (
              <div className={styles.filterSectionContent}>
                <div className={styles.checkboxGrid}>
                  {AVAILABLE_COLUMNS.map((col) => (
                    <label key={col.key} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.columns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className={styles.checkbox}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===================== Vencimientos ===================== */}
          <div className={styles.filterSection}>
            <button className={styles.filterSectionHeader} onClick={() => toggleSection("vencimientos")} type="button">
              <span>Vencimientos</span>
              <span className={styles.chevron}>{expandedSections.vencimientos ? "▲" : "▼"}</span>
            </button>

            {expandedSections.vencimientos && (
              <div className={styles.filterSectionContent}>
                <div className={styles.vencTopHint}>
                  Elegí qué documentos querés filtrar. <b>“Por vencer”</b> usa el rango seleccionado.
                </div>

                <div className={styles.vencCards}>
                  {/* Mala praxis */}
                  <div className={styles.vencCard}>
                    <div className={styles.vencCardTitle}>Mala Praxis</div>
                    <div className={styles.vencCardChecks}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={filters.vencimientos.malapraxisVencida}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              vencimientos: { ...prev.vencimientos, malapraxisVencida: e.target.checked },
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span>Vencida</span>
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={filters.vencimientos.malapraxisPorVencer}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              vencimientos: { ...prev.vencimientos, malapraxisPorVencer: e.target.checked },
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span>Por vencer</span>
                      </label>
                    </div>
                  </div>

                  {/* ANSSAL */}
                  <div className={styles.vencCard}>
                    <div className={styles.vencCardTitle}>ANSSAL</div>
                    <div className={styles.vencCardChecks}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={filters.vencimientos.anssalVencido}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              vencimientos: { ...prev.vencimientos, anssalVencido: e.target.checked },
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span>Vencida</span>
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={filters.vencimientos.anssalPorVencer}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              vencimientos: { ...prev.vencimientos, anssalPorVencer: e.target.checked },
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span>Por vencer</span>
                      </label>
                    </div>
                  </div>

                  {/* Cobertura */}
                  <div className={styles.vencCard}>
                    <div className={styles.vencCardTitle}>Cobertura</div>
                    <div className={styles.vencCardChecks}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={filters.vencimientos.coberturaVencida}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              vencimientos: { ...prev.vencimientos, coberturaVencida: e.target.checked },
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span>Vencida</span>
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={filters.vencimientos.coberturaPorVencer}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              vencimientos: { ...prev.vencimientos, coberturaPorVencer: e.target.checked },
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span>Por vencer</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.vencRangeBox}>
                  <div className={styles.vencRangeTitle}>Rango para “por vencer”</div>

                  <div className={styles.vencRangeGrid}>
                    <div className={styles.vencRangeField}>
                      <label className={styles.exportLabel}>Próximos días</label>
                      <select value={filters.vencimientos.dias} onChange={onChangeDias} className={styles.diasSelect}>
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
                        value={filters.vencimientos.fechaDesde || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: { ...prev.vencimientos, fechaDesde: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className={styles.vencRangeField}>
                      <label className={styles.exportLabel}>Hasta</label>
                      <input
                        type="date"
                        className={styles.dateInput}
                        value={filters.vencimientos.fechaHasta || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: { ...prev.vencimientos, fechaHasta: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.vencRangeHint}>
                    Tip: si cargás fechas, se usa ese rango. Si no, se usa “Próximos días”.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===================== Otros ===================== */}
          <div className={styles.filterSection}>
            <button className={styles.filterSectionHeader} onClick={() => toggleSection("otros")} type="button">
              <span>Otros</span>
              <span className={styles.chevron}>{expandedSections.otros ? "▲" : "▼"}</span>
            </button>

            {expandedSections.otros && (
              <div className={styles.filterSectionContent}>
                <div className={styles.otrosGrid}>
                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Sexo</label>
                    <input
                      type="text"
                      className={styles.exportInput}
                      value={filters.otros.sexo}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, sexo: e.target.value } }))}
                      placeholder="M / F"
                    />
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Estado</label>
                    <select
                      className={styles.exportSelect}
                      value={filters.otros.estado}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, estado: e.target.value as any } }))}
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
                      value={filters.otros.adherente}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, adherente: e.target.value as any } }))}
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
                      value={filters.otros.provincia}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, provincia: e.target.value } }))}
                      placeholder="Ej: Corrientes"
                    />
                  </div>

              

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Especialidad</label>
                    <select
                      className={styles.exportSelect}
                      value={filters.otros.especialidad || ""}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, especialidad: e.target.value } }))}
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
                      value={filters.otros.categoria || ""}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, categoria: e.target.value } }))}
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
                      value={filters.otros.condicionImpositiva || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, otros: { ...prev.otros, condicionImpositiva: e.target.value } }))
                      }
                    >
                      <option value="">Todas</option>
                      <option value="Monotributista">Monotributista</option>
                      <option value="Responsable Inscripto">Responsable Inscripto</option>
                    </select>
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Fecha Ingreso Desde</label>
                    <input
                      type="date"
                      className={styles.exportInput}
                      value={filters.otros.fechaIngresoDesde}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, fechaIngresoDesde: e.target.value } }))}
                    />
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Fecha Ingreso Hasta</label>
                    <input
                      type="date"
                      className={styles.exportInput}
                      value={filters.otros.fechaIngresoHasta}
                      onChange={(e) => setFilters((prev) => ({ ...prev, otros: { ...prev.otros, fechaIngresoHasta: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===================== FALTANTES ===================== */}
          <div className={styles.filterSection}>
            <button className={styles.filterSectionHeader} onClick={() => toggleSection("faltantes")} type="button">
              <span>Faltantes o Presentes</span>
              <span className={styles.chevron}>{expandedSections.faltantes ? "▲" : "▼"}</span>
            </button>

            {expandedSections.faltantes && (
              <div className={styles.filterSectionContent}>
                <div className={styles.faltantesBox}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.faltantes.enabled}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          faltantes: { ...prev.faltantes, enabled: e.target.checked },
                        }))
                      }
                      className={styles.checkbox}
                    />
                    <span>Activar filtro de faltantes</span>
                  </label>

                  {filters.faltantes.enabled && (
                    <div className={styles.faltantesGrid}>
                      <div className={styles.exportField}>
                        <label className={styles.exportLabel}>Campo</label>
                        <select
                          className={styles.exportSelect}
                          value={filters.faltantes.field}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              faltantes: { ...prev.faltantes, field: e.target.value as MissingFieldKey },
                            }))
                          }
                        >
                          {Object.entries(missingLabelByKey).map(([k, label]) => (
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
                          value={filters.faltantes.mode}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              faltantes: { ...prev.faltantes, mode: e.target.value as "missing" | "present" },
                            }))
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
        </div>

        {/* ===================== Selected ===================== */}
        <div className={styles.selectedFilters}>
          <h3 className={styles.selectedFiltersTitle}>Resumen</h3>
          <div className={styles.selectedFiltersCount}>{activeFiltersCount()} filtros activos</div>

          <div className={styles.selectedFiltersList}>
            {filters.columns.length > 0 && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>Columnas ({filters.columns.length})</div>
                {filters.columns.slice(0, 4).map((col) => (
                  <div key={col} className={styles.selectedFilterItem}>
                    {AVAILABLE_COLUMNS.find((c) => c.key === col)?.label || col}
                  </div>
                ))}
                {filters.columns.length > 4 && (
                  <div className={styles.selectedFilterItem}>+{filters.columns.length - 4} más</div>
                )}
              </div>
            )}

            {(filters.otros.estado ||
              filters.otros.adherente ||
              filters.otros.provincia ||
              filters.otros.sexo ||
              filters.otros.categoria ||
              filters.otros.condicionImpositiva ||
              filters.otros.especialidad ||
              filters.otros.conMalapraxis) && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>Otros</div>
                {filters.otros.estado && <div className={styles.selectedFilterItem}>Estado: {filters.otros.estado}</div>}
                {filters.otros.adherente && <div className={styles.selectedFilterItem}>Adherente: {filters.otros.adherente}</div>}
                {filters.otros.provincia && <div className={styles.selectedFilterItem}>Provincia: {filters.otros.provincia}</div>}
                {filters.otros.sexo && <div className={styles.selectedFilterItem}>Sexo: {filters.otros.sexo}</div>}
                {filters.otros.categoria && <div className={styles.selectedFilterItem}>Categoría: {filters.otros.categoria}</div>}
                {filters.otros.condicionImpositiva && (
                  <div className={styles.selectedFilterItem}>Cond. Imp.: {filters.otros.condicionImpositiva}</div>
                )}
                {filters.otros.especialidad && (
                  <div className={styles.selectedFilterItem}>Especialidad: {especialidadLabel(filters.otros.especialidad)}</div>
                )}
                {filters.otros.conMalapraxis && <div className={styles.selectedFilterItem}>Solo con mala praxis</div>}
              </div>
            )}

            {filters.faltantes.enabled && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>Faltantes</div>
                <div className={styles.selectedFilterItem}>
                  {missingLabelByKey[filters.faltantes.field]} —{" "}
                  {filters.faltantes.mode === "missing" ? "Mostrar faltantes" : "Mostrar presentes"}
                </div>
              </div>
            )}

            {(filters.vencimientos.malapraxisVencida ||
              filters.vencimientos.malapraxisPorVencer ||
              filters.vencimientos.anssalVencido ||
              filters.vencimientos.anssalPorVencer ||
              filters.vencimientos.coberturaVencida ||
              filters.vencimientos.coberturaPorVencer) && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>Vencimientos</div>
                {filters.vencimientos.malapraxisVencida && <div className={styles.selectedFilterItem}>Mala praxis vencida</div>}
                {filters.vencimientos.malapraxisPorVencer && <div className={styles.selectedFilterItem}>Mala praxis por vencer</div>}
                {filters.vencimientos.anssalVencido && <div className={styles.selectedFilterItem}>ANSSAL vencida</div>}
                {filters.vencimientos.anssalPorVencer && <div className={styles.selectedFilterItem}>ANSSAL por vencer</div>}
                {filters.vencimientos.coberturaVencida && <div className={styles.selectedFilterItem}>Cobertura vencida</div>}
                {filters.vencimientos.coberturaPorVencer && <div className={styles.selectedFilterItem}>Cobertura por vencer</div>}
              </div>
            )}

            {activeFiltersCount() === 0 && <div className={styles.noFilters}>No hay filtros seleccionados</div>}
          </div>

          <button className={styles.clearFiltersButton} onClick={resetFilters} type="button">
            Limpiar filtros
          </button>
        </div>
      </div>

      {exportError && <div className={styles.exportError}>{exportError}</div>}

      <div className={styles.exportActionsRow}>
        <div className={styles.exportActionsLeft}>
          <Button onClick={() => onExport("xlsx", null)} disabled={exportLoading} variant="primary" size="md">
            {exportLoading ? "Exportando..." : "Descargar Excel"}
          </Button>

        </div>

        <div className={styles.exportActionsRight}>
          <Button onClick={onClose} variant="secondary" size="md">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
