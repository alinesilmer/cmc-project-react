import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import React from "react";

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
};

const AppSearchSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  disabled,
  loading,
  onQueryChange,
}) => {
  const selected =
    value != null
      ? (options.find((o) => String(o.id) === String(value)) ?? null)
      : null;

  return (
    <Autocomplete
      blurOnSelect
      options={options}
      getOptionLabel={(opt) => opt.label}
      value={selected}
      onChange={(_, newVal) => onChange(newVal?.id ?? null)}
      disabled={disabled}
      loading={loading}
      filterOptions={onQueryChange ? (x) => x : undefined}
      isOptionEqualToValue={(opt, val) => String(opt.id) === String(val.id)}
      onInputChange={(_, val, reason) => {
        if (reason === "input") onQueryChange?.(val);
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
              backgroundColor: "#fff",
              padding: "1px 8px 1px 4px !important",
              "& fieldset": { borderColor: "#cbd5e1" },
              "&:hover fieldset": { borderColor: "#94a3b8" },
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
