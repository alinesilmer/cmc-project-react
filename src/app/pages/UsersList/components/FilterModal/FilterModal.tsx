"use client";

import { useCallback, useMemo, useState } from "react";
import type React from "react";
import { Columns3, SearchX, SlidersHorizontal, X } from "lucide-react";

import styles from "./FilterModal.module.scss";
import Button from "@/app/components/ui/Button/Button";
import { Solapa } from "@/app/components/layout/Franja/Franja";
import type {
  FaltantesFilter,
  FilterSelection,
  OtrosFilter,
} from "@/app/types/filters";

import { useEspecialidades } from "./useEspecialidades";
import { filtrosActivos } from "./resumenFiltros";
import { ColumnsSection } from "./sections/ColumnsSection";
import { OtrosSection } from "./sections/OtrosSection";
import { FaltantesSection } from "./sections/FaltantesSection";
import { FiltersResumen } from "./sections/FiltersResumen";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";

interface FilterModalProps {
  filters: FilterSelection;
  setFilters: React.Dispatch<React.SetStateAction<FilterSelection>>;
  exportError: string | null;
  exportLoading: boolean;
  onExport: (format: "xlsx" | "csv" | "pdf", logoFile: File | null) => void;
  onApply: () => void;
  onClose: () => void;
  resetFilters: () => void;
}

type Pestana = "columnas" | "filtros" | "faltantes";

/** «Filtrar y exportar» de Socios: una cosa por vez en solapas (qué columnas, qué filtros. */
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
  const [pestana, setPestana] = useState<Pestana>("columnas");

  const { especialidades, loading: espLoading, error: espError } = useEspecialidades();

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

  const patchOtros = useCallback((patch: Partial<OtrosFilter>) => {
    setFilters((prev) => ({ ...prev, otros: { ...prev.otros, ...patch } }));
  }, [setFilters]);

  const patchFaltantes = useCallback((patch: Partial<FaltantesFilter>) => {
    setFilters((prev) => ({ ...prev, faltantes: { ...prev.faltantes, ...patch } }));
  }, [setFilters]);

  const activos = useMemo(() => filtrosActivos(filters, especialidades), [filters, especialidades]);
  const cuantosFiltros = activos.filter((a) => a.grupo !== "Faltantes").length;

  return (
    <div className={styles.modal}>
      <header className={styles.franja}>
        <button type="button" className={styles.cerrar} onClick={onClose} aria-label="Cerrar">
          <X size={22} aria-hidden="true" />
        </button>
        <h2 className={styles.titulo}>Filtrar y exportar</h2>
        <div className={styles.solapas} role="tablist">
          <Solapa
            activa={pestana === "columnas"}
            onClick={() => setPestana("columnas")}
            cuenta={filters.columns.length}
          >
            <Columns3 size={18} aria-hidden="true" /> Columnas
          </Solapa>
          <Solapa
            activa={pestana === "filtros"}
            onClick={() => setPestana("filtros")}
            cuenta={cuantosFiltros}
          >
            <SlidersHorizontal size={18} aria-hidden="true" /> Filtros
          </Solapa>
          <Solapa
            activa={pestana === "faltantes"}
            onClick={() => setPestana("faltantes")}
            cuenta={filters.faltantes.enabled ? 1 : 0}
          >
            <SearchX size={18} aria-hidden="true" /> Faltantes
          </Solapa>
        </div>
      </header>

      <div className={styles.cuerpo}>
        <section className={styles.caja}>
          {pestana === "columnas" && (
            <ColumnsSection
              columns={filters.columns}
              onToggleColumn={toggleColumn}
              onSetColumns={setColumns}
            />
          )}
          {pestana === "filtros" && (
            <OtrosSection
              otros={filters.otros}
              onPatch={patchOtros}
              especialidades={especialidades}
              espLoading={espLoading}
              espError={espError}
            />
          )}
          {pestana === "faltantes" && (
            <FaltantesSection faltantes={filters.faltantes} onPatch={patchFaltantes} />
          )}
        </section>

        <FiltersResumen
          columnas={filters.columns.length}
          activos={activos}
          onReset={resetFilters}
        />
      </div>

      {exportError && <div className={styles.exportError}>{exportError}</div>}

      <footer className={styles.pie}>
        <Button onClick={onApply} variant="primary" size="lg">
          Filtrar
        </Button>
        <BotonDescarga formato="excel" onClick={() => onExport("xlsx", null)} cargando={exportLoading} />
        <BotonDescarga formato="pdf" onClick={() => onExport("pdf", null)} disabled={exportLoading}>
          PDF por especialidad
        </BotonDescarga>
        <Button onClick={onClose} variant="ghost" size="lg" sx={{ ml: "auto" }}>
          Cerrar
        </Button>
      </footer>
    </div>
  );
};

export default FilterModal;
