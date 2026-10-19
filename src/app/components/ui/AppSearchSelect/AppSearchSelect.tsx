import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import React, { useEffect, useState } from "react";

export type AppSearchSelectOption = {
  id: string | number;
  label: string;
  subtitle?: string;
};

type Props = {
  options: AppSearchSelectOption[];
  value: string | number | null;
  onChange: (val: string | number | null) => void;
  disabled?: boolean;
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  /** Al elegir una opción, MUI hace blur y el foco se pierde. */
  blurOnSelect?: boolean;
  /** Texto con el que arranca el campo cuando NO hay opción seleccionada (`value` en null) pero igual se sabe qué había. */
  initialInputValue?: string;
};

const AppSearchSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  disabled,
  loading,
  onQueryChange,
  blurOnSelect = true,
  initialInputValue,
}) => {
  // `options` se reemplaza por completo en cada búsqueda remota, así que la opción ya seleccionada puede desaparecer de la lista.
  const [pinned, setPinned] = useState<AppSearchSelectOption | null>(null);

  useEffect(() => {
    if (value == null) { setPinned(null); return; }
    const match = options.find((o) => String(o.id) === String(value));
    if (match) setPinned(match);
  }, [value, options]);

  const selected = pinned && String(pinned.id) === String(value) ? pinned : null;

  const [inputValue, setInputValue] = useState(selected?.label ?? initialInputValue ?? "");

  // El seleccionado se antepone a la lista para que MUI no lo pierda de vista — pero solo mientras el texto siga siendo el suyo.
  const mergedOptions =
    selected && inputValue === selected.label && !options.some((o) => String(o.id) === String(selected.id))
      ? [selected, ...options]
      : options;

  useEffect(() => {
    if (selected) setInputValue(selected.label);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Autocomplete
      blurOnSelect={blurOnSelect}
      openOnFocus
      // No limpiamos el texto tipeado al perder foco si no se eligió nada — se mantiene visible en vez de "borrarse" como pasaba antes.
      clearOnBlur={false}
      // `autoSelect` confirma la opción resaltada al perder foco (blur), no solo con Enter — sin condicionarlo, con la lista completa mostrada al hacer click.
      autoHighlight
      autoSelect={inputValue.length > 0}
      options={mergedOptions}
      getOptionLabel={(opt) => opt.label}
      value={selected}
      inputValue={inputValue}
      onChange={(_, newVal) => {
        setPinned(newVal);
        setInputValue(newVal?.label ?? "");
        // Notificar al padre en el mismo tick, sincrónicamente.
        onChange(newVal?.id ?? null);
      }}
      disabled={disabled}
      loading={loading}
      filterOptions={onQueryChange ? (x) => x : undefined}
      isOptionEqualToValue={(opt, val) => String(opt.id) === String(val.id)}
      onInputChange={(_, val, reason) => {
        if (reason === "input") {
          setInputValue(val);
          onQueryChange?.(val);
        } else if (reason === "clear") {
          setInputValue("");
          setPinned(null);
          onChange(null);
          onQueryChange?.("");
        }
      }}
      onFocus={() => {
        // Reabrir sugerencias para lo que ya estaba escrito, en vez de forzar una selección o dejar la lista vacía.
        if (!selected) onQueryChange?.(inputValue);
      }}
      noOptionsText="Sin resultados"
      loadingText="Buscando…"
      slotProps={{ popper: { style: { zIndex: 10000 } } }}
      sx={{ width: "100%" }}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <div>
            <div style={{ fontSize: 13 }}>{option.label}</div>
            {option.subtitle && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{option.subtitle}</div>
            )}
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={14} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: 13,
              borderRadius: "6px",
              backgroundColor: "var(--tema-superficie, #fff)",
              padding: "1px 8px 1px 4px !important",
              "& fieldset": { borderColor: "var(--tema-borde, #cbd5e1)" },
              "&:hover fieldset": { borderColor: "var(--tema-borde-fuerte, #94a3b8)" },
              "&.Mui-focused fieldset": {
                borderColor: "#1b56ff",
                borderWidth: "1px",
                boxShadow: "0 0 0 3px rgba(27,86,255,0.1)",
              },
            },
            "& .MuiAutocomplete-input": {
              padding: "6px 4px !important",
              fontSize: "13px",
            },
          }}
        />
      )}
    />
  );
};

export default AppSearchSelect;
