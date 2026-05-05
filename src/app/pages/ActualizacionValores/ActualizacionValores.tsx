"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, RefreshCcw, Save, TrendingUp, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

import styles from "./ActualizacionValores.module.scss";
import Button from "../../components/atoms/Button/Button";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import axios from "axios";
import { http } from "../../lib/http";
import {
  extractRowsFromPayload,
  normalizeRow,
} from "../BoletinConsultaComun/boletinConsultaComun.api";
import type { ApiBoletinRow } from "../BoletinConsultaComun/boletinConsultaComun.types";
import { moneyFormatter, BOLETIN_ENDPOINTS } from "../BoletinConsultaComun/boletinConsultaComun.constants";

// ─── API helpers ──────────────────────────────────────────────────────────────
// Uses the same local endpoint as boletinConsultaComun (proxied to 127.0.0.1:8000).

const BOLETIN_URL = BOLETIN_ENDPOINTS[0];

async function fetchRowsForOS(
  nroOS: number,
  signal?: AbortSignal
): Promise<ApiBoletinRow[]> {
  const allRows: ApiBoletinRow[] = [];
  for (let page = 1; page <= 50; page++) {
    const response = await axios.get(BOLETIN_URL, {
      signal,
      timeout: 20000,
      withCredentials: false,
      headers: { Accept: "application/json" },
      params: { nro_obra_social: nroOS, page, size: 500 },
    });
    const rows = (extractRowsFromPayload(response.data) ?? []).map(normalizeRow);
    if (!rows.length) break;
    allRows.push(...rows.filter((r) => r.nro_obrasocial === nroOS));
    if (rows.length < 500) break;
  }
  return allRows;
}

type ValuesPayload = Omit<
  ApiBoletinRow,
  "id" | "codigos" | "nro_obrasocial" | "obra_social" | "c_p_h_s"
>;

async function patchRow(id: number, values: Partial<ValuesPayload>): Promise<void> {
  await http.patch(`${BOLETIN_URL}/${id}`, values);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type EditValues = {
  honorarios_a: string;
  honorarios_b: string;
  honorarios_c: string;
  gastos: string;
  ayudante_a: string;
  ayudante_b: string;
  ayudante_c: string;
};

const VALUE_FIELDS = [
  "honorarios_a",
  "honorarios_b",
  "honorarios_c",
  "gastos",
  "ayudante_a",
  "ayudante_b",
  "ayudante_c",
] as const;

const FIELD_LABELS: Record<(typeof VALUE_FIELDS)[number], string> = {
  honorarios_a: "Honorarios A",
  honorarios_b: "Honorarios B",
  honorarios_c: "Honorarios C",
  gastos: "Gastos",
  ayudante_a: "Ayudante A",
  ayudante_b: "Ayudante B",
  ayudante_c: "Ayudante C",
};

function rowToEditValues(row: ApiBoletinRow): EditValues {
  return {
    honorarios_a: String(row.honorarios_a),
    honorarios_b: String(row.honorarios_b),
    honorarios_c: String(row.honorarios_c),
    gastos: String(row.gastos),
    ayudante_a: String(row.ayudante_a),
    ayudante_b: String(row.ayudante_b),
    ayudante_c: String(row.ayudante_c),
  };
}

function applyPct(value: number, pct: number): number {
  return Math.round(value * (1 + pct / 100) * 100) / 100;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActualizacionValores() {
  // OS selection
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");

  // Percentage section
  const [pct, setPct] = useState("");
  const [pctVigencia, setPctVigencia] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: number; fail: number } | null>(null);

  // Code search section
  const [codeSearch, setCodeSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<ApiBoletinRow | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [editVigencia, setEditVigencia] = useState("");
  const [saveStatus, setSaveStatus] = useState<"ok" | "error" | null>(null);

  // ── OS list ──────────────────────────────────────────────────────────────
  const { data: osList = [], isLoading: isLoadingOS } = useQuery({
    queryKey: ["obras-sociales-list"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Rows for selected OS ─────────────────────────────────────────────────
  const {
    data: rows = [],
    isLoading: isLoadingRows,
    isFetching: isFetchingRows,
    refetch: refetchRows,
    error: rowsError,
  } = useQuery({
    queryKey: ["valores-actualizacion", selectedNroOS],
    queryFn: ({ signal }) => fetchRowsForOS(selectedNroOS!, signal),
    enabled: selectedNroOS != null,
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived values ───────────────────────────────────────────────────────
  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const term = osSearch.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre.toLowerCase().includes(term) ||
          String(os.nro_obra_social).includes(term)
      )
      .slice(0, 50);
  }, [osList, osSearch]);

  const selectedOSName = useMemo(
    () => osList.find((os) => os.nro_obra_social === selectedNroOS)?.nombre ?? "",
    [osList, selectedNroOS]
  );

  const pctNum = useMemo(() => {
    const n = parseFloat(pct.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [pct]);

  const foundRows = useMemo(() => {
    if (!codeSearch.trim() || !rows.length) return [];
    const term = codeSearch.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 20);
  }, [rows, codeSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectOS = useCallback((nro: number) => {
    setSelectedNroOS(nro);
    setApplyResult(null);
    setSelectedRow(null);
    setEditValues(null);
    setEditVigencia("");
    setSaveStatus(null);
    setCodeSearch("");
    setPct("");
    setPctVigencia("");
    setShowPreview(false);
  }, []);

  const handleSelectRow = useCallback((row: ApiBoletinRow) => {
    setSelectedRow(row);
    setEditValues(rowToEditValues(row));
    setEditVigencia("");
    setSaveStatus(null);
  }, []);

  const handleEditChange = useCallback(
    (field: keyof EditValues, value: string) => {
      setEditValues((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  // ── Mutations ────────────────────────────────────────────────────────────
  const pctMutation = useMutation({
    mutationFn: async () => {
      if (pctNum === null || !rows.length) return { ok: 0, fail: 0 };
      let ok = 0;
      let fail = 0;
      const fecha_cambio = pctVigencia || null;
      for (const row of rows) {
        try {
          await patchRow(row.id, {
            honorarios_a: applyPct(row.honorarios_a, pctNum),
            honorarios_b: applyPct(row.honorarios_b, pctNum),
            honorarios_c: applyPct(row.honorarios_c, pctNum),
            gastos: applyPct(row.gastos, pctNum),
            ayudante_a: applyPct(row.ayudante_a, pctNum),
            ayudante_b: applyPct(row.ayudante_b, pctNum),
            ayudante_c: applyPct(row.ayudante_c, pctNum),
            fecha_cambio,
          });
          ok++;
        } catch {
          fail++;
        }
      }
      return { ok, fail };
    },
    onSuccess: (result) => {
      setApplyResult(result);
      setShowPreview(false);
      void refetchRows();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow || !editValues) return;
      await patchRow(selectedRow.id, {
        honorarios_a: parseFloat(editValues.honorarios_a) || 0,
        honorarios_b: parseFloat(editValues.honorarios_b) || 0,
        honorarios_c: parseFloat(editValues.honorarios_c) || 0,
        gastos: parseFloat(editValues.gastos) || 0,
        ayudante_a: parseFloat(editValues.ayudante_a) || 0,
        ayudante_b: parseFloat(editValues.ayudante_b) || 0,
        ayudante_c: parseFloat(editValues.ayudante_c) || 0,
        fecha_cambio: editVigencia || null,
      });
    },
    onSuccess: () => {
      setSaveStatus("ok");
      void refetchRows();
    },
    onError: () => setSaveStatus("error"),
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Actualización de Valores</h1>
        <p className={styles.subtitle}>
          Seleccioná una obra social para aplicar un porcentaje a todos sus
          códigos o actualizar un código específico con valores personalizados.
        </p>
      </div>

      {/* ── 1. OS selection ─────────────────────────────────────────────── */}
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Seleccionar Obra Social</h2>
        <p className={styles.panelDescription}>
          Buscá y seleccioná la obra social cuyos valores querés actualizar.
        </p>

        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} size={18} />
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o número de obra social..."
            value={osSearch}
            onChange={(e) => setOsSearch(e.target.value)}
          />
        </div>

        {isLoadingOS ? (
          <p className={styles.hint}>Cargando obras sociales...</p>
        ) : (
          <div className={styles.osList}>
            {filteredOS.map((os) => (
              <button
                key={os.id}
                className={`${styles.osItem} ${
                  os.nro_obra_social === selectedNroOS ? styles.osItemSelected : ""
                }`}
                onClick={() => handleSelectOS(os.nro_obra_social)}
              >
                <span className={styles.osNro}>{os.nro_obra_social}</span>
                <span className={styles.osNombre}>{os.nombre}</span>
              </button>
            ))}
            {filteredOS.length === 0 && (
              <p className={styles.hint}>
                No se encontraron obras sociales con "{osSearch}".
              </p>
            )}
          </div>
        )}

        {selectedNroOS && (
          <div className={styles.selectedInfo}>
            {isLoadingRows || isFetchingRows ? (
              <span className={styles.loadingText}>Cargando códigos...</span>
            ) : rowsError ? (
              <span className={styles.errorText}>
                No se pudieron cargar los códigos.
              </span>
            ) : (
              <span className={styles.successText}>
                <CheckCircle2 size={15} />
                {rows.length} código{rows.length !== 1 ? "s" : ""} cargado
                {rows.length !== 1 ? "s" : ""} para{" "}
                <strong>{selectedOSName}</strong>
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void refetchRows()}
              disabled={isLoadingRows || isFetchingRows}
            >
              <span className={styles.buttonInner}>
                <RefreshCcw size={13} />
                Actualizar
              </span>
            </Button>
          </div>
        )}
      </section>

      {/* ── 2. Percentage update ────────────────────────────────────────── */}
      {selectedNroOS != null && !isLoadingRows && rows.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Actualización por Porcentaje Lineal
          </h2>
          <p className={styles.panelDescription}>
            Ingresá un porcentaje para incrementar o reducir{" "}
            <strong>todos los valores</strong> (Honorarios A/B/C, Gastos,
            Ayudante A/B/C) de los {rows.length} códigos de{" "}
            <strong>{selectedOSName}</strong>. Usá valores negativos para
            reducir.
          </p>

          <div className={styles.pctRow}>
            <div className={styles.pctInputWrapper}>
              <input
                className={styles.pctInput}
                type="number"
                step="0.01"
                placeholder="Ej: 15"
                value={pct}
                onChange={(e) => {
                  setPct(e.target.value);
                  setShowPreview(false);
                  setApplyResult(null);
                }}
              />
              <span className={styles.pctSymbol}>%</span>
            </div>

            <label className={styles.vigenciaField}>
              <span className={styles.vigenciaLabel}>Fecha de vigencia</span>
              <input
                className={styles.vigenciaInput}
                type="date"
                value={pctVigencia}
                onChange={(e) => setPctVigencia(e.target.value)}
              />
            </label>

            <Button
              size="md"
              variant="secondary"
              disabled={pctNum === null}
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "Ocultar vista previa" : "Vista previa"}
            </Button>

            <Button
              size="md"
              variant="primary"
              disabled={pctNum === null || pctMutation.isPending}
              onClick={() => void pctMutation.mutate()}
            >
              <span className={styles.buttonInner}>
                <TrendingUp size={16} />
                {pctMutation.isPending
                  ? "Aplicando..."
                  : `Aplicar a ${rows.length} código${rows.length !== 1 ? "s" : ""}`}
              </span>
            </Button>
          </div>

          {applyResult && (
            <div
              className={
                applyResult.fail === 0 ? styles.successBox : styles.warnBox
              }
            >
              {applyResult.fail === 0
                ? `✓ Se actualizaron ${applyResult.ok} código${applyResult.ok !== 1 ? "s" : ""} correctamente.`
                : `Se actualizaron ${applyResult.ok} código${applyResult.ok !== 1 ? "s" : ""}. Fallaron ${applyResult.fail}.`}
            </div>
          )}

          {showPreview && pctNum !== null && (
            <div className={styles.previewSection}>
              <p className={styles.previewHint}>
                Vista previa aplicando <strong>{pct}%</strong> — se muestran
                los primeros 20 códigos.
              </p>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Hon. A</th>
                      <th>Hon. B</th>
                      <th>Hon. C</th>
                      <th>Gastos</th>
                      <th>Ayud. A</th>
                      <th>Ayud. B</th>
                      <th>Ayud. C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row) => (
                      <tr key={row.id}>
                        <td className={styles.codeCell}>{row.codigos}</td>
                        {VALUE_FIELDS.map((f) => (
                          <td key={f}>
                            <span className={styles.oldVal}>
                              {moneyFormatter.format(row[f])}
                            </span>
                            <span className={styles.arrow}> → </span>
                            <strong>
                              {moneyFormatter.format(applyPct(row[f], pctNum))}
                            </strong>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 20 && (
                      <tr>
                        <td colSpan={8} className={styles.moreRows}>
                          ...y {rows.length - 20} código
                          {rows.length - 20 !== 1 ? "s" : ""} más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 3. Individual code update ────────────────────────────────────── */}
      {selectedNroOS != null && !isLoadingRows && rows.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Actualización por Código</h2>
          <p className={styles.panelDescription}>
            Buscá un código específico dentro de{" "}
            <strong>{selectedOSName}</strong> y editá sus valores de forma
            individual.
          </p>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={18} />
            <input
              className={styles.searchInput}
              placeholder="Buscar código (ej: 420351)..."
              value={codeSearch}
              onChange={(e) => {
                setCodeSearch(e.target.value);
                setSelectedRow(null);
                setEditValues(null);
                setSaveStatus(null);
              }}
            />
          </div>

          {codeSearch.trim() && foundRows.length === 0 && (
            <p className={styles.hint}>
              No se encontraron códigos que coincidan con "{codeSearch}".
            </p>
          )}

          {foundRows.length > 0 && !selectedRow && (
            <div className={styles.osList}>
              {foundRows.map((row) => (
                <button
                  key={row.id}
                  className={styles.osItem}
                  onClick={() => handleSelectRow(row)}
                >
                  <span className={styles.osNro}>{row.codigos}</span>
                  <span className={styles.osNombre}>
                    Hon. A: {moneyFormatter.format(row.honorarios_a)} · Gastos:{" "}
                    {moneyFormatter.format(row.gastos)} · Ayud. A:{" "}
                    {moneyFormatter.format(row.ayudante_a)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedRow && editValues && (
            <div className={styles.editCard}>
              <div className={styles.editHeader}>
                <span className={styles.editCode}>
                  Código: <strong>{selectedRow.codigos}</strong>
                </span>
                <button
                  className={styles.clearBtn}
                  onClick={() => {
                    setSelectedRow(null);
                    setEditValues(null);
                    setSaveStatus(null);
                  }}
                >
                  ×
                </button>
              </div>

              <div className={styles.editGrid}>
                {VALUE_FIELDS.map((field) => (
                  <label key={field} className={styles.editField}>
                    <span className={styles.editLabel}>
                      {FIELD_LABELS[field]}
                    </span>
                    <input
                      className={styles.editInput}
                      type="number"
                      step="0.01"
                      value={editValues[field]}
                      onChange={(e) => handleEditChange(field, e.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className={styles.editActions}>
                <label className={styles.vigenciaField}>
                  <span className={styles.vigenciaLabel}>Fecha de vigencia</span>
                  <input
                    className={styles.vigenciaInput}
                    type="date"
                    value={editVigencia}
                    onChange={(e) => setEditVigencia(e.target.value)}
                  />
                </label>

                <Button
                  size="md"
                  variant="primary"
                  onClick={() => void saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  <span className={styles.buttonInner}>
                    <Save size={16} />
                    {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </span>
                </Button>
              </div>

              {saveStatus === "ok" && (
                <div className={styles.successBox}>
                  ✓ Valores actualizados correctamente.
                </div>
              )}
              {saveStatus === "error" && (
                <div className={styles.errorBox}>
                  No se pudieron guardar los cambios. Intente nuevamente.
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
