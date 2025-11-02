import { useEffect, useRef, useState } from "react";
import type {FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SearchBar.module.scss";

type Props = { open: boolean; onClose: () => void };

export default function SearchBar({ open, onClose }: Props) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      const r = JSON.parse(localStorage.getItem("recent_searches") || "[]") as string[];
      setRecent(r.slice(0, 6));
      setTimeout(() => panelRef.current?.querySelector("input")?.focus(), 50);
    } else {
      setQ("");
    }
  }, [open]);

  const pushQuery = (term: string) => {
    const next = [term, ...recent.filter((t) => t !== term)].slice(0, 6);
    setRecent(next);
    localStorage.setItem("recent_searches", JSON.stringify(next));
    onClose();
    navigate(`/buscar?q=${encodeURIComponent(term)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) pushQuery(term);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            ref={panelRef}
          >
            <div className={styles.row}>
              <form onSubmit={onSubmit} className={styles.searchbar} role="search">
                <FiSearch className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar servicios y trámites…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={styles.input}
                />
              </form>

              <button className={styles.close} onClick={onClose} aria-label="Cerrar búsqueda">
                <FiX />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
