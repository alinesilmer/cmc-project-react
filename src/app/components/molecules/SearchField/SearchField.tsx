import type React from "react";
import { Search } from "lucide-react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

/**
 * MUI-backed free-text search input. Drop-in replacement for the legacy
 * SearchBar molecule (same placeholder/value/onChange API) for the cases
 * where you filter a visible list as you type. For picking an entity from a
 * remote list, use AppSearchSelect (MUI Autocomplete) instead.
 */
interface SearchFieldProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const SearchField: React.FC<SearchFieldProps> = ({
  placeholder = "Buscar...",
  value,
  onChange,
  className,
  fullWidth,
  disabled,
}) => {
  return (
    <TextField
      type="search"
      size="small"
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      fullWidth={fullWidth}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search size={18} />
          </InputAdornment>
        ),
      }}
      sx={{
        minWidth: 240,
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
          backgroundColor: "#fff",
          fontSize: "0.86rem",
          "& fieldset": { borderColor: "#cbd5e1" },
          "&:hover fieldset": { borderColor: "#94a3b8" },
          "&.Mui-focused fieldset": {
            borderColor: "#3455c1",
            borderWidth: "1px",
            boxShadow: "0 0 0 3px rgba(52,85,193,0.1)",
          },
        },
      }}
    />
  );
};

export default SearchField;
