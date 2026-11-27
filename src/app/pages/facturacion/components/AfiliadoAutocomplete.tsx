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
  /** Lo que hay escrito sin haber elegido a nadie (vacío al elegir o al borrar). */
  onTextoChange?: (texto: string) => void;
}

/** Pausa desde la última tecla hasta que se consulta. */
const ESPERA_MS = 250;

const AfiliadoAutocomplete: React.FC<Props> = ({ value, onChange, disabled, presetLabel, blurOnSelect, onTextoChange }) => {
  const [options, setOptions] = useState<AfiliadoRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [fallo, setFallo] = useState(false);
  const esperaRef = useRef<number | undefined>(undefined);
  // Número de la última búsqueda: la respuesta de una anterior que llega tarde se descarta.
  const pedidoRef = useRef(0);

  // Lo elegido tiene que estar entre las opciones para que `AppSearchSelect` muestre su texto: al editar, o al crear uno desde "+ Agregar afiliado".
  useEffect(() => {
    if (value == null || !presetLabel) return;
    setOptions((prev) => {
      if (prev.some((a) => a.id === value && etiquetaAfiliado(a.dni, a.nombre) === presetLabel)) return prev;
      return [{ id: value, dni: null, nombre: presetLabel }, ...prev.filter((a) => a.id !== value)];
    });
  }, [value, presetLabel]);

  const cancelar = useCallback(() => {
    window.clearTimeout(esperaRef.current);
    pedidoRef.current += 1;
  }, []);

  const search = useCallback((q: string) => {
    onTextoChange?.(q);
    cancelar();
    // La lista de lo escrito antes se vacía ya: al salir del campo se elige la opción resaltada.
    setOptions([]);
    setFallo(false);
    const texto = q.trim();
    setLoading(!!texto);
    if (!texto) return;
    const pedido = pedidoRef.current;
    esperaRef.current = window.setTimeout(async () => {
      try {
        const rows = await fetchAfiliados(texto);
        if (pedido === pedidoRef.current) setOptions(rows);
      } catch {
        if (pedido === pedidoRef.current) setFallo(true);
      } finally {
        if (pedido === pedidoRef.current) setLoading(false);
      }
    }, ESPERA_MS);
  }, [cancelar, onTextoChange]);

  useEffect(() => cancelar, [cancelar]);

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
        cancelar();
        setLoading(false);
        onTextoChange?.("");
        onChange(afiliado);
      }}
      onQueryChange={search}
      loading={loading}
      noOptionsText={fallo ? "No se pudo buscar. Volvé a escribir para reintentar." : undefined}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
      // Prestaciones con el paciente fuera del padrón (sólo el nombre, sin afiliado): no hay opción que seleccionar.
      initialInputValue={value == null && presetLabel ? presetLabel : undefined}
    />
  );
};

export default AfiliadoAutocomplete;
