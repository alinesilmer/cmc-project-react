import React, { useEffect, useRef, useState } from "react";
import { type ObraSocial, osId, osNombre } from "../types";
import styles from "./OsSearchInput.module.scss";

type Props = {
  obras: ObraSocial[];
  value: string; // selected osId as string, "" = none
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

const OsSearchInput: React.FC<Props> = ({
  obras,
  value,
  onChange,
  disabled,
  placeholder = "Buscar obra social…",
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // When value changes externally (e.g. reset), sync label
  const selectedObj = obras.find((o) => String(osId(o)) === value);
  const selectedLabel = selectedObj
    ? `${osId(selectedObj)} — ${osNombre(selectedObj)}`
    : "";

  // On first render or when value resets to "", clear query
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // If nothing selected, clear query; if selected, restore label
        if (!value) setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  const filtered = obras.filter((o) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      String(osId(o)).includes(q) ||
      osNombre(o).toLowerCase().includes(q)
    );
  });

  const handleSelect = (o: ObraSocial) => {
    const id = String(osId(o));
    onChange(id);
    setQuery(`${osId(o)} — ${osNombre(o)}`);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange(""); // clear selection when input is cleared
  };

  const handleFocus = () => {
    if (!disabled) setOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setOpen(false);
  };

  // Show selected label in input when closed and a value is set
  const inputValue = open ? query : (value ? selectedLabel : query);

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={`${styles.inputWrap} ${disabled ? styles.disabled : ""}`}>
        <input
          className={styles.input}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Limpiar selección"
          >
            ✕
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className={styles.dropdown}>
          {filtered.length === 0 ? (
            <div className={styles.noResults}>Sin resultados</div>
          ) : (
            filtered.map((o) => {
              const id = String(osId(o));
              const isSelected = id === value;
              return (
                <div
                  key={id}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    handleSelect(o);
                  }}
                >
                  <span className={styles.optionCode}>{osId(o)}</span>
                  <span className={styles.optionName}>{osNombre(o)}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default OsSearchInput;
