import React, { useEffect, useRef, useState } from "react";
import styles from "./SearchSelect.module.scss";

export type SearchSelectOption = {
  id: number;
  label: string;
  subtitle?: string;
};

type Props = {
  options: SearchSelectOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  onQueryChange?: (query: string) => void;
};

const SearchSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  onQueryChange,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((opt) => opt.id === value) ?? null;
  const shown = open ? query : selected?.label ?? query;

  useEffect(() => {
    const onClickOutside = (ev: MouseEvent) => {
      if (!ref.current || ref.current.contains(ev.target as Node)) return;
      setOpen(false);
      if (!value) setQuery("");
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [value]);

  const filtered = options.filter((opt) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subtitle ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.wrap} ref={ref}>
      <div className={`${styles.inputWrap} ${disabled ? styles.disabled : ""}`}>
        <input
          value={shown}
          className={styles.input}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
            if (!open) setOpen(true);
            if (!next) onChange(null);
          }}
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setQuery("");
              onChange(null);
              setOpen(false);
            }}
            aria-label="Limpiar selección"
          >
            ✕
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.noResults}>Buscando…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.noResults}>Sin resultados</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.option} ${value === opt.id ? styles.optionSelected : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.id);
                  setQuery(opt.label);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {opt.subtitle && <small>{opt.subtitle}</small>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSelect;
