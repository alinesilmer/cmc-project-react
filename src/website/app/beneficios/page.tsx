import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Tag, CalendarClock, Search, X } from "lucide-react";
import {
  listBeneficiosVigentes,
  formatVigencia,
  type BeneficioPublico,
} from "../../lib/beneficios.client";
import styles from "./beneficios.module.scss";

const EASE = [0.22, 1, 0.36, 1] as const;

const TODAS = "Todas";

// Buscar sin acentos: "cardiologia" tiene que encontrar "Cardiología".
function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function BeneficiosPage() {
  const [items, setItems] = useState<BeneficioPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string>(TODAS);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Beneficios para Socios | Colegio Médico de Corrientes";
    return () => {
      document.title = "Colegio Médico de Corrientes";
    };
  }, []);

  useEffect(() => {
    let aborted = false;

    listBeneficiosVigentes()
      .then((data) => {
        if (aborted) return;
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError("No se pudieron cargar los beneficios. Intentá más tarde.");
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, []);

  // Las categorías salen de lo que realmente vino: un filtro con opciones
  // vacías es peor que no tenerlo.
  const categorias = useMemo(() => {
    const presentes = Array.from(new Set(items.map((b) => b.categoria))).sort(
      (a, b) => a.localeCompare(b, "es")
    );
    return [TODAS, ...presentes];
  }, [items]);

  // Categoría Y texto: los dos filtros se combinan.
  const visibles = useMemo(() => {
    const texto = normalize(query.trim());
    return items.filter((b) => {
      if (categoria !== TODAS && b.categoria !== categoria) return false;
      if (!texto) return true;
      // `ubicacion` y `descuento` pueden venir nulos.
      const campos = [
        b.titulo,
        b.descripcion,
        b.categoria,
        b.ubicacion,
        b.descuento,
      ];
      return campos.some((c) => c && normalize(c).includes(texto));
    });
  }, [items, categoria, query]);

  function limpiarBusqueda() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div className={styles.page}>
      <section className={styles.head}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          Beneficios para Socios
        </motion.h1>
        <motion.p
          className={styles.lead}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
        >
          Descuentos y convenios vigentes para los socios del Colegio Médico de
          Corrientes.
        </motion.p>
      </section>

      {!loading && !error && items.length > 0 && (
        <motion.div
          className={styles.searchWrapper}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
        >
          <label htmlFor="beneficios-search" className={styles.srOnly}>
            Buscar beneficio
          </label>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              id="beneficios-search"
              type="search"
              className={styles.searchInput}
              placeholder="Buscar beneficio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                className={styles.searchClear}
                onClick={limpiarBusqueda}
                aria-label="Limpiar búsqueda"
                type="button"
              >
                <X />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {categorias.length > 2 && (
        <div className={styles.filtros} role="tablist" aria-label="Categorías">
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === categoria}
              className={`${styles.chip} ${
                c === categoria ? styles.chipActive : ""
              }`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <section className={styles.grid} aria-busy={loading}>
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} aria-hidden="true" />
          ))}

        {!loading &&
          visibles.map((b, i) => {
            const acento = b.color || undefined;
            const vigencia = formatVigencia(b.vigencia_hasta);
            return (
              <motion.article
                key={b.id}
                className={styles.card}
                style={acento ? { ["--acento" as string]: acento } : undefined}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  ease: EASE,
                  delay: Math.min(i, 6) * 0.05,
                }}
              >
                <header className={styles.cardHead}>
                  <span className={styles.categoria}>{b.categoria}</span>
                  {b.descuento && (
                    <span className={styles.descuento}>
                      <Tag aria-hidden="true" />
                      {b.descuento}
                    </span>
                  )}
                </header>

                <h2 className={styles.cardTitle}>{b.titulo}</h2>
                <p className={styles.cardText}>{b.descripcion}</p>

                <footer className={styles.meta}>
                  {b.ubicacion && (
                    <span className={styles.metaItem}>
                      <MapPin aria-hidden="true" />
                      {b.ubicacion}
                    </span>
                  )}
                  {vigencia && (
                    <span className={styles.metaItem}>
                      <CalendarClock aria-hidden="true" />
                      Hasta el {vigencia}
                    </span>
                  )}
                </footer>
              </motion.article>
            );
          })}
      </section>

      {!loading && error && <p className={styles.aviso}>{error}</p>}

      {!loading && !error && visibles.length === 0 && (
        <p className={styles.aviso}>
          {items.length === 0
            ? "Todavía no hay beneficios cargados."
            : query.trim()
              ? `No encontramos beneficios para "${query.trim()}".`
              : "No hay beneficios en esta categoría."}
        </p>
      )}
    </div>
  );
}
