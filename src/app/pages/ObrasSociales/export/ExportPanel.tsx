import { useState } from "react";
import { X } from "lucide-react";
import type { ObraSocialListItem } from "../obrasSociales.types";
import { DEFAULT_FIELDS, type ExportField } from "./exportService";
import { useFilters } from "./useFilters";
import FiltersSection from "./FiltersSection";
import FieldSelector from "./FieldSelector";
import ExportButtons from "./ExportButtons";
import s from "./export.module.scss";

interface Props {
  items: ObraSocialListItem[];
  onClose: () => void;
}

export default function ExportPanel({ items, onClose }: Props) {
  const [fields, setFields] = useState<ExportField[]>(DEFAULT_FIELDS);
  const { filters, filtered, set, reset, hasActiveFilters, activeFilterLabels } =
    useFilters(items);

  return (
    <>
      {/* Backdrop */}
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside className={s.drawer} aria-label="Panel de exportación" role="complementary">
        {/* Header */}
        <div className={s.drawerHeader}>
          <div>
            <h2 className={s.drawerTitle}>Exportar obras sociales</h2>
            <p className={s.drawerSub}>
              Filtrá, elegí columnas y descargá en Excel o PDF.
            </p>
          </div>
          <button
            type="button"
            className={s.closeBtn}
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className={s.drawerBody}>
          {/* Step 1 — Filters */}
          <FiltersSection
            filters={filters}
            set={set}
            reset={reset}
            hasActive={hasActiveFilters}
          />

          {/* Active filter chips */}
          {activeFilterLabels.length > 0 && (
            <div className={s.chipRow}>
              {activeFilterLabels.map((l) => (
                <span key={l} className={s.chip}>{l}</span>
              ))}
            </div>
          )}

          {/* Step 2 — Fields */}
          <FieldSelector fields={fields} onChange={setFields} />

          {/* Step 3 — Export */}
          <ExportButtons
            items={filtered}
            fields={fields}
            appliedFilters={activeFilterLabels}
          />
        </div>
      </aside>
    </>
  );
}
