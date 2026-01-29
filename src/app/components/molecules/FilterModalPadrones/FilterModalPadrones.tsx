"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./FilterModalPadrones.module.scss";
import Button from "../../../../website/components/UI/Button/Button";
import type { FilterSelection } from "../../../types/filters";
import { getJSON } from "../../../lib/http";

type Option = { value: string; label: string };

const AVAILABLE_COLUMNS = [
  { key: "nro_socio", label: "N° Socio" },
  { key: "nombre", label: "Nombre completo" },
  { key: "matricula_prov", label: "Matrícula Provincial" },
  { key: "telefono_consulta", label: "Teléfono" },
];

const ALLOWED_COLUMN_KEYS = new Set(AVAILABLE_COLUMNS.map((c) => c.key));

interface FilterModalProps {
  filters: FilterSelection;
  setFilters: React.Dispatch<React.SetStateAction<FilterSelection>>;
  exportError: string | null;
  exportLoading: boolean;
  onExport: (format: "xlsx" | "csv", logoFile: File | null) => void;
  onClose: () => void;
  resetFilters: () => void;
}

// base robusto: evita /api/api cuando API_BASE = "/api"
const API_BASE_RAW =
  (import.meta as any).env?.VITE_API_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "";
const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");
const API_ROOT = API_BASE
  ? API_BASE.endsWith("/api")
    ? API_BASE
    : `${API_BASE}/api`
  : "/api";

const ENDPOINTS = {
  especialidades: `${API_ROOT}/especialidades/`,
  obrasSociales: `${API_ROOT}/obras_social/`,
};

const FilterModalPadrones: React.FC<FilterModalProps> = ({
  filters,
  setFilters,
  exportError,
  exportLoading,
  onExport,
  onClose,
  resetFilters,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    columns: true,
    filtros: true,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Especialidades ----
  const [espLoading, setEspLoading] = useState(false);
  const [espError, setEspError] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<Option[]>([]);

  // ---- Obras Sociales ----
  const [osLoading, setOsLoading] = useState(false);
  const [osError, setOsError] = useState<string | null>(null);
  const [obrasSociales, setObrasSociales] = useState<Option[]>([]);

  // ✅ Limpia columnas viejas y setea defaults si vienen vacías
  useEffect(() => {
    setFilters((prev) => {
      const current = Array.isArray(prev.columns) ? prev.columns : [];
      const cleaned = current.filter((k) => ALLOWED_COLUMN_KEYS.has(k));
      const nextColumns = cleaned.length > 0 ? cleaned : AVAILABLE_COLUMNS.map((c) => c.key);
      if (nextColumns.join("|") === current.join("|")) return prev;
      return { ...prev, columns: nextColumns };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let abort = false;

    async function loadEspecialidades() {
      setEspLoading(true);
      setEspError(null);
      try {
        const data = await getJSON<any[]>(ENDPOINTS.especialidades);

        // ⚠️ IMPORTANTE:
        // Para que filtre contra tu tabla, guardamos el VALOR COMO NOMBRE (label),
        // porque en padrones suele venir ESPECIALIDAD como texto.
        const opts: Option[] = Array.isArray(data)
          ? data
              .map((e: any) => {
                const rawLabel =
                  e?.nombre ??
                  e?.NOMBRE ??
                  e?.descripcion ??
                  e?.DESCRIPCION ??
                  e?.detalle ??
                  e?.DETALLE ??
                  e?.value ??
                  e?.id ??
                  e?.ID ??
                  "";
                const label = String(rawLabel ?? "").trim();
                if (!label) return null;
                return { value: label, label };
              })
              .filter((o): o is Option => o !== null) // Filter out null values
          : [];

        // dedupe por label
        const seen = new Set<string>();
        const uniq = opts.filter((o) => {
          const k = o.value.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        if (!abort) setEspecialidades(uniq);
      } catch (err: any) {
        if (!abort) setEspError(err?.message || "No se pudo cargar especialidades");
      } finally {
        if (!abort) setEspLoading(false);
      }
    }

    async function loadObrasSociales() {
      setOsLoading(true);
      setOsError(null);
      try {
        const data = await getJSON<any[]>(ENDPOINTS.obrasSociales);
        const arr = Array.isArray(data) ? data : [];

        const opts: Option[] = arr
          .map((o: any) => {
            const nro =
              o?.NRO_OBRA_SOCIAL ??
              o?.NRO_OBRASOCIAL ??
              o?.nro_obra_social ??
              o?.nro_obrasocial ??
              o?.id ??
              o?.ID ??
              "";
            const nombre = o?.NOMBRE ?? o?.OBRA_SOCIAL ?? o?.obra_social ?? o?.nombre ?? "";
            const n = String(nro ?? "").trim();
            const lbl = String(nombre ?? "").trim();
            if (!n || !lbl) return null;
            return { value: n, label: lbl };
          })
          .filter((o): o is Option => o !== null);

        opts.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

        if (!abort) setObrasSociales(opts);
      } catch (err: any) {
        if (!abort) setOsError(err?.message || "No se pudo cargar obras sociales");
      } finally {
        if (!abort) setOsLoading(false);
      }
    }

    loadEspecialidades();
    loadObrasSociales();

    return () => {
      abort = true;
    };
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleColumn = (key: string) => {
    setFilters((prev) => ({
      ...prev,
      columns: prev.columns.includes(key)
        ? prev.columns.filter((c) => c !== key)
        : [...prev.columns, key],
    }));
  };

  const selectedEspecialidad = (((filters as any)?.otros?.especialidad ?? "") as string).trim();
  const selectedObraSocial = (((filters as any)?.otros?.obraSocial ?? "") as string).trim();

  const activeFiltersCount = () => {
    let c = 0;
    if (selectedEspecialidad) c++;
    if (selectedObraSocial) c++;
    return c;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0]);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectedObraLabel = useMemo(() => {
    if (!selectedObraSocial) return "";
    return obrasSociales.find((o) => o.value === selectedObraSocial)?.label ?? selectedObraSocial;
  }, [selectedObraSocial, obrasSociales]);

  return (
    <div className={styles.exportModalNew}>
      <div className={styles.exportContent}>
        <div className={styles.filterSections}>
          {/* Columnas */}
          <div className={styles.filterSection}>
            <button
              className={styles.filterSectionHeader}
              onClick={() => toggleSection("columns")}
              type="button"
            >
              <span>Columnas del export</span>
              <span className={styles.chevron}>{expandedSections.columns ? "▲" : "▼"}</span>
            </button>

            {expandedSections.columns && (
              <div className={styles.filterSectionContent}>
                <div className={styles.checkboxGrid}>
                  {AVAILABLE_COLUMNS.map((col) => (
                    <label key={col.key} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.columns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className={styles.checkbox}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className={styles.filterSection}>
            <button
              className={styles.filterSectionHeader}
              onClick={() => toggleSection("filtros")}
              type="button"
            >
              <span>Filtros de descarga</span>
              <span className={styles.chevron}>{expandedSections.filtros ? "▲" : "▼"}</span>
            </button>

            {expandedSections.filtros && (
              <div className={styles.filterSectionContent}>
                <div className={styles.otrosGrid}>
                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Especialidad</label>
                    <select
                      className={styles.exportSelect}
                      value={selectedEspecialidad}
                      onChange={(e) =>
                        setFilters((prev) =>
                          ({
                            ...prev,
                            otros: { ...(prev as any).otros, especialidad: e.target.value },
                          }) as any
                        )
                      }
                      disabled={espLoading || !!espError}
                    >
                      <option value="">{espLoading ? "Cargando..." : "Todas"}</option>
                      {espError ? (
                        <option value="" disabled>{`Error: ${espError}`}</option>
                      ) : (
                        especialidades.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className={styles.exportField}>
                    <label className={styles.exportLabel}>Obra Social</label>
                    <select
                      className={styles.exportSelect}
                      value={selectedObraSocial}
                      onChange={(e) =>
                        setFilters((prev) =>
                          ({
                            ...prev,
                            otros: { ...(prev as any).otros, obraSocial: e.target.value },
                          }) as any
                        )
                      }
                      disabled={osLoading || !!osError}
                    >
                      <option value="">{osLoading ? "Cargando..." : "Todas"}</option>
                      {osError ? (
                        <option value="" disabled>{`Error: ${osError}`}</option>
                      ) : (
                        obrasSociales.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                  {selectedEspecialidad || selectedObraSocial ? (
                    <>
                      <strong>Descarga:</strong>{" "}
                      {selectedEspecialidad ? `Especialidad = ${selectedEspecialidad}` : "Todas las especialidades"}
                      {selectedObraSocial ? ` • Obra Social = ${selectedObraLabel}` : " • Todas las obras sociales"}
                    </>
                  ) : (
                    <>
                      <strong>Descarga:</strong> sin filtros (todo lo disponible)
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.selectedFilters}>
          <h3 className={styles.selectedFiltersTitle}>Resumen</h3>
          <div className={styles.selectedFiltersCount}>{activeFiltersCount()} filtros activos</div>

          <button className={styles.clearFiltersButton} onClick={resetFilters} type="button">
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className={styles.logoSection}>
        <label className={styles.exportLabel}>Logo (opcional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
        {logoFile && (
          <button className={styles.clearFiltersButton} onClick={handleRemoveLogo} type="button">
            Quitar logo
          </button>
        )}
      </div>

      {exportError && <div className={styles.exportError}>{exportError}</div>}

      <div className={styles.exportActionsRow}>
        <div className={styles.exportActionsLeft}>
          <Button
            onClick={() => onExport("xlsx", logoFile)}
            disabled={exportLoading}
            variant="primary"
            size="medium"
          >
            {exportLoading ? "Exportando..." : "Descargar Excel"}
          </Button>
        </div>
        <div className={styles.exportActionsRight}>
          <Button onClick={onClose} variant="secondary" size="medium">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterModalPadrones;
