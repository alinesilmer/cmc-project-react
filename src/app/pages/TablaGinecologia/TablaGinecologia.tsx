import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Save, ChevronDown, Loader2, Search } from "lucide-react";
import { getJSON } from "../../lib/http";
import { SECCIONES, resolveUnidades, FASGO_BASE_2026 } from "./data/fasgo2026";
import { OS_BASE_VALUES, OS_EXCLUSIONS } from "./data/osBaseValues";
import styles from "./TablaGinecologia.module.scss";

// ─── Obra Social ───────────────────────────────────────────────────────────────

type ObrasSocialRaw = Record<string, unknown>;
type ObraSocialItem = { id: string; nombre: string };

function normalizeOS(data: unknown): ObraSocialItem[] {
  const items: ObrasSocialRaw[] = Array.isArray(data)
    ? (data as ObrasSocialRaw[])
    : Array.isArray((data as any)?.items)   ? (data as any).items
    : Array.isArray((data as any)?.results) ? (data as any).results
    : [];
  return items
    .map((item, i): ObraSocialItem | null => {
      const nombre = String(
        item?.NOMBRE ?? item?.nombre ?? item?.OBRA_SOCIAL ?? item?.obra_social ?? item?.name ?? ""
      ).trim();
      if (!nombre) return null;
      const id = String(
        item?.NRO_OBRA_SOCIAL ?? item?.NRO_OBRASOCIAL ?? item?.nro_obra_social ?? item?.id ?? `os-${i}`
      );
      return { id, nombre };
    })
    .filter((x): x is ObraSocialItem => x !== null);
}

function fetchObrasSociales(): Promise<ObraSocialItem[]> {
  return getJSON<unknown>("/api/obras_social/").then(normalizeOS);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtARS = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 2,
});

function calc(units: number, base: number) { return units * base; }

function safeBase(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) || n < 0 ? 0 : n;
}

function ValuePill({ label, value, variant }: { label: string; value: number; variant: "fasgo" | "os" }) {
  return (
    <span className={variant === "fasgo" ? styles.pillFasgo : styles.pillOs}>
      <span className={styles.pillLabel}>{label}</span>
      {fmtARS.format(value)}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const TOTAL = SECCIONES.reduce((acc, s) => acc + s.practicas.length, 0);

export default function TablaGinecologia() {
  const { data: obrasSociales = [], isLoading: osLoading } = useQuery({
    queryKey: ["obras-sociales-nomenclador"],
    queryFn: fetchObrasSociales,
    staleTime: 10 * 60 * 1000,
  });

  const [fasgoBase, setFasgoBase]       = useState(String(FASGO_BASE_2026));
  const [selectedOS, setSelectedOS]     = useState<ObraSocialItem | null>(null);
  const [providerBase, setProviderBase] = useState(String(FASGO_BASE_2026));
  const [providerOpen, setProviderOpen] = useState(false);
  const [osQuery, setOsQuery]           = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [saving, setSaving]             = useState(false);
  const [filter, setFilter]             = useState("");
  const comboRef                        = useRef<HTMLDivElement>(null);

  const activeOS    = selectedOS ?? obrasSociales[0] ?? null;
  const fasgoVal    = safeBase(fasgoBase);
  const providerVal = safeBase(providerBase);
  const osLabel     = activeOS?.nombre ?? "Obra Social";
  const osExclusion = activeOS ? OS_EXCLUSIONS[activeOS.id] : undefined;

  const filteredOS = useMemo(() => {
    if (!osQuery.trim()) return obrasSociales;
    const q = osQuery.toLowerCase();
    return obrasSociales.filter((os) => os.nombre.toLowerCase().includes(q));
  }, [obrasSociales, osQuery]);

  useEffect(() => { setFocusedIndex(-1); }, [osQuery]);

  useEffect(() => {
    if (!providerOpen) return;
    function handleOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
        setOsQuery(selectedOS?.nombre ?? "");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [providerOpen, selectedOS]);

  const filteredSections = useMemo(() => {
    if (!filter.trim()) return SECCIONES;
    const q = filter.toLowerCase();
    return SECCIONES.map((s) => ({
      ...s,
      practicas: s.practicas.filter(
        (p) => p.codigo.toLowerCase().includes(q) || p.practica.toLowerCase().includes(q)
      ),
    })).filter((s) => s.practicas.length > 0);
  }, [filter]);

  function selectOS(os: ObraSocialItem) {
    setSelectedOS(os);
    setOsQuery(os.nombre);
    setProviderOpen(false);
    setFocusedIndex(-1);
    const known = OS_BASE_VALUES[os.id];
    if (known !== undefined) setProviderBase(String(known));
    // TODO: load saved base from GET /api/nomenclador/ginecologia?os_id=os.id
  }

  function handleComboKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filteredOS.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const target = filteredOS[focusedIndex];
      if (target) selectOS(target);
    } else if (e.key === "Escape") {
      setProviderOpen(false);
      setOsQuery(selectedOS?.nombre ?? "");
    }
  }

  async function handleSave() {
    setSaving(true);
    // TODO: POST /api/nomenclador/ginecologia { fasgoBase: fasgoVal, osId: activeOS?.id, providerBase: providerVal }
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
  }

  const handleExport = useCallback(async () => {
    const [{ utils, write }, { saveAs }] = await Promise.all([
      import("xlsx"),
      import("file-saver"),
    ]);
    const wb = utils.book_new();
    for (const sec of SECCIONES) {
      const data = sec.practicas.map((p) => {
        const u = resolveUnidades(p);
        return {
          "Código":          p.codigo,
          "Práctica":        p.practica,
          "Nivel":           p.tipo === "NIVEL_COMPLEJIDAD" ? p.valor : "—",
          "Unidades":        u,
          "Valor FASGO":     calc(u, fasgoVal),
          [`Valor ${osLabel}`]: calc(u, providerVal),
        };
      });
      const ws = utils.json_to_sheet(data);
      ws["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 24 }];
      utils.book_append_sheet(wb, ws, sec.nombre.slice(0, 31));
    }
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const buffer = write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `NomencladoGinecologia-${date}.xlsx`);
  }, [fasgoVal, providerVal, osLabel]);

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerSub}>Nomenclador de</p>
          <h1 className={styles.title}>Ginecología y Obstetricia</h1>
        
        </div>
        <div className={styles.headerActions}>
          <button className={styles.saveBtn} onClick={() => void handleSave()} disabled={saving}>
            <Save size={14} />
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button className={styles.exportBtn} onClick={() => void handleExport()}>
            <Download size={14} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            Valor base FASGO
            <span className={styles.controlHint}>u.q. × base</span>
          </label>
          <div className={styles.fasgoInputWrap}>
            <span className={`${styles.inputPrefix} ${styles.fasgoPrefix}`}>$</span>
            <input
              className={styles.fasgoInput}
              value={fasgoBase}
              onChange={(e) => setFasgoBase(e.target.value)}
              inputMode="decimal"
              aria-label="Valor base FASGO"
            />
          </div>
        </div>

        <div className={styles.controlDivider} />

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Obra Social / Prestadora</label>
          <div className={styles.providerRow}>
            <div className={styles.providerDropWrap} ref={comboRef}>
              <div className={styles.comboInputWrap}>
                {osLoading
                  ? <Loader2 size={13} className={styles.spin} />
                  : <ChevronDown size={14} className={providerOpen ? styles.chevronOpen : styles.chevron} />
                }
                <input
                  className={styles.comboInput}
                  value={osQuery}
                  onChange={(e) => { setOsQuery(e.target.value); setProviderOpen(true); }}
                  onFocus={() => { setOsQuery(""); setProviderOpen(true); }}
                  onKeyDown={handleComboKeyDown}
                  placeholder={selectedOS?.nombre ?? "Buscar obra social…"}
                  disabled={osLoading}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={providerOpen}
                  aria-autocomplete="list"
                />
              </div>
              {providerOpen && (
                <ul className={styles.providerDropList} role="listbox">
                  {filteredOS.length > 0 ? filteredOS.map((os, idx) => (
                    <li
                      key={os.id}
                      className={[
                        styles.providerDropItem,
                        os.id === activeOS?.id ? styles.active : "",
                        idx === focusedIndex ? styles.focused : "",
                      ].filter(Boolean).join(" ")}
                      onMouseDown={(e) => { e.preventDefault(); selectOS(os); }}
                      role="option"
                      aria-selected={os.id === activeOS?.id}
                    >
                      {os.nombre}
                    </li>
                  )) : (
                    <li className={styles.providerDropEmpty}>
                      Sin resultados para &ldquo;{osQuery}&rdquo;
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className={styles.osInputWrap}>
              <span className={`${styles.inputPrefix} ${styles.osPrefix}`}>$</span>
              <input
                className={styles.osInput}
                value={providerBase}
                onChange={(e) => setProviderBase(e.target.value)}
                inputMode="decimal"
                aria-label={`Valor base ${osLabel}`}
              />
            </div>
          </div>
        </div>

        <div className={styles.controlDivider} />

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Buscar práctica</label>
          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`${TOTAL} prácticas…`}
              aria-label="Buscar práctica o código"
            />
          </div>
        </div>
      </div>

      {/* ── Exclusion notice ── */}
      {osExclusion && (
        <div className={styles.exclusionNotice}>
          <strong>{osExclusion.nota}</strong>
          {" — "}las prácticas marcadas con{" "}
          <span className={styles.excludedBadge}>No cubierta</span>
          {" "}no están contempladas en el convenio de esta obra social.
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {filteredSections.map((sec) => (
            <tbody key={sec.id}>
              <tr>
                <td colSpan={6} className={styles.sectionBanner}>{sec.nombre}</td>
              </tr>
              <tr className={styles.thead}>
                <th>Código</th>
                <th>Práctica</th>
                <th className={styles.right}>Nivel</th>
                <th className={styles.right}>Unidades</th>
                <th className={`${styles.right} ${styles.thFasgo}`}>Valor FASGO</th>
                <th className={`${styles.right} ${styles.thOs}`}>Valor {osLabel}</th>
              </tr>
              {sec.practicas.map((p, i) => {
                const u = resolveUnidades(p);
                const excluded = osExclusion?.codigos.includes(p.codigo) ?? false;
                return (
                  <tr
                    key={p.codigo}
                    className={[
                      i % 2 === 0 ? styles.rowEven : styles.rowOdd,
                      excluded ? styles.rowExcluded : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <td className={styles.codeCell}>{p.codigo}</td>
                    <td className={styles.practicaCell}>
                      {p.practica}
                      {excluded && (
                        <span className={styles.excludedBadge}>No cubierta</span>
                      )}
                    </td>
                    <td className={styles.right}>
                      {p.tipo === "NIVEL_COMPLEJIDAD"
                        ? <span className={styles.nivelBadge}>Nivel {p.valor}</span>
                        : <span className={styles.nil}>—</span>}
                    </td>
                    <td className={`${styles.right} ${styles.unitCell}`}>{u}</td>
                    <td className={`${styles.right} ${styles.fasgoCell}`}>{fmtARS.format(calc(u, fasgoVal))}</td>
                    <td className={`${styles.right} ${styles.osCell}`}>
                      {excluded ? <span className={styles.nil}>—</span> : fmtARS.format(calc(u, providerVal))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
          {filteredSections.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={6} className={styles.noResults}>Sin resultados para &ldquo;{filter}&rdquo;</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className={styles.cardSection}>
        {filteredSections.length === 0 && (
          <p className={styles.noResultsMobile}>Sin resultados para &ldquo;{filter}&rdquo;</p>
        )}
        {filteredSections.map((sec) => (
          <div key={sec.id}>
            <p className={styles.cardSectionTitle}>{sec.nombre}</p>
            {sec.practicas.map((p) => {
              const u = resolveUnidades(p);
              const excluded = osExclusion?.codigos.includes(p.codigo) ?? false;
              return (
                <div key={p.codigo} className={`${styles.card} ${excluded ? styles.cardExcluded : ""}`}>
                  <div className={styles.cardTop}>
                    <span className={styles.codeBadge}>{p.codigo}</span>
                    {excluded
                      ? <span className={styles.excludedBadge}>No cubierta</span>
                      : p.tipo === "NIVEL_COMPLEJIDAD"
                        ? <span className={styles.nivelBadge}>Nivel {p.valor}</span>
                        : <span className={styles.unitsBadge}>{u} u.q.</span>}
                  </div>
                  <p className={styles.cardPractica}>{p.practica}</p>
                  <div className={styles.pillRow}>
                    <ValuePill label="FASGO" value={calc(u, fasgoVal)} variant="fasgo" />
                    {!excluded && <ValuePill label={osLabel} value={calc(u, providerVal)} variant="os" />}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
