import { useMemo } from "react";
import type { EspecialidadOption } from "../../../../lib/especialidadesCatalog";
import type { FilterSelection } from "../../../../types/filters";
import { MISSING_FIELD_LABELS } from "../../../../types/filters";
import styles from "../FilterModal.module.scss";

interface Props {
  filters: FilterSelection;
  especialidades: EspecialidadOption[];
  onReset: () => void;
}

interface FilterItem {
  key: string;
  label: string;
  group: string;
}

function resolveEspName(val: string, especialidades: EspecialidadOption[]): string {
  if (!val) return "";
  if (val.startsWith("id:")) {
    const id = val.slice(3);
    return especialidades.find((o) => o.value === id)?.label ?? id;
  }
  return val;
}

export function FiltersResumen({ filters, especialidades, onReset }: Props) {
  const items = useMemo((): FilterItem[] => {
    const out: FilterItem[] = [];
    const { vencimientos: v, otros: o, faltantes: f } = filters;

    // ── Vencimientos ──
    if (v.malapraxisVencida) out.push({ key: "malapraxisVencida", group: "Vencimientos", label: "Mala praxis vencida" });
    if (v.malapraxisPorVencer) out.push({ key: "malapraxisPorVencer", group: "Vencimientos", label: "Mala praxis por vencer" });
    if (v.anssalVencido) out.push({ key: "anssalVencido", group: "Vencimientos", label: "ANSSAL vencida" });
    if (v.anssalPorVencer) out.push({ key: "anssalPorVencer", group: "Vencimientos", label: "ANSSAL por vencer" });
    if (v.coberturaVencida) out.push({ key: "coberturaVencida", group: "Vencimientos", label: "Cobertura vencida" });
    if (v.coberturaPorVencer) out.push({ key: "coberturaPorVencer", group: "Vencimientos", label: "Cobertura por vencer" });
    if (v.dias > 0) out.push({ key: "dias", group: "Vencimientos", label: `Próximos ${v.dias} días` });
    if (v.fechaDesde) out.push({ key: "fechaDesde", group: "Vencimientos", label: `Venc. desde: ${v.fechaDesde}` });
    if (v.fechaHasta) out.push({ key: "fechaHasta", group: "Vencimientos", label: `Venc. hasta: ${v.fechaHasta}` });

    // ── Otros ──
    if (o.estado) out.push({ key: "estado", group: "Otros", label: `Estado: ${o.estado === "activo" ? "Activo" : "Inactivo"}` });
    if (o.sexo) out.push({ key: "sexo", group: "Otros", label: `Sexo: ${o.sexo.toUpperCase()}` });
    if (o.cuit) out.push({ key: "cuit", group: "Otros", label: `CUIT: ${o.cuit}` });
    if (o.provincia) out.push({ key: "provincia", group: "Otros", label: `Provincia: ${o.provincia}` });
    if (o.categoria) out.push({ key: "categoria", group: "Otros", label: `Categoría: ${o.categoria}` });
    if (o.condicionImpositiva) out.push({ key: "condicionImpositiva", group: "Otros", label: `Cond. imp.: ${o.condicionImpositiva}` });
    if (o.especialidad) out.push({ key: "especialidad", group: "Otros", label: `Especialidad: ${resolveEspName(o.especialidad, especialidades)}` });
    if (o.adherente) out.push({ key: "adherente", group: "Otros", label: `Adherente: ${o.adherente === "si" ? "Sí" : "No"}` });
    if (o.tieneMalapraxis) out.push({ key: "tieneMalapraxis", group: "Otros", label: o.tieneMalapraxis === "true" ? "Con mala praxis" : "Sin mala praxis" });
    if (o.fechaIngresoDesde) out.push({ key: "fechaIngresoDesde", group: "Otros", label: `Ingreso desde: ${o.fechaIngresoDesde}` });
    if (o.fechaIngresoHasta) out.push({ key: "fechaIngresoHasta", group: "Otros", label: `Ingreso hasta: ${o.fechaIngresoHasta}` });

    // ── Faltantes ──
    if (f.enabled) {
      const fieldLabel = MISSING_FIELD_LABELS[f.field] ?? f.field;
      out.push({ key: "faltantes", group: "Faltantes", label: `${f.mode === "missing" ? "Sin" : "Con"} ${fieldLabel}` });
    }

    return out;
  }, [filters, especialidades]);

  // Group items by section for a cleaner display
  const groups = useMemo(() => {
    const map = new Map<string, FilterItem[]>();
    for (const item of items) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return map;
  }, [items]);

  return (
    <div className={styles.selectedFilters}>
      <h3 className={styles.selectedFiltersTitle}>Resumen</h3>
      <div className={styles.selectedFiltersCount}>{items.length} filtros activos</div>

      <div className={styles.selectedFiltersList}>
        {items.length === 0 ? (
          <div className={styles.noFilters}>No hay filtros seleccionados</div>
        ) : (
          Array.from(groups.entries()).map(([group, groupItems]) => (
            <div key={group} className={styles.selectedFilterGroup}>
              <div className={styles.selectedFilterGroupTitle}>{group}</div>
              {groupItems.map((item) => (
                <div key={item.key} className={styles.selectedFilterItem}>
                  {item.label}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <button className={styles.clearFiltersButton} onClick={onReset} type="button">
        Limpiar filtros
      </button>
    </div>
  );
}
