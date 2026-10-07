import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchAfiliados } from "../api";
import type { AfiliadoRead } from "../types";
import { etiquetaAfiliado } from "./etiquetas";

interface Props {
  /** Id del afiliado elegido (no el número: puede no tenerlo). */
  value: number | null;
  onChange: (afiliado: AfiliadoRead | null) => void;
  disabled?: boolean;
  /** Texto a mostrar antes de que el usuario busque (al editar, o tras crear uno). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const AfiliadoAutocomplete: React.FC<Props> = ({ value, onChange, disabled, presetLabel, blurOnSelect }) => {
  const [options, setOptions] = useState<AfiliadoRead[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Lo elegido tiene que estar entre las opciones para que `AppSearchSelect` muestre
  // su texto: al editar, o al crear uno desde "+ Agregar afiliado", no pasó por una
  // búsqueda acá.
  useEffect(() => {
    if (value == null || !presetLabel) return;
    setOptions((prev) => {
      if (prev.some((a) => a.id === value && etiquetaAfiliado(a.dni, a.nombre) === presetLabel)) return prev;
      return [{ id: value, dni: null, nombre: presetLabel }, ...prev.filter((a) => a.id !== value)];
    });
  }, [value, presetLabel]);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setOptions([]); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchAfiliados(q);
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((a) => ({
    id: a.id,
    label: etiquetaAfiliado(a.dni, a.nombre),
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const afiliado = id == null ? null : options.find((a) => a.id === Number(id)) ?? null;
        onChange(afiliado);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
      // Prestaciones con el paciente fuera del padrón (sólo el nombre, sin afiliado):
      // no hay opción que seleccionar, pero el nombre se muestra igual en el campo.
      initialInputValue={value == null && presetLabel ? presetLabel : undefined}
    />
  );
};

export default AfiliadoAutocomplete;
