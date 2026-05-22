import { useMemo, useState } from "react";
import type { ObraSocialListItem } from "../obrasSociales.types";

export interface FilterState {
  nombre: string;
  condicion_iva: "" | "responsable_inscripto" | "exento";
  plazo_vencimiento: "" | "30" | "45" | "60";
  marca: "" | "S" | "N";
  soloConEmail: boolean;
  soloConTelefono: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  nombre: "",
  condicion_iva: "",
  plazo_vencimiento: "",
  marca: "",
  soloConEmail: false,
  soloConTelefono: false,
};

export function useFilters(items: ObraSocialListItem[]) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filters.nombre) {
        const term = filters.nombre.toLowerCase();
        if (
          !it.nombre.toLowerCase().includes(term) &&
          !String(it.nro_obra_social).includes(term)
        )
          return false;
      }
      if (filters.condicion_iva && it.condicion_iva !== filters.condicion_iva)
        return false;
      if (filters.plazo_vencimiento) {
        if (String(it.plazo_vencimiento) !== filters.plazo_vencimiento) return false;
      }
      if (filters.marca && it.marca !== filters.marca) return false;
      if (filters.soloConEmail && !it.emails.some((e) => e.valor.trim())) return false;
      if (filters.soloConTelefono && !it.telefonos.some((t) => t.valor.trim())) return false;
      return true;
    });
  }, [items, filters]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (filters.nombre) labels.push(`Nombre: "${filters.nombre}"`);
    if (filters.condicion_iva)
      labels.push(filters.condicion_iva === "responsable_inscripto" ? "Factura A" : "Factura B");
    if (filters.plazo_vencimiento) labels.push(`Plazo: ${filters.plazo_vencimiento} días`);
    if (filters.marca) labels.push(filters.marca === "S" ? "Habilitada: Sí" : "Habilitada: No");
    if (filters.soloConEmail) labels.push("Con email");
    if (filters.soloConTelefono) labels.push("Con teléfono");
    return labels;
  }, [filters]);

  const hasActiveFilters = activeFilterLabels.length > 0;

  const reset = () => setFilters(EMPTY_FILTERS);
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return { filters, filtered, set, reset, hasActiveFilters, activeFilterLabels };
}
