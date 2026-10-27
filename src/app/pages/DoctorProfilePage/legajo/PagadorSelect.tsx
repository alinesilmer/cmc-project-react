import React, { useEffect, useState } from "react";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { searchMedicosForPagador } from "../api";

// Standalone pagador select with own query/options state
const PagadorSelect: React.FC<{
  value: number | null;
  disabled?: boolean;
  onChange: (v: number | null) => void;
}> = ({ value, disabled, onChange }) => {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AppSearchSelectOption[]>([]);

  useEffect(() => {
    let alive = true;
    searchMedicosForPagador(query).then((medicos) => {
      if (!alive) return;
      setOptions(
        medicos.map((m) => ({
          id: m.id,
          label: m.nro_socio != null ? `${m.nro_socio} - ${m.nombre}` : m.nombre,
        }))
      );
    }).catch(() => { if (alive) setOptions([]); });
    return () => { alive = false; };
  }, [query]);

  return (
    <AppSearchSelect
      options={options}
      value={value}
      disabled={disabled}
      onQueryChange={setQuery}
      onChange={(val) => {
        // AppSearchSelect devuelve string | number; acá el pagador es un id numérico.
        const id = val == null ? null : Number(val);
        onChange(id != null && Number.isFinite(id) ? id : null);
      }}
    />
  );
};

export default PagadorSelect;
