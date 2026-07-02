import { useEffect, useRef, useState } from "react";
import { Search, X as XIcon, Loader2 } from "lucide-react";

import styles from "./consulta.module.scss";

/**
 * Controlled, presentational autocomplete. The parent owns the data source
 * (sync-filtered list or async search) and passes `items`, `query`, `loading`.
 * Generic over the item shape via `getKey` / `getCode` / `getText` accessors,
 * so the same component drives the obra-social and código fields.
 */
export type ComboboxProps<T> = {
  /** Step index shown before the label (1, 2, …). */
  idx: number;
  label: string;
  hint?: string;
  placeholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  items: T[];
  getKey: (it: T) => string | number;
  /** Optional short code shown as a tag; omit for items without a code (e.g. especialidad). */
  getCode?: (it: T) => string;
  getText: (it: T) => string;
  selected: T | null;
  onSelect: (it: T) => void;
  onClear: () => void;
  loading?: boolean;
  /** Message shown when the menu is open but there are no items (e.g. "Seguí escribiendo…"). */
  menuHint?: string;
};

function Combobox<T>({
  idx,
  label,
  hint,
  placeholder,
  query,
  onQueryChange,
  items,
  getKey,
  getCode,
  getText,
  selected,
  onSelect,
  onClear,
  loading = false,
  menuHint,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the active option in range whenever the list changes.
  useEffect(() => {
    setActive(0);
  }, [items]);

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const showMenu = open && (loading || items.length > 0 || query.trim() !== "");

  function commit(it: T) {
    onSelect(it);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) commit(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.field}>
      <div className={styles.qlabel}>
        <span className={styles.qIdx}>{idx}</span> {label}
        {hint && <span className={styles.qHint}>— {hint}</span>}
      </div>

      {selected ? (
        <div className={`${styles.chosen} ${getCode ? "" : styles.chosenPad}`}>
          {getCode && <span className={styles.chosenCode}>{getCode(selected)}</span>}
          <span className={styles.chosenText}>{getText(selected)}</span>
          <button type="button" className={styles.chosenX} onClick={onClear} title="Cambiar" aria-label="Cambiar">
            <XIcon size={17} />
          </button>
        </div>
      ) : (
        <div className={styles.fieldWrap}>
          <label className={styles.fieldControl}>
            <Search size={18} className={styles.fieldIco} />
            <input
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={showMenu}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                onQueryChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setOpen(false), 120);
              }}
              onKeyDown={onKeyDown}
            />
            {loading && <Loader2 size={16} className={`${styles.fieldSpin} ${styles.spin}`} />}
          </label>

          {showMenu && (
            <ul className={styles.menu} role="listbox">
              {items.length > 0 ? (
                items.map((it, i) => (
                  <li
                    key={getKey(it)}
                    role="option"
                    aria-selected={i === active}
                    className={`${styles.opt} ${i === active ? styles.optActive : ""}`}
                    // preventDefault keeps input focus so onBlur doesn't cancel the pick
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(it);
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    {getCode && <span className={styles.optCode}>{getCode(it)}</span>}
                    <span className={styles.optText}>{getText(it)}</span>
                  </li>
                ))
              ) : (
                <li className={styles.optEmpty}>{loading ? "Buscando…" : menuHint ?? "Sin resultados"}</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Combobox;
