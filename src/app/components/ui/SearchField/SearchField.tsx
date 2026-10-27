import type React from "react";
import { Search, X } from "lucide-react";

import s from "./SearchField.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface SearchFieldProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Con esto aparece la cruz para borrar cuando hay texto. */
  onClear?: () => void;
  ariaLabel?: string;
  id?: string;
  className?: string;
  /** Ocupa todo el ancho disponible en vez del ancho de lectura. */
  fullWidth?: boolean;
  disabled?: boolean;
}

/** EL buscador del panel: una sola forma en todas las pantallas. */
export default function SearchField({
  placeholder = "Buscar…",
  value,
  onChange,
  onClear,
  ariaLabel,
  id,
  className,
  fullWidth = false,
  disabled = false,
}: SearchFieldProps) {
  const clases = [s.buscador, fullWidth ? s.ancho : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={clases}>
      <Search size={17} aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {onClear && value && (
        <BotonPlano type="button" className={s.borrar} onClick={onClear} aria-label="Borrar la búsqueda">
          <X size={16} aria-hidden="true" />
        </BotonPlano>
      )}
    </div>
  );
}
