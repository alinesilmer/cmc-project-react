"use client";

import { useCallback, useState } from "react";
import type React from "react";

import styles from "./FilterModal.module.scss";
import Button from "../../atoms/Button/Button";
import type {
  FaltantesFilter,
  FilterSelection,
  OtrosFilter,
  VencimientosFilter,
} from "../../../types/filters";

import { useEspecialidades } from "./useEspecialidades";
import { ColumnsSection } from "./sections/ColumnsSection";
import { VencimientosSection } from "./sections/VencimientosSection";
import { OtrosSection } from "./sections/OtrosSection";
import { FaltantesSection } from "./sections/FaltantesSection";
import { FiltersResumen } from "./sections/FiltersResumen";

interface FilterModalProps {
  filters: FilterSelection;
  setFilters: React.Dispatch<React.SetStateAction<FilterSelection>>;
  exportError: string | null;
  exportLoading: boolean;
  onExport: (format: "xlsx" | "csv", logoFile: File | null) => void;
  onApply: () => void;
  onClose: () => void;
  resetFilters: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  filters,
  setFilters,
  exportError,
  exportLoading,
  onExport,
  onApply,
  onClose,
  resetFilters,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    columns: true,
    vencimientos: true,
    otros: false,
    faltantes: false,
  });

  const { especialidades, loading: espLoading, error: espError } = useEspecialidades();

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setFilters((prev) => ({
      ...prev,
      columns: prev.columns.includes(key)
        ? prev.columns.filter((c) => c !== key)
        : [...prev.columns, key],
    }));
  }, [setFilters]);

  const setColumns = useCallback((keys: string[]) => {
    setFilters((prev) => ({ ...prev, columns: keys }));
  }, [setFilters]);

  const patchVencimientos = useCallback((patch: Partial<VencimientosFilter>) => {
    setFilters((prev) => ({ ...prev, vencimientos: { ...prev.vencimientos, ...patch } }));
  }, [setFilters]);

  const patchOtros = useCallback((patch: Partial<OtrosFilter>) => {
    setFilters((prev) => ({ ...prev, otros: { ...prev.otros, ...patch } }));
  }, [setFilters]);

  const patchFaltantes = useCallback((patch: Partial<FaltantesFilter>) => {
    setFilters((prev) => ({ ...prev, faltantes: { ...prev.faltantes, ...patch } }));
  }, [setFilters]);

  return (
    <div className={styles.exportModalNew}>
      <div className={styles.exportContent}>
        <div className={styles.filterSections}>
          <ColumnsSection
            columns={filters.columns}
            onToggleColumn={toggleColumn}
            onSetColumns={setColumns}
            expanded={expandedSections.columns}
            onToggle={() => toggleSection("columns")}
          />

          <VencimientosSection
            vencimientos={filters.vencimientos}
            onPatch={patchVencimientos}
            expanded={expandedSections.vencimientos}
            onToggle={() => toggleSection("vencimientos")}
          />

          <OtrosSection
            otros={filters.otros}
            onPatch={patchOtros}
            especialidades={especialidades}
            espLoading={espLoading}
            espError={espError}
            expanded={expandedSections.otros}
            onToggle={() => toggleSection("otros")}
          />

          <FaltantesSection
            faltantes={filters.faltantes}
            onPatch={patchFaltantes}
            expanded={expandedSections.faltantes}
            onToggle={() => toggleSection("faltantes")}
          />
        </div>

        <FiltersResumen
          filters={filters}
          especialidades={especialidades}
          onReset={resetFilters}
        />
      </div>

      {exportError && <div className={styles.exportError}>{exportError}</div>}

      <div className={styles.exportActionsRow}>
        <div className={styles.exportActionsLeft}>
          <Button onClick={onApply} variant="primary" size="md">
            Filtrar
          </Button>
          <Button
            onClick={() => onExport("xlsx", null)}
            disabled={exportLoading}
            variant="secondary"
            size="md"
          >
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
