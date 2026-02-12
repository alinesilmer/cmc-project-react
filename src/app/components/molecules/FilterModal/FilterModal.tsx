"use client";

import type React from "react";
import { useEffect, useState } from "react";
import styles from "./FilterModal.module.scss";
import Button from "../../atoms/Button/Button";
import type { FilterSelection, MissingFieldKey } from "../../../types/filters";
import { getJSON } from "../../../lib/http";
import { setEspecialidadesCatalog } from "../../../lib/especialidadesCatalog";

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
  malapraxis: "Mala praxis",
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

type EspecialidadOption = { value: string; label: string };

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
          ? data
              .map((e: any) => {
                const rawVal = e?.id ?? e?.ID ?? e?.codigo ?? e?.CODIGO ?? e?.value ?? "";
                const rawLabel =
                  e?.nombre ??
                  e?.NOMBRE ??
                  e?.descripcion ??
                  e?.DESCRIPCION ??
                  e?.detalle ??
                  e?.DETALLE ??
                  e?.label ??
                  e?.name ??
                  rawVal;

                const v = String(rawVal ?? "").trim();
                const l = String(rawLabel ?? "").trim();
                return { value: v || l, label: l || v };
              })
              .filter((x) => x.value && x.value !== "0")
          : [];

        // ✅ guarda local + global (export usa global)
        if (!abort) {
          setEspecialidades(opts);
          setEspecialidadesCatalog(opts);
        }
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

    if (filters.vencimientos.malapraxisVencida) count++;
    if (filters.vencimientos.malapraxisPorVencer) count++;
    if (filters.vencimientos.anssalVencido) count++;
    if (filters.vencimientos.anssalPorVencer) count++;
    if (filters.vencimientos.coberturaVencida) count++;
    if (filters.vencimientos.coberturaPorVencer) count++;
    if (filters.vencimientos.fechaDesde) count++;
    if (filters.vencimientos.fechaHasta) count++;
    if (filters.vencimientos.dias > 0) count++;

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

    if (filters.faltantes.enabled) count++;

    return count;
  };

  const especialidadLabel = (val: string) => {
    if (!val) return "";
    if (val.startsWith("id:")) {
      const id = val.slice(3);
      return especialidades.find((o) => o.value === id)?.label ?? id;
    }
    return val;
  };

  const onChangeEspecialidad: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const picked = e.target.value; // "" o id
    if (!picked) {
      setFilters((prev) => ({ ...prev, otros: { ...prev.otros, especialidad: "" } }));
      return;
    }
    setFilters((prev) => ({ ...prev, otros: { ...prev.otros, especialidad: `id:${picked}` } }));
  };

  const selectedEspecialidadIdForSelect = (() => {
    const v = filters.otros.especialidad || "";
    if (v.startsWith("id:")) return v.slice(3);
    return "";
  })();

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
                      value={selectedEspecialidadIdForSelect}
                      onChange={onChangeEspecialidad}
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

                    {filters.otros.especialidad && (
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                        Seleccionado: <b>{especialidadLabel(filters.otros.especialidad)}</b>
                      </div>
                    )}
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
            {(filters.otros.especialidad) && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>Otros</div>
                <div className={styles.selectedFilterItem}>
                  Especialidad: {especialidadLabel(filters.otros.especialidad)}
                </div>
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
