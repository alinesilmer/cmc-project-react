"use client";

import type React from "react";
import { useRef, useState, useEffect } from "react";
import styles from "./FilterModal.module.scss";
import Button from "../../../../website/components/UI/Button/Button";
import type { FilterSelection } from "../../../types/filters";
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
  { key: "localidad", label: "Localidad" },
  { key: "categoria", label: "Categoría" },
  { key: "especialidad", label: "Especialidad" },
  { key: "condicion_impositiva", label: "Condición Impositiva" },
];

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
    vencimientos: false,
    otros: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              const rawVal =
                e?.id ??
                e?.ID ??
                e?.codigo ??
                e?.CODIGO ??
                e?.value ??
                e?.nombre ??
                e?.NOMBRE;
              const rawLabel =
                e?.nombre ??
                e?.NOMBRE ??
                e?.descripcion ??
                e?.DESCRIPCION ??
                e?.detalle ??
                e?.DETALLE ??
                rawVal;
              return {
                value: String(rawVal ?? ""),
                label: String(rawLabel ?? ""),
              };
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
      columns: prev.columns.includes(key)
        ? prev.columns.filter((c) => c !== key)
        : [...prev.columns, key],
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
    if (filters.otros.estado) count++;
    if (filters.otros.adherente) count++;
    if (filters.otros.provincia) count++;
    if (filters.otros.localidad) count++;
    if (filters.otros.sexo) count++;
    if (filters.otros.categoria) count++;
    if (filters.otros.condicionImpositiva) count++;
    if (filters.otros.especialidad) count++;
    if (filters.otros.fechaIngresoDesde) count++;
    if (filters.otros.fechaIngresoHasta) count++;
    return count;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onChangeDias: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const n = Number(e.target.value);
    setFilters((prev) => ({
      ...prev,
      vencimientos: { ...prev.vencimientos, dias: Number.isFinite(n) ? n : 0 },
    }));
  };

  const fmtDias = (dias: number) => (dias > 0 ? ` (${dias}d)` : "");

  const especialidadLabel = (val: string) =>
    especialidades.find((o) => o.value === val)?.label ?? val;

  return (
    <div className={styles.exportModalNew}>
      <div className={styles.exportContent}>
        <div className={styles.filterSections}>
          <div className={styles.filterSection}>
            <button
              className={styles.filterSectionHeader}
              onClick={() => toggleSection("columns")}
              type="button"
            >
              <span>Por Columnas</span>
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

          <div className={styles.filterSection}>
            <button
              className={styles.filterSectionHeader}
              onClick={() => toggleSection("vencimientos")}
              type="button"
            >
              <span>Por Vencimiento</span>
              <span className={styles.chevron}>
                {expandedSections.vencimientos ? "▲" : "▼"}
              </span>
            </button>

            {expandedSections.vencimientos && (
              <div className={styles.filterSectionContent}>
                <div className={styles.vencimientosContent}>
                  <div className={styles.checkboxColumn}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.vencimientos.malapraxisVencida}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: {
                              ...prev.vencimientos,
                              malapraxisVencida: e.target.checked,
                            },
                          }))
                        }
                        className={styles.checkbox}
                      />
                      <span>Mala Praxis Vencida</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.vencimientos.malapraxisPorVencer}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: {
                              ...prev.vencimientos,
                              malapraxisPorVencer: e.target.checked,
                            },
                          }))
                        }
                        className={styles.checkbox}
                      />
                      <span>Mala Praxis a Vencer</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.vencimientos.anssalVencido}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: {
                              ...prev.vencimientos,
                              anssalVencido: e.target.checked,
                            },
                          }))
                        }
                        className={styles.checkbox}
                      />
                      <span>ANSSAL Vencida</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.vencimientos.anssalPorVencer}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: {
                              ...prev.vencimientos,
                              anssalPorVencer: e.target.checked,
                            },
                          }))
                        }
                        className={styles.checkbox}
                      />
                      <span>ANSSAL a Vencer</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.vencimientos.coberturaVencida}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: {
                              ...prev.vencimientos,
                              coberturaVencida: e.target.checked,
                            },
                          }))
                        }
                        className={styles.checkbox}
                      />
                      <span>Cobertura Vencida</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.vencimientos.coberturaPorVencer}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            vencimientos: {
                              ...prev.vencimientos,
                              coberturaPorVencer: e.target.checked,
                            },
                          }))
                        }
                        className={styles.checkbox}
                      />
                      <span>Cobertura a Vencer</span>
                    </label>
                  </div>

                  <div className={styles.vencimientosInputs}>
                    <div className={styles.dateInputRow}>
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

                    <div className={styles.diasPill}>
                      <select
                        value={filters.vencimientos.dias}
                        onChange={onChangeDias}
                        className={styles.diasSelect}
                      >
                        <option value={0}>Sin rango</option>
                        <option value={30}>Próximos 30 días</option>
                        <option value={60}>Próximos 60 días</option>
                        <option value={90}>Próximos 90 días</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.filterSection}>
            <button
              className={styles.filterSectionHeader}
              onClick={() => toggleSection("otros")}
              type="button"
            >
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
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, sexo: e.target.value },
                        }))
                      }
                      placeholder="M / F"
                    />
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Estado</label>
                    <select
                      className={styles.exportSelect}
                      value={filters.otros.estado}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, estado: e.target.value },
                        }))
                      }
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
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, adherente: e.target.value },
                        }))
                      }
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
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, provincia: e.target.value },
                        }))
                      }
                      placeholder="Ej: Corrientes"
                    />
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Localidad</label>
                    <input
                      type="text"
                      className={styles.exportInput}
                      value={filters.otros.localidad}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, localidad: e.target.value },
                        }))
                      }
                      placeholder="Ej: Capital"
                    />
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Especialidad</label>
                    <select
                      className={styles.exportSelect}
                      value={filters.otros.especialidad || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, especialidad: e.target.value },
                        }))
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
                      value={filters.otros.categoria || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, categoria: e.target.value },
                        }))
                      }
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
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, condicionImpositiva: e.target.value },
                        }))
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
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, fechaIngresoDesde: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Fecha Ingreso Hasta</label>
                    <input
                      type="date"
                      className={styles.exportInput}
                      value={filters.otros.fechaIngresoHasta}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          otros: { ...prev.otros, fechaIngresoHasta: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.selectedFilters}>
          <h3 className={styles.selectedFiltersTitle}>Filtros seleccionados</h3>
          <div className={styles.selectedFiltersCount}>{activeFiltersCount()} filtros activos</div>

          <div className={styles.selectedFiltersList}>
            {filters.columns.length > 0 && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>
                  Columnas ({filters.columns.length})
                </div>
                {filters.columns.slice(0, 3).map((col) => (
                  <div key={col} className={styles.selectedFilterItem}>
                    {AVAILABLE_COLUMNS.find((c) => c.key === col)?.label || col}
                  </div>
                ))}
                {filters.columns.length > 3 && (
                  <div className={styles.selectedFilterItem}>+{filters.columns.length - 3} más</div>
                )}
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
                {filters.vencimientos.malapraxisVencida && (
                  <div className={styles.selectedFilterItem}>Mala Praxis Vencida</div>
                )}
                {filters.vencimientos.malapraxisPorVencer && (
                  <div className={styles.selectedFilterItem}>
                    {`Mala Praxis por Vencer${fmtDias(filters.vencimientos.dias)}`}
                  </div>
                )}
                {filters.vencimientos.anssalVencido && (
                  <div className={styles.selectedFilterItem}>ANSSAL Vencido</div>
                )}
                {filters.vencimientos.anssalPorVencer && (
                  <div className={styles.selectedFilterItem}>
                    {`ANSSAL por Vencer${fmtDias(filters.vencimientos.dias)}`}
                  </div>
                )}
                {filters.vencimientos.coberturaVencida && (
                  <div className={styles.selectedFilterItem}>Cobertura Vencida</div>
                )}
                {filters.vencimientos.coberturaPorVencer && (
                  <div className={styles.selectedFilterItem}>
                    {`Cobertura por Vencer${fmtDias(filters.vencimientos.dias)}`}
                  </div>
                )}
              </div>
            )}

            {(filters.otros.estado ||
              filters.otros.adherente ||
              filters.otros.provincia ||
              filters.otros.localidad ||
              filters.otros.sexo ||
              filters.otros.categoria ||
              filters.otros.condicionImpositiva ||
              filters.otros.especialidad) && (
              <div className={styles.selectedFilterGroup}>
                <div className={styles.selectedFilterGroupTitle}>Otros</div>
                {filters.otros.estado && (
                  <div className={styles.selectedFilterItem}>Estado: {filters.otros.estado}</div>
                )}
                {filters.otros.adherente && (
                  <div className={styles.selectedFilterItem}>Adherente: {filters.otros.adherente}</div>
                )}
                {filters.otros.provincia && (
                  <div className={styles.selectedFilterItem}>Provincia: {filters.otros.provincia}</div>
                )}
                {filters.otros.localidad && (
                  <div className={styles.selectedFilterItem}>Localidad: {filters.otros.localidad}</div>
                )}
                {filters.otros.sexo && (
                  <div className={styles.selectedFilterItem}>Sexo: {filters.otros.sexo}</div>
                )}
                {filters.otros.categoria && (
                  <div className={styles.selectedFilterItem}>Categoría: {filters.otros.categoria}</div>
                )}
                {filters.otros.condicionImpositiva && (
                  <div className={styles.selectedFilterItem}>
                    Cond. Imp.: {filters.otros.condicionImpositiva}
                  </div>
                )}
                {filters.otros.especialidad && (
                  <div className={styles.selectedFilterItem}>
                    Especialidad: {especialidadLabel(filters.otros.especialidad)}
                  </div>
                )}
              </div>
            )}

            {activeFiltersCount() === 0 && (
              <div className={styles.noFilters}>No hay filtros seleccionados</div>
            )}
          </div>

          <button className={styles.clearFiltersButton} onClick={resetFilters} type="button">
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className={styles.logoSection}>
        <label className={styles.exportLabel}>Logo (opcional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
        {logoFile && (
          <button className={styles.clearFiltersButton} onClick={handleRemoveLogo} type="button">
            Quitar logo
          </button>
        )}
      </div>

      {exportError && <div className={styles.exportError}>{exportError}</div>}

      <div className={styles.exportActionsRow}>
        <div className={styles.exportActionsLeft}>
          <Button
            onClick={() => onExport("xlsx", logoFile)}
            disabled={exportLoading}
            variant="primary"
            size="medium"
          >
            {exportLoading ? "Exportando..." : "Descargar Excel"}
          </Button>
        </div>
        <div className={styles.exportActionsRight}>
          <Button onClick={onClose} variant="secondary" size="medium">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;

