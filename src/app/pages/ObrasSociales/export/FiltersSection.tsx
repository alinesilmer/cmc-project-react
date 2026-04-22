import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import type { FilterState } from "./useFilters";
import s from "./export.module.scss";

interface Props {
  filters: FilterState;
  set: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  reset: () => void;
  hasActive: boolean;
}

export default function FiltersSection({ filters, set, reset, hasActive }: Props) {
  const nombreRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNombre = (v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => set("nombre", v), 280);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Filtros</h3>
        {hasActive && (
          <button type="button" className={s.resetBtn} onClick={reset}>
            <RotateCcw size={13} /> Limpiar
          </button>
        )}
      </div>

      <div className={s.filterGrid}>
        {/* Nombre / Nº */}
        <div className={s.filterField}>
          <label className={s.filterLabel}>Nombre o Nº</label>
          <input
            ref={nombreRef}
            type="search"
            className={s.filterInput}
            placeholder="Buscar…"
            defaultValue={filters.nombre}
            onChange={(e) => handleNombre(e.target.value)}
          />
        </div>

        {/* Tipo de factura */}
        <div className={s.filterField}>
          <label className={s.filterLabel}>Tipo de factura</label>
          <select
            className={s.filterSelect}
            value={filters.condicion_iva}
            onChange={(e) => set("condicion_iva", e.target.value as FilterState["condicion_iva"])}
          >
            <option value="">Todas</option>
            <option value="responsable_inscripto">Factura A</option>
            <option value="exento">Factura B</option>
          </select>
        </div>

        {/* Plazo de pago */}
        <div className={s.filterField}>
          <label className={s.filterLabel}>Plazo de pago</label>
          <select
            className={s.filterSelect}
            value={filters.plazo_vencimiento}
            onChange={(e) => set("plazo_vencimiento", e.target.value as FilterState["plazo_vencimiento"])}
          >
            <option value="">Todos</option>
            <option value="30">30 días</option>
            <option value="45">45 días</option>
            <option value="60">60 días</option>
          </select>
        </div>

        {/* Habilitada padrón */}
        <div className={s.filterField}>
          <label className={s.filterLabel}>Habilitada padrón</label>
          <select
            className={s.filterSelect}
            value={filters.marca}
            onChange={(e) => set("marca", e.target.value as FilterState["marca"])}
          >
            <option value="">Todas</option>
            <option value="S">Sí</option>
            <option value="N">No</option>
          </select>
        </div>

        {/* Toggles */}
        <div className={s.toggleRow}>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={filters.soloConEmail}
              onChange={(e) => set("soloConEmail", e.target.checked)}
            />
            <span className={s.toggleTrack} />
            <span className={s.toggleLabel}>Solo con email</span>
          </label>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={filters.soloConTelefono}
              onChange={(e) => set("soloConTelefono", e.target.checked)}
            />
            <span className={s.toggleTrack} />
            <span className={s.toggleLabel}>Solo con teléfono</span>
          </label>
        </div>
      </div>
    </div>
  );
}
