"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search, Save, TrendingUp, TrendingDown,
  X as XIcon, CalendarDays, Eye, EyeOff,
  ArrowRight, CheckCircle2, Trash2, AlertTriangle, ShieldAlert,
} from "lucide-react";
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

type NewRowValues = Omit<ApiBoletinRow, "id">;

async function createRow(source: ApiBoletinRow, values: Partial<NewRowValues>): Promise<void> {
  const payload: NewRowValues = {
    codigos:        source.codigos,
    nro_obrasocial: source.nro_obrasocial,
    obra_social:    source.obra_social,
    c_p_h_s:        source.c_p_h_s,
    honorarios_a:   values.honorarios_a  ?? source.honorarios_a,
    honorarios_b:   values.honorarios_b  ?? source.honorarios_b,
    honorarios_c:   values.honorarios_c  ?? source.honorarios_c,
    gastos:         values.gastos        ?? source.gastos,
    ayudante_a:     values.ayudante_a    ?? source.ayudante_a,
    ayudante_b:     values.ayudante_b    ?? source.ayudante_b,
    ayudante_c:     values.ayudante_c    ?? source.ayudante_c,
    fecha_cambio:   values.fecha_cambio   !== undefined ? values.fecha_cambio   : source.fecha_cambio,
    fecha_vigencia: values.fecha_vigencia !== undefined ? values.fecha_vigencia : source.fecha_vigencia,
  };
  await http.post(BOLETIN_URL, payload);
}

type EditValues = {
  honorarios_a: string;
  gastos: string;
  ayudante_a: string;
};

type PanicTab = "date" | "code";

const ALL_VALUE_FIELDS = [
  "honorarios_a",
  "honorarios_b",
  "honorarios_c",
  "gastos",
  "ayudante_a",
  "ayudante_b",
  "ayudante_c",
] as const;

function applyPct(value: number, pct: number): number {
  return Math.round(value * (1 + pct / 100) * 100) / 100;
}

function rowToEditValues(row: ApiBoletinRow): EditValues {
  return {
    honorarios_a: String(row.honorarios_a),
    gastos: String(row.gastos),
    ayudante_a: String(row.ayudante_a),
  };
}

export default function ActualizacionValores() {
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");

  // ── Panel 2: Porcentaje lineal ────────────────────────────────────────────
  const [pct, setPct] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");
  const [excludedCodes, setExcludedCodes] = useState<Set<string>>(new Set());
  const [excludeSearch, setExcludeSearch] = useState("");
  const [excludedRanges, setExcludedRanges] = useState<Array<{ from: string; to: string }>>([]);
  const [excludeRangeFrom, setExcludeRangeFrom] = useState("");
  const [excludeRangeTo, setExcludeRangeTo] = useState("");
  const [excludeRangeFromDirty, setExcludeRangeFromDirty] = useState(false);
  const [excludeRangeToDirty, setExcludeRangeToDirty] = useState(false);

  // ── Panel 3: Porcentaje por código ───────────────────────────────────────
  const [pctCode, setPctCode] = useState("");
  const [pctCodeSearch, setPctCodeSearch] = useState("");
  const [pctCodeSelected, setPctCodeSelected] = useState<ApiBoletinRow[]>([]);
  const [pctCodeShowPreview, setPctCodeShowPreview] = useState(false);

  // ── Panel 4: Porcentaje desde–hasta ──────────────────────────────────────
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangePct, setRangePct] = useState("");
  const [rangeShowPreview, setRangeShowPreview] = useState(false);
  const [rangeFromDirty, setRangeFromDirty] = useState(false);
  const [rangeToDirty, setRangeToDirty] = useState(false);

  // ── Panel 5: Edición individual ───────────────────────────────────────────
  const [codeSearch, setCodeSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<ApiBoletinRow | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [editFechaVigencia, setEditFechaVigencia] = useState("");

  // ── Fecha vigencia per panel ─────────────────────────────────────────────
  const [pctFechaVigencia, setPctFechaVigencia] = useState("");
  const [pctCodeFechaVigencia, setPctCodeFechaVigencia] = useState("");
  const [rangeFechaVigencia, setRangeFechaVigencia] = useState("");

  // ── Panic modal ───────────────────────────────────────────────────────────
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicTab, setPanicTab] = useState<PanicTab>("date");
  const [panicDate, setPanicDate] = useState("");
  const [panicCodeSearch, setPanicCodeSearch] = useState("");
  const [panicSelectedRow, setPanicSelectedRow] = useState<ApiBoletinRow | null>(null);
  const [panicConfirmed, setPanicConfirmed] = useState(false);

  const [popup, setPopup] = useState<{ message: string; type: "success" | "warn" | "error" } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: osList = [], isLoading: isLoadingOS } = useQuery({
    queryKey: ["obras-sociales-list"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rows = [], isLoading: isLoadingRows, refetch: refetchRows } = useQuery({
    queryKey: ["valores-actualizacion", selectedNroOS],
    queryFn: ({ signal }) => fetchRowsForOS(selectedNroOS!, signal),
    enabled: selectedNroOS != null,
    staleTime: 5 * 60 * 1000,
  });

  // ── Memos ─────────────────────────────────────────────────────────────────
  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const term = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre.toLowerCase().includes(term) || String(os.nro_obra_social).includes(term))
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

  const previewRows = useMemo(() => {
    if (!previewSearch.trim()) return rows.slice(0, 20);
    const term = previewSearch.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 100);
  }, [rows, previewSearch]);

  const excludeFoundRows = useMemo(() => {
    if (!excludeSearch.trim() || !rows.length) return [];
    const term = excludeSearch.trim().toLowerCase();
    return rows
      .filter((r) => r.codigos.toLowerCase().includes(term) && !excludedCodes.has(r.codigos))
      .slice(0, 15);
  }, [rows, excludeSearch, excludedCodes]);

  const excludeRangeFromResults = useMemo(() => {
    if (!excludeRangeFromDirty || !excludeRangeFrom.trim() || !rows.length) return [];
    const term = excludeRangeFrom.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 15);
  }, [rows, excludeRangeFrom, excludeRangeFromDirty]);

  const excludeRangeToResults = useMemo(() => {
    if (!excludeRangeToDirty || !excludeRangeTo.trim() || !rows.length) return [];
    const term = excludeRangeTo.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 15);
  }, [rows, excludeRangeTo, excludeRangeToDirty]);

  const isInExcludedRange = useCallback((code: string): boolean => {
    return excludedRanges.some(
      ({ from, to }) =>
        code.localeCompare(from, "es", { numeric: true }) >= 0 &&
        code.localeCompare(to, "es", { numeric: true }) <= 0
    );
  }, [excludedRanges]);

  const activeRowCount = useMemo(
    () => rows.filter((r) => !excludedCodes.has(r.codigos) && !isInExcludedRange(r.codigos)).length,
    [rows, excludedCodes, isInExcludedRange]
  );

  const pctCodeNum = useMemo(() => {
    const n = parseFloat(pctCode.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [pctCode]);

  const selectedCodeIds = useMemo(
    () => new Set(pctCodeSelected.map((r) => r.id)),
    [pctCodeSelected]
  );

  const pctCodeFoundRows = useMemo(() => {
    if (!pctCodeSearch.trim() || !rows.length) return [];
    const term = pctCodeSearch.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term) && !selectedCodeIds.has(r.id)).slice(0, 15);
  }, [rows, pctCodeSearch, selectedCodeIds]);

  const rangePctNum = useMemo(() => {
    const n = parseFloat(rangePct.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [rangePct]);

  const rangeFromResults = useMemo(() => {
    if (!rangeFromDirty || !rangeFrom.trim() || !rows.length) return [];
    const term = rangeFrom.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 15);
  }, [rows, rangeFrom, rangeFromDirty]);

  const rangeToResults = useMemo(() => {
    if (!rangeToDirty || !rangeTo.trim() || !rows.length) return [];
    const term = rangeTo.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 15);
  }, [rows, rangeTo, rangeToDirty]);

  const rangeRows = useMemo(() => {
    const from = rangeFrom.trim();
    const to = rangeTo.trim();
    if (!from || !to || !rows.length) return [];
    return rows.filter((r) => {
      const code = r.codigos;
      return (
        code.localeCompare(from, "es", { numeric: true }) >= 0 &&
        code.localeCompare(to, "es", { numeric: true }) <= 0
      );
    });
  }, [rows, rangeFrom, rangeTo]);

  const foundRows = useMemo(() => {
    if (!codeSearch.trim() || !rows.length) return [];
    const term = codeSearch.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 20);
  }, [rows, codeSearch]);

  const panicRowsByDate = useMemo(() => {
    if (!panicDate) return [];
    return rows.filter((r) => r.fecha_cambio === panicDate);
  }, [rows, panicDate]);

  const panicCodeResults = useMemo(() => {
    if (!panicCodeSearch.trim()) return [];
    const term = panicCodeSearch.trim().toLowerCase();
    return rows.filter((r) => r.codigos.toLowerCase().includes(term)).slice(0, 15);
  }, [rows, panicCodeSearch]);

  const panicTargets = panicTab === "date" ? panicRowsByDate : (panicSelectedRow ? [panicSelectedRow] : []);

  const pctIsPositive = pctNum !== null && pctNum > 0;
  const pctIsNegative = pctNum !== null && pctNum < 0;
  const panicDisabled = selectedNroOS == null || isLoadingRows || rows.length === 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const closePanic = useCallback(() => {
    setPanicOpen(false);
    setPanicTab("date");
    setPanicDate("");
    setPanicCodeSearch("");
    setPanicSelectedRow(null);
    setPanicConfirmed(false);
  }, []);

  const handleSelectOS = useCallback((nro: number) => {
    setSelectedNroOS(nro);
    setSelectedRow(null);
    setEditValues(null);
    setEditFechaVigencia("");
    setCodeSearch("");
    setPct("");
    setPctFechaVigencia("");
    setShowPreview(false);
    setPreviewSearch("");
    setExcludedCodes(new Set());
    setExcludeSearch("");
    setExcludedRanges([]);
    setExcludeRangeFrom("");
    setExcludeRangeTo("");
    setExcludeRangeFromDirty(false);
    setExcludeRangeToDirty(false);
    setPctCode("");
    setPctCodeFechaVigencia("");
    setPctCodeSearch("");
    setPctCodeSelected([]);
    setPctCodeShowPreview(false);
    setRangeFrom("");
    setRangeTo("");
    setRangePct("");
    setRangeFechaVigencia("");
    setRangeShowPreview(false);
    setRangeFromDirty(false);
    setRangeToDirty(false);
    closePanic();
    setPopup(null);
  }, [closePanic]);

  const handleSelectRow = useCallback((row: ApiBoletinRow) => {
    setSelectedRow(row);
    setEditValues(rowToEditValues(row));
  }, []);

  const handleEditChange = useCallback(
    (field: keyof EditValues, value: string) => {
      setEditValues((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const pctMutation = useMutation({
    mutationFn: async () => {
      if (pctNum === null || !rows.length) return { ok: 0, fail: 0 };
      let ok = 0, fail = 0;
      const d = new Date();
      const fecha_cambio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const fecha_vigencia = pctFechaVigencia || null;
      for (const row of rows) {
        if (excludedCodes.has(row.codigos) || isInExcludedRange(row.codigos)) continue;
        try {
          await createRow(row, {
            honorarios_a: applyPct(row.honorarios_a, pctNum),
            honorarios_b: applyPct(row.honorarios_b, pctNum),
            honorarios_c: applyPct(row.honorarios_c, pctNum),
            gastos:       applyPct(row.gastos, pctNum),
            ayudante_a:   applyPct(row.ayudante_a, pctNum),
            ayudante_b:   applyPct(row.ayudante_b, pctNum),
            ayudante_c:   applyPct(row.ayudante_c, pctNum),
            fecha_cambio,
            fecha_vigencia,
          });
          ok++;
        } catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: (result) => {
      setShowPreview(false);
      void refetchRows();
      setPopup(result.fail === 0
        ? { message: `Se actualizaron ${result.ok} código${result.ok !== 1 ? "s" : ""} correctamente.`, type: "success" }
        : { message: `Se actualizaron ${result.ok} código${result.ok !== 1 ? "s" : ""}. Fallaron ${result.fail}.`, type: "warn" });
    },
  });

  const pctCodeMutation = useMutation({
    mutationFn: async () => {
      if (pctCodeNum === null || !pctCodeSelected.length) return { ok: 0, fail: 0 };
      let ok = 0, fail = 0;
      const d = new Date();
      const fecha_cambio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const fecha_vigencia = pctCodeFechaVigencia || null;
      for (const row of pctCodeSelected) {
        try {
          await createRow(row, {
            honorarios_a: applyPct(row.honorarios_a, pctCodeNum),
            honorarios_b: applyPct(row.honorarios_b, pctCodeNum),
            honorarios_c: applyPct(row.honorarios_c, pctCodeNum),
            gastos:       applyPct(row.gastos, pctCodeNum),
            ayudante_a:   applyPct(row.ayudante_a, pctCodeNum),
            ayudante_b:   applyPct(row.ayudante_b, pctCodeNum),
            ayudante_c:   applyPct(row.ayudante_c, pctCodeNum),
            fecha_cambio,
            fecha_vigencia,
          });
          ok++;
        } catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: (result) => {
      setPctCodeSelected([]);
      setPctCode("");
      setPctCodeShowPreview(false);
      void refetchRows();
      setPopup(result.fail === 0
        ? { message: `Se actualizaron ${result.ok} código${result.ok !== 1 ? "s" : ""} correctamente.`, type: "success" }
        : { message: `Se actualizaron ${result.ok} código${result.ok !== 1 ? "s" : ""}. Fallaron ${result.fail}.`, type: "warn" });
    },
  });

  const rangeMutation = useMutation({
    mutationFn: async () => {
      if (rangePctNum === null || !rangeRows.length) return { ok: 0, fail: 0 };
      let ok = 0, fail = 0;
      const d = new Date();
      const fecha_cambio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const fecha_vigencia = rangeFechaVigencia || null;
      for (const row of rangeRows) {
        try {
          await createRow(row, {
            honorarios_a: applyPct(row.honorarios_a, rangePctNum),
            honorarios_b: applyPct(row.honorarios_b, rangePctNum),
            honorarios_c: applyPct(row.honorarios_c, rangePctNum),
            gastos:       applyPct(row.gastos, rangePctNum),
            ayudante_a:   applyPct(row.ayudante_a, rangePctNum),
            ayudante_b:   applyPct(row.ayudante_b, rangePctNum),
            ayudante_c:   applyPct(row.ayudante_c, rangePctNum),
            fecha_cambio,
            fecha_vigencia,
          });
          ok++;
        } catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: (result) => {
      setRangeShowPreview(false);
      void refetchRows();
      setPopup(result.fail === 0
        ? { message: `Se actualizaron ${result.ok} código${result.ok !== 1 ? "s" : ""} correctamente.`, type: "success" }
        : { message: `Se actualizaron ${result.ok} código${result.ok !== 1 ? "s" : ""}. Fallaron ${result.fail}.`, type: "warn" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow || !editValues) return;
      const honA = parseFloat(editValues.honorarios_a) || 0;
      const aydA = parseFloat(editValues.ayudante_a) || 0;
      await createRow(selectedRow, {
        honorarios_a: honA,
        honorarios_b: honA,
        honorarios_c: honA,
        gastos:       parseFloat(editValues.gastos) || 0,
        ayudante_a:   aydA,
        ayudante_b:   aydA,
        ayudante_c:   aydA,
        fecha_cambio:   (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(),
        fecha_vigencia: editFechaVigencia || null,
      });
    },
    onSuccess: () => {
      void refetchRows();
      setPopup({ message: "Valores del código actualizados correctamente.", type: "success" });
    },
    onError: () => setPopup({ message: "No se pudieron guardar los cambios. Intente nuevamente.", type: "error" }),
  });

  const panicMutation = useMutation({
    mutationFn: async () => {
      let deleted = 0, fail = 0;
      for (const row of panicTargets) {
        try {
          await http.delete(`${BOLETIN_URL}/${row.id}`);
          deleted++;
        } catch { fail++; }
      }
      return { deleted, fail };
    },
    onSuccess: (result) => {
      closePanic();
      void refetchRows();
      setPopup(result.fail === 0
        ? { message: `Se eliminaron ${result.deleted} registro${result.deleted !== 1 ? "s" : ""} correctamente.`, type: "success" }
        : { message: `Se eliminaron ${result.deleted} registros. No se pudieron eliminar ${result.fail}.`, type: "warn" });
    },
    onError: () => setPopup({ message: "No se pudieron eliminar los registros. Intente nuevamente.", type: "error" }),
  });

  const derivedHonA = editValues ? parseFloat(editValues.honorarios_a) || 0 : 0;
  const derivedAydA = editValues ? parseFloat(editValues.ayudante_a) || 0 : 0;

  return (
    <div className={styles.container}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Actualización de Valores</h1>
            <p className={styles.subtitle}>
              Seleccioná una obra social para aplicar un porcentaje a todos sus
              códigos, o actualizá un código específico de forma individual.
            </p>
          </div>
          <button
            className={styles.panicTrigger}
            disabled={panicDisabled}
            onClick={() => setPanicOpen(true)}
            title={panicDisabled ? "Seleccioná una obra social primero" : "Revertir cambios"}
          >
            <ShieldAlert size={16} />
            Panel de emergencia
          </button>
        </div>
      </div>

      {/* ── 1. OS selection ─────────────────────────────────────────────── */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.stepBadge}>1</span>
          <div>
            <h2 className={styles.panelTitle}>Seleccionar Obra Social</h2>
            <p className={styles.panelDescription}>
              Buscá y seleccioná la obra social cuyos valores querés actualizar.
            </p>
          </div>
        </div>

        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} size={17} />
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o número..."
            value={osSearch}
            onChange={(e) => setOsSearch(e.target.value)}
          />
        </div>

        {isLoadingOS ? (
          <p className={styles.hint}>Cargando obras sociales...</p>
        ) : (
          <div className={styles.osList}>
            {filteredOS.map((os) => {
              const isSelected = os.nro_obra_social === selectedNroOS;
              return (
                <button
                  key={os.id}
                  className={`${styles.osItem} ${isSelected ? styles.osItemSelected : ""}`}
                  onClick={() => handleSelectOS(os.nro_obra_social)}
                >
                  <span className={styles.osNro}>{os.nro_obra_social}</span>
                  <span className={styles.osNombre}>{os.nombre}</span>
                  {isSelected && <CheckCircle2 className={styles.osCheck} size={16} />}
                </button>
              );
            })}
            {filteredOS.length === 0 && (
              <p className={styles.hint}>No se encontraron obras sociales con "{osSearch}".</p>
            )}
          </div>
        )}
      </section>

      {/* ── 2. Percentage update (all codes) ────────────────────────────── */}
      {selectedNroOS != null && !isLoadingRows && rows.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepBadge}>2</span>
            <div>
              <h2 className={styles.panelTitle}>Actualización por Porcentaje</h2>
              <p className={styles.panelDescription}>
                Incrementá o reducí todos los valores de los{" "}
                <strong>{rows.length} códigos</strong> de{" "}
                <strong>{selectedOSName}</strong> con un porcentaje lineal.
              </p>
            </div>
          </div>

          <div className={styles.pctCard}>
            <div className={styles.pctInputsRow}>
              <div className={styles.pctFieldGroup}>
                <label className={styles.fieldLabel}>Porcentaje de ajuste</label>
                <div className={styles.pctInputWrapper}>
                  <input
                    className={`${styles.pctInput} ${
                      pctIsPositive ? styles.pctInputPositive : pctIsNegative ? styles.pctInputNegative : ""
                    }`}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={pct}
                    onChange={(e) => { setPct(e.target.value); setShowPreview(false); }}
                  />
                  <span className={`${styles.pctSymbol} ${
                    pctIsPositive ? styles.pctSymbolPositive : pctIsNegative ? styles.pctSymbolNegative : ""
                  }`}>%</span>
                </div>
              </div>

              <div className={styles.pctFieldGroup}>
                <label className={styles.fieldLabel}>
                  <CalendarDays size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Fecha vigencia
                </label>
                <input
                  className={styles.vigenciaInput}
                  type="date"
                  value={pctFechaVigencia}
                  onChange={(e) => setPctFechaVigencia(e.target.value)}
                />
              </div>
            </div>

            {pctNum !== null && pctNum !== 0 && (
              <div className={`${styles.pctIndicator} ${pctIsPositive ? styles.pctIndicatorUp : styles.pctIndicatorDown}`}>
                {pctIsPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                <span>
                  {pctIsPositive
                    ? `Los valores de ${activeRowCount} código${activeRowCount !== 1 ? "s" : ""} subirán un ${pctNum}%`
                    : `Los valores de ${activeRowCount} código${activeRowCount !== 1 ? "s" : ""} bajarán un ${Math.abs(pctNum)}%`}
                  {(excludedCodes.size > 0 || excludedRanges.length > 0) && (
                    <span className={styles.excludedNote}>
                      {" "}({rows.length - activeRowCount} excluido{rows.length - activeRowCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Exclusión por código individual */}
            <div className={styles.excludeSection}>
              <p className={styles.excludeLabel}>Excluir códigos de esta actualización</p>
              <div className={styles.searchBar} style={{ marginBottom: excludeFoundRows.length > 0 ? 4 : 0 }}>
                <Search className={styles.searchIcon} size={15} />
                <input
                  className={styles.searchInput}
                  placeholder="Buscar código para excluir..."
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                />
              </div>

              {excludeFoundRows.length > 0 && (
                <div className={styles.excludeDropdown}>
                  {excludeFoundRows.map((row) => (
                    <button
                      key={row.id}
                      className={styles.excludeOption}
                      onClick={() => { setExcludedCodes((prev) => new Set([...prev, row.codigos])); setExcludeSearch(""); }}
                    >
                      <span className={styles.osNro}>{row.codigos}</span>
                      <span className={styles.osNombre}>
                        Hon. A: {moneyFormatter.format(row.honorarios_a)}
                        <span className={styles.dotSep}>·</span>
                        Gastos: {moneyFormatter.format(row.gastos)}
                      </span>
                      <span className={styles.excludeAdd}>+ Excluir</span>
                    </button>
                  ))}
                </div>
              )}

              {excludedCodes.size > 0 && (
                <div className={styles.excludeChips}>
                  {[...excludedCodes].map((code) => (
                    <span key={code} className={styles.excludeChip}>
                      {code}
                      <button
                        className={styles.excludeChipRemove}
                        onClick={() => setExcludedCodes((prev) => { const n = new Set(prev); n.delete(code); return n; })}
                        aria-label={`Quitar ${code} de exclusiones`}
                      >
                        <XIcon size={11} />
                      </button>
                    </span>
                  ))}
                  <button className={styles.excludeClearAll} onClick={() => setExcludedCodes(new Set())}>
                    Limpiar todo
                  </button>
                </div>
              )}

              {/* Exclusión por rango */}
              <p className={styles.excludeLabel} style={{ marginTop: 14 }}>Excluir rango de códigos</p>
              <div className={styles.pctInputsRow} style={{ gap: 8 }}>
                <div className={styles.pctFieldGroup}>
                  <label className={styles.fieldLabel}>Desde</label>
                  <input
                    className={styles.pctInput}
                    type="text"
                    placeholder="ej: 42031"
                    value={excludeRangeFrom}
                    onChange={(e) => { setExcludeRangeFrom(e.target.value); setExcludeRangeFromDirty(true); }}
                  />
                  {excludeRangeFromResults.length > 0 && (
                    <div className={styles.excludeDropdown}>
                      {excludeRangeFromResults.map((row) => (
                        <button
                          key={row.id}
                          className={styles.excludeOption}
                          onClick={() => { setExcludeRangeFrom(row.codigos); setExcludeRangeFromDirty(false); }}
                        >
                          <span className={styles.osNro}>{row.codigos}</span>
                          <span className={styles.osNombre}>Hon. A: {moneyFormatter.format(row.honorarios_a)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.pctFieldGroup}>
                  <label className={styles.fieldLabel}>Hasta</label>
                  <input
                    className={styles.pctInput}
                    type="text"
                    placeholder="ej: 42040"
                    value={excludeRangeTo}
                    onChange={(e) => { setExcludeRangeTo(e.target.value); setExcludeRangeToDirty(true); }}
                  />
                  {excludeRangeToResults.length > 0 && (
                    <div className={styles.excludeDropdown}>
                      {excludeRangeToResults.map((row) => (
                        <button
                          key={row.id}
                          className={styles.excludeOption}
                          onClick={() => { setExcludeRangeTo(row.codigos); setExcludeRangeToDirty(false); }}
                        >
                          <span className={styles.osNro}>{row.codigos}</span>
                          <span className={styles.osNombre}>Hon. A: {moneyFormatter.format(row.honorarios_a)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.pctFieldGroup} style={{ justifyContent: "flex-end" }}>
                  <label className={styles.fieldLabel}>&nbsp;</label>
                  <button
                    className={styles.excludeAdd}
                    style={{ alignSelf: "flex-end", padding: "6px 12px", borderRadius: 6, border: "1px solid #9d91c2", background: "none", cursor: "pointer", fontSize: 13, color: "#574e76", whiteSpace: "nowrap" }}
                    disabled={!excludeRangeFrom.trim() || !excludeRangeTo.trim()}
                    onClick={() => {
                      if (!excludeRangeFrom.trim() || !excludeRangeTo.trim()) return;
                      setExcludedRanges((prev) => [...prev, { from: excludeRangeFrom.trim(), to: excludeRangeTo.trim() }]);
                      setExcludeRangeFrom("");
                      setExcludeRangeTo("");
                      setExcludeRangeFromDirty(false);
                      setExcludeRangeToDirty(false);
                    }}
                  >
                    + Excluir rango
                  </button>
                </div>
              </div>

              {excludedRanges.length > 0 && (
                <div className={styles.excludeChips}>
                  {excludedRanges.map((r, i) => (
                    <span key={i} className={styles.excludeChip}>
                      {r.from} – {r.to}
                      <button
                        className={styles.excludeChipRemove}
                        onClick={() => setExcludedRanges((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Quitar rango ${r.from}–${r.to}`}
                      >
                        <XIcon size={11} />
                      </button>
                    </span>
                  ))}
                  <button className={styles.excludeClearAll} onClick={() => setExcludedRanges([])}>
                    Limpiar rangos
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.pctActions}>
            <Button
              size="md"
              variant="secondary"
              disabled={pctNum === null}
              onClick={() => setShowPreview((v) => !v)}
            >
              <span className={styles.buttonInner}>
                {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                {showPreview ? "Ocultar previa" : "Vista previa"}
              </span>
            </Button>

            <Button
              size="md"
              variant="primary"
              disabled={pctNum === null || pctMutation.isPending || activeRowCount === 0}
              onClick={() => void pctMutation.mutate()}
            >
              <span className={styles.buttonInner}>
                <TrendingUp size={15} />
                {pctMutation.isPending ? "Aplicando..." : `Aplicar a ${activeRowCount} código${activeRowCount !== 1 ? "s" : ""}`}
              </span>
            </Button>
          </div>

          {showPreview && pctNum !== null && (
            <div className={styles.previewSection}>
              <div className={styles.previewHeader}>
                <p className={styles.previewHint}>
                  Vista previa con <strong>{pct}%</strong>
                  {previewSearch.trim()
                    ? ` — ${previewRows.length} resultado${previewRows.length !== 1 ? "s" : ""} para "${previewSearch}"`
                    : ` — primeros 20 de ${rows.length} códigos`}
                </p>
                <div className={styles.previewSearchBar}>
                  <Search className={styles.searchIcon} size={15} />
                  <input
                    className={styles.previewSearchInput}
                    placeholder="Buscar código..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                  />
                  {previewSearch && (
                    <button className={styles.previewSearchClear} onClick={() => setPreviewSearch("")} aria-label="Limpiar">
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th><th>Hon. A</th><th>Hon. B</th><th>Hon. C</th>
                      <th>Gastos</th><th>Ayud. A</th><th>Ayud. B</th><th>Ayud. C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length === 0 ? (
                      <tr><td colSpan={8} className={styles.moreRows}>No se encontraron códigos que coincidan con "{previewSearch}".</td></tr>
                    ) : (
                      <>
                        {previewRows.map((row) => (
                          <tr key={row.id}>
                            <td className={styles.codeCell}>{row.codigos}</td>
                            {ALL_VALUE_FIELDS.map((f) => (
                              <td key={f}>
                                <span className={styles.oldVal}>{moneyFormatter.format(row[f])}</span>
                                <span className={styles.arrow}> → </span>
                                <strong>{moneyFormatter.format(applyPct(row[f], pctNum))}</strong>
                              </td>
                            ))}
                          </tr>
                        ))}
                        {!previewSearch.trim() && rows.length > 20 && (
                          <tr><td colSpan={8} className={styles.moreRows}>...y {rows.length - 20} código{rows.length - 20 !== 1 ? "s" : ""} más — usá el buscador para encontrar uno específico</td></tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 3. Percentage update per code ───────────────────────────────── */}
      {selectedNroOS != null && !isLoadingRows && rows.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepBadge}>3</span>
            <div>
              <h2 className={styles.panelTitle}>Actualización por Porcentaje (Por Código)</h2>
              <p className={styles.panelDescription}>
                Buscá y seleccioná códigos de <strong>{selectedOSName}</strong> para
                aplicarles un porcentaje específico, sin afectar el resto.
              </p>
            </div>
          </div>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={17} />
            <input
              className={styles.searchInput}
              placeholder="Buscar código para agregar..."
              value={pctCodeSearch}
              onChange={(e) => setPctCodeSearch(e.target.value)}
            />
          </div>

          {pctCodeFoundRows.length > 0 && (
            <div className={styles.excludeDropdown}>
              {pctCodeFoundRows.map((row) => (
                <button
                  key={row.id}
                  className={styles.excludeOption}
                  onClick={() => { setPctCodeSelected((prev) => [...prev, row]); setPctCodeSearch(""); setPctCodeShowPreview(false); }}
                >
                  <span className={styles.osNro}>{row.codigos}</span>
                  <span className={styles.osNombre}>
                    Hon. A: {moneyFormatter.format(row.honorarios_a)}
                    <span className={styles.dotSep}>·</span>
                    Gastos: {moneyFormatter.format(row.gastos)}
                    <span className={styles.dotSep}>·</span>
                    Ayud. A: {moneyFormatter.format(row.ayudante_a)}
                  </span>
                  <span className={styles.excludeAdd}>+ Agregar</span>
                </button>
              ))}
            </div>
          )}

          {pctCodeSelected.length > 0 && (
            <>
              <div className={styles.excludeChips} style={{ marginTop: 8 }}>
                {pctCodeSelected.map((row) => (
                  <span key={row.id} className={styles.pctCodeChip}>
                    {row.codigos}
                    <button
                      className={styles.excludeChipRemove}
                      onClick={() => { setPctCodeSelected((prev) => prev.filter((r) => r.id !== row.id)); setPctCodeShowPreview(false); }}
                      aria-label={`Quitar ${row.codigos}`}
                    >
                      <XIcon size={11} />
                    </button>
                  </span>
                ))}
                <button className={styles.excludeClearAll} onClick={() => { setPctCodeSelected([]); setPctCodeShowPreview(false); }}>
                  Limpiar todo
                </button>
              </div>

              <div className={styles.pctCard} style={{ marginTop: 16 }}>
                <div className={styles.pctInputsRow}>
                  <div className={styles.pctFieldGroup}>
                    <label className={styles.fieldLabel}>Porcentaje de ajuste</label>
                    <div className={styles.pctInputWrapper}>
                      <input
                        className={`${styles.pctInput} ${
                          pctCodeNum !== null && pctCodeNum > 0 ? styles.pctInputPositive
                          : pctCodeNum !== null && pctCodeNum < 0 ? styles.pctInputNegative : ""
                        }`}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={pctCode}
                        onChange={(e) => { setPctCode(e.target.value); setPctCodeShowPreview(false); }}
                      />
                      <span className={`${styles.pctSymbol} ${
                        pctCodeNum !== null && pctCodeNum > 0 ? styles.pctSymbolPositive
                        : pctCodeNum !== null && pctCodeNum < 0 ? styles.pctSymbolNegative : ""
                      }`}>%</span>
                    </div>
                  </div>

                  <div className={styles.pctFieldGroup}>
                    <label className={styles.fieldLabel}>
                      <CalendarDays size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                      Fecha vigencia
                    </label>
                    <input
                      className={styles.vigenciaInput}
                      type="date"
                      value={pctCodeFechaVigencia}
                      onChange={(e) => setPctCodeFechaVigencia(e.target.value)}
                    />
                  </div>
                </div>

                {pctCodeNum !== null && pctCodeNum !== 0 && (
                  <div className={`${styles.pctIndicator} ${pctCodeNum > 0 ? styles.pctIndicatorUp : styles.pctIndicatorDown}`}>
                    {pctCodeNum > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    <span>
                      {pctCodeNum > 0
                        ? `${pctCodeSelected.length} código${pctCodeSelected.length !== 1 ? "s" : ""} subirán un ${pctCodeNum}%`
                        : `${pctCodeSelected.length} código${pctCodeSelected.length !== 1 ? "s" : ""} bajarán un ${Math.abs(pctCodeNum)}%`}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.pctActions}>
                <Button
                  size="md"
                  variant="secondary"
                  disabled={pctCodeNum === null}
                  onClick={() => setPctCodeShowPreview((v) => !v)}
                >
                  <span className={styles.buttonInner}>
                    {pctCodeShowPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                    {pctCodeShowPreview ? "Ocultar previa" : "Vista previa"}
                  </span>
                </Button>

                <Button
                  size="md"
                  variant="primary"
                  disabled={pctCodeNum === null || pctCodeMutation.isPending}
                  onClick={() => void pctCodeMutation.mutate()}
                >
                  <span className={styles.buttonInner}>
                    <TrendingUp size={15} />
                    {pctCodeMutation.isPending ? "Aplicando..." : `Aplicar a ${pctCodeSelected.length} código${pctCodeSelected.length !== 1 ? "s" : ""}`}
                  </span>
                </Button>
              </div>

              {pctCodeShowPreview && pctCodeNum !== null && (
                <div className={styles.previewSection}>
                  <p className={styles.previewHint}>
                    Vista previa con <strong>{pctCode}%</strong> — {pctCodeSelected.length} código{pctCodeSelected.length !== 1 ? "s" : ""} seleccionado{pctCodeSelected.length !== 1 ? "s" : ""}
                  </p>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Código</th><th>Hon. A</th><th>Hon. B</th><th>Hon. C</th>
                          <th>Gastos</th><th>Ayud. A</th><th>Ayud. B</th><th>Ayud. C</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pctCodeSelected.map((row) => (
                          <tr key={row.id}>
                            <td className={styles.codeCell}>{row.codigos}</td>
                            {ALL_VALUE_FIELDS.map((f) => (
                              <td key={f}>
                                <span className={styles.oldVal}>{moneyFormatter.format(row[f])}</span>
                                <span className={styles.arrow}> → </span>
                                <strong>{moneyFormatter.format(applyPct(row[f], pctCodeNum))}</strong>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

         
        </section>
      )}

      {/* ── 4. Range percentage update ──────────────────────────────────── */}
      {selectedNroOS != null && !isLoadingRows && rows.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepBadge}>4</span>
            <div>
              <h2 className={styles.panelTitle}>Actualización por Porcentaje (Desde – Hasta)</h2>
              <p className={styles.panelDescription}>
                Aplicá un porcentaje a todos los códigos de{" "}
                <strong>{selectedOSName}</strong> que se encuentren dentro de un
                rango, incluidos ambos extremos.
              </p>
            </div>
          </div>

          <div className={styles.pctCard}>
            <div className={styles.pctInputsRow}>
              <div className={styles.pctFieldGroup}>
                <label className={styles.fieldLabel}>Código desde</label>
                <input
                  className={styles.pctInput}
                  type="text"
                  placeholder="ej: 42031"
                  value={rangeFrom}
                  onChange={(e) => { setRangeFrom(e.target.value); setRangeFromDirty(true); setRangeShowPreview(false); }}
                />
                {rangeFromResults.length > 0 && (
                  <div className={styles.excludeDropdown}>
                    {rangeFromResults.map((row) => (
                      <button
                        key={row.id}
                        className={styles.excludeOption}
                        onClick={() => { setRangeFrom(row.codigos); setRangeFromDirty(false); setRangeShowPreview(false); }}
                      >
                        <span className={styles.osNro}>{row.codigos}</span>
                        <span className={styles.osNombre}>
                          Hon. A: {moneyFormatter.format(row.honorarios_a)}
                          <span className={styles.dotSep}>·</span>
                          Gastos: {moneyFormatter.format(row.gastos)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.pctFieldGroup}>
                <label className={styles.fieldLabel}>Código hasta</label>
                <input
                  className={styles.pctInput}
                  type="text"
                  placeholder="ej: 42040"
                  value={rangeTo}
                  onChange={(e) => { setRangeTo(e.target.value); setRangeToDirty(true); setRangeShowPreview(false); }}
                />
                {rangeToResults.length > 0 && (
                  <div className={styles.excludeDropdown}>
                    {rangeToResults.map((row) => (
                      <button
                        key={row.id}
                        className={styles.excludeOption}
                        onClick={() => { setRangeTo(row.codigos); setRangeToDirty(false); setRangeShowPreview(false); }}
                      >
                        <span className={styles.osNro}>{row.codigos}</span>
                        <span className={styles.osNombre}>
                          Hon. A: {moneyFormatter.format(row.honorarios_a)}
                          <span className={styles.dotSep}>·</span>
                          Gastos: {moneyFormatter.format(row.gastos)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.pctFieldGroup}>
                <label className={styles.fieldLabel}>Porcentaje de ajuste</label>
                <div className={styles.pctInputWrapper}>
                  <input
                    className={`${styles.pctInput} ${
                      rangePctNum !== null && rangePctNum > 0 ? styles.pctInputPositive
                      : rangePctNum !== null && rangePctNum < 0 ? styles.pctInputNegative : ""
                    }`}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={rangePct}
                    onChange={(e) => { setRangePct(e.target.value); setRangeShowPreview(false); }}
                  />
                  <span className={`${styles.pctSymbol} ${
                    rangePctNum !== null && rangePctNum > 0 ? styles.pctSymbolPositive
                    : rangePctNum !== null && rangePctNum < 0 ? styles.pctSymbolNegative : ""
                  }`}>%</span>
                </div>
              </div>

              <div className={styles.pctFieldGroup}>
                <label className={styles.fieldLabel}>
                  <CalendarDays size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Fecha vigencia
                </label>
                <input
                  className={styles.vigenciaInput}
                  type="date"
                  value={rangeFechaVigencia}
                  onChange={(e) => setRangeFechaVigencia(e.target.value)}
                />
              </div>
            </div>

            {rangeFrom.trim() && rangeTo.trim() && rangeRows.length === 0 && (
              <p className={styles.hint} style={{ marginTop: 8 }}>
                No se encontraron códigos entre "{rangeFrom}" y "{rangeTo}".
              </p>
            )}

            {rangeRows.length > 0 && rangePctNum !== null && rangePctNum !== 0 && (
              <div className={`${styles.pctIndicator} ${rangePctNum > 0 ? styles.pctIndicatorUp : styles.pctIndicatorDown}`}>
                {rangePctNum > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                <span>
                  {rangeRows.length} código{rangeRows.length !== 1 ? "s" : ""} en el rango{" "}
                  <strong>{rangeFrom}</strong> – <strong>{rangeTo}</strong>{" "}
                  {rangePctNum > 0 ? `subirán un ${rangePctNum}%` : `bajarán un ${Math.abs(rangePctNum)}%`}
                </span>
              </div>
            )}
          </div>

          <div className={styles.pctActions}>
            <Button
              size="md"
              variant="secondary"
              disabled={rangePctNum === null || rangeRows.length === 0}
              onClick={() => setRangeShowPreview((v) => !v)}
            >
              <span className={styles.buttonInner}>
                {rangeShowPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                {rangeShowPreview ? "Ocultar previa" : "Vista previa"}
              </span>
            </Button>

            <Button
              size="md"
              variant="primary"
              disabled={rangePctNum === null || rangeRows.length === 0 || rangeMutation.isPending}
              onClick={() => void rangeMutation.mutate()}
            >
              <span className={styles.buttonInner}>
                <TrendingUp size={15} />
                {rangeMutation.isPending ? "Aplicando..." : `Aplicar a ${rangeRows.length} código${rangeRows.length !== 1 ? "s" : ""}`}
              </span>
            </Button>
          </div>

          {rangeShowPreview && rangePctNum !== null && rangeRows.length > 0 && (
            <div className={styles.previewSection}>
              <p className={styles.previewHint}>
                Vista previa con <strong>{rangePct}%</strong> — {rangeRows.length} código{rangeRows.length !== 1 ? "s" : ""} entre{" "}
                <strong>{rangeFrom}</strong> y <strong>{rangeTo}</strong>
              </p>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th><th>Hon. A</th><th>Hon. B</th><th>Hon. C</th>
                      <th>Gastos</th><th>Ayud. A</th><th>Ayud. B</th><th>Ayud. C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeRows.map((row) => (
                      <tr key={row.id}>
                        <td className={styles.codeCell}>{row.codigos}</td>
                        {ALL_VALUE_FIELDS.map((f) => (
                          <td key={f}>
                            <span className={styles.oldVal}>{moneyFormatter.format(row[f])}</span>
                            <span className={styles.arrow}> → </span>
                            <strong>{moneyFormatter.format(applyPct(row[f], rangePctNum))}</strong>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 5. Individual code update ────────────────────────────────────── */}
      {selectedNroOS != null && !isLoadingRows && rows.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepBadge}>5</span>
            <div>
              <h2 className={styles.panelTitle}>Actualización por Código</h2>
              <p className={styles.panelDescription}>
                Buscá un código de <strong>{selectedOSName}</strong> y editá
                sus valores individualmente. Los campos B y C se igualan
                automáticamente al campo A.
              </p>
            </div>
          </div>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={17} />
            <input
              className={styles.searchInput}
              placeholder="Buscar código (ej: 420351)..."
              value={codeSearch}
              onChange={(e) => { setCodeSearch(e.target.value); setSelectedRow(null); setEditValues(null); }}
            />
          </div>

          {codeSearch.trim() && foundRows.length === 0 && (
            <p className={styles.hint}>No se encontraron códigos que coincidan con "{codeSearch}".</p>
          )}

          {foundRows.length > 0 && !selectedRow && (
            <div className={styles.osList}>
              {foundRows.map((row) => (
                <button key={row.id} className={styles.osItem} onClick={() => handleSelectRow(row)}>
                  <span className={styles.osNro}>{row.codigos}</span>
                  <span className={styles.osNombre}>
                    Hon. A: {moneyFormatter.format(row.honorarios_a)}
                    <span className={styles.dotSep}>·</span>
                    Gastos: {moneyFormatter.format(row.gastos)}
                    <span className={styles.dotSep}>·</span>
                    Ayud. A: {moneyFormatter.format(row.ayudante_a)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedRow && editValues && (
            <div className={styles.editCard}>
              <div className={styles.editHeader}>
                <div className={styles.editHeaderLeft}>
                  <span className={styles.editCodeLabel}>Código</span>
                  <span className={styles.editCodeBadge}>{selectedRow.codigos}</span>
                </div>
                <button
                  className={styles.clearBtn}
                  onClick={() => { setSelectedRow(null); setEditValues(null); }}
                  aria-label="Cerrar"
                >
                  <XIcon size={16} />
                </button>
              </div>

              <div className={styles.editSections}>
                <div className={`${styles.editGroup} ${styles.editGroupBlue}`}>
                  <p className={styles.editGroupLabel}>Honorarios</p>
                  <div className={styles.editGroupRow}>
                    <div className={styles.editFieldWrap}>
                      <span className={styles.fieldLabel}>A</span>
                      <input className={styles.editInput} type="number" step="0.01" value={editValues.honorarios_a} onChange={(e) => handleEditChange("honorarios_a", e.target.value)} />
                    </div>
                    <span className={styles.derivedArrow}><ArrowRight size={13} /></span>
                    <div className={styles.derivedWrap}>
                      <span className={styles.fieldLabel}>B</span>
                      <span className={styles.derivedBox}>{moneyFormatter.format(derivedHonA)}</span>
                    </div>
                    <span className={styles.derivedArrow}><ArrowRight size={13} /></span>
                    <div className={styles.derivedWrap}>
                      <span className={styles.fieldLabel}>C</span>
                      <span className={styles.derivedBox}>{moneyFormatter.format(derivedHonA)}</span>
                    </div>
                  </div>
                </div>

                <div className={`${styles.editGroup} ${styles.editGroupTeal}`}>
                  <p className={styles.editGroupLabel}>Gastos</p>
                  <div className={styles.editGroupRow}>
                    <div className={styles.editFieldWrap}>
                      <span className={styles.fieldLabel}>Valor</span>
                      <input className={styles.editInput} type="number" step="0.01" value={editValues.gastos} onChange={(e) => handleEditChange("gastos", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className={`${styles.editGroup} ${styles.editGroupGreen}`}>
                  <p className={styles.editGroupLabel}>Ayudante</p>
                  <div className={styles.editGroupRow}>
                    <div className={styles.editFieldWrap}>
                      <span className={styles.fieldLabel}>A</span>
                      <input className={styles.editInput} type="number" step="0.01" value={editValues.ayudante_a} onChange={(e) => handleEditChange("ayudante_a", e.target.value)} />
                    </div>
                    <span className={styles.derivedArrow}><ArrowRight size={13} /></span>
                    <div className={styles.derivedWrap}>
                      <span className={styles.fieldLabel}>B</span>
                      <span className={styles.derivedBox}>{moneyFormatter.format(derivedAydA)}</span>
                    </div>
                    <span className={styles.derivedArrow}><ArrowRight size={13} /></span>
                    <div className={styles.derivedWrap}>
                      <span className={styles.fieldLabel}>C</span>
                      <span className={styles.derivedBox}>{moneyFormatter.format(derivedAydA)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.editActions}>
                <label className={styles.vigenciaField}>
                  <span className={styles.fieldLabel}>
                    <CalendarDays size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    Fecha vigencia
                  </span>
                  <input
                    className={styles.vigenciaInput}
                    type="date"
                    value={editFechaVigencia}
                    onChange={(e) => setEditFechaVigencia(e.target.value)}
                  />
                </label>

                <Button
                  size="md"
                  variant="primary"
                  onClick={() => void saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  <span className={styles.buttonInner}>
                    <Save size={15} />
                    {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Panic modal ─────────────────────────────────────────────────── */}
      {panicOpen && (
        <div className={styles.modalOverlay} onClick={closePanic}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <ShieldAlert size={18} className={styles.modalHeaderIcon} />
                <div>
                  <h2 className={styles.modalTitle}>Panel de Emergencia</h2>
                  <p className={styles.modalSubtitle}>{selectedOSName}</p>
                </div>
              </div>
              <button className={styles.modalClose} onClick={closePanic} aria-label="Cerrar">
                <XIcon size={17} />
              </button>
            </div>

            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${panicTab === "date" ? styles.modalTabActive : ""}`}
                onClick={() => { setPanicTab("date"); setPanicConfirmed(false); }}
              >
                Por fecha de vigencia
              </button>
              <button
                className={`${styles.modalTab} ${panicTab === "code" ? styles.modalTabActive : ""}`}
                onClick={() => { setPanicTab("code"); setPanicConfirmed(false); }}
              >
                Por código específico
              </button>
            </div>

            <div className={styles.modalBody}>

              {panicTab === "date" && (
                <div className={styles.panicSection}>
                  <p className={styles.panicDesc}>
                    Eliminá todos los registros de <strong>{selectedOSName}</strong> que
                    tengan una fecha de vigencia específica.
                  </p>
                  <div className={styles.pctFieldGroup}>
                    <label className={styles.fieldLabel}>
                      <CalendarDays size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                      Fecha cambio
                    </label>
                    <input
                      className={styles.vigenciaInput}
                      type="date"
                      value={panicDate}
                      onChange={(e) => { setPanicDate(e.target.value); setPanicConfirmed(false); }}
                    />
                  </div>

                  {panicDate && panicRowsByDate.length === 0 && (
                    <p className={styles.hint}>No hay registros con fecha {panicDate} para {selectedOSName}.</p>
                  )}

                  {panicRowsByDate.length > 0 && (
                    <div className={styles.tableWrapper} style={{ marginTop: 14 }}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Código</th><th>Hon. A</th><th>Gastos</th><th>Ayud. A</th><th>Fecha vigencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {panicRowsByDate.slice(0, 15).map((row) => (
                            <tr key={row.id}>
                              <td className={styles.codeCell}>{row.codigos}</td>
                              <td>{moneyFormatter.format(row.honorarios_a)}</td>
                              <td>{moneyFormatter.format(row.gastos)}</td>
                              <td>{moneyFormatter.format(row.ayudante_a)}</td>
                              <td>{row.fecha_cambio ?? "—"}</td>
                            </tr>
                          ))}
                          {panicRowsByDate.length > 15 && (
                            <tr><td colSpan={5} className={styles.moreRows}>...y {panicRowsByDate.length - 15} más</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {panicTab === "code" && (
                <div className={styles.panicSection}>
                  <p className={styles.panicDesc}>
                    Buscá un código de <strong>{selectedOSName}</strong> y eliminá ese registro específico.
                  </p>

                  {!panicSelectedRow && (
                    <>
                      <div className={styles.searchBar}>
                        <Search className={styles.searchIcon} size={15} />
                        <input
                          className={styles.searchInput}
                          placeholder="Buscar código..."
                          value={panicCodeSearch}
                          onChange={(e) => { setPanicCodeSearch(e.target.value); setPanicConfirmed(false); }}
                        />
                      </div>

                      {panicCodeSearch.trim() && panicCodeResults.length === 0 && (
                        <p className={styles.hint}>No se encontraron códigos que coincidan con "{panicCodeSearch}".</p>
                      )}

                      {panicCodeResults.length > 0 && (
                        <div className={styles.osList} style={{ marginTop: 8 }}>
                          {panicCodeResults.map((row) => (
                            <button
                              key={row.id}
                              className={styles.osItem}
                              onClick={() => { setPanicSelectedRow(row); setPanicCodeSearch(""); setPanicConfirmed(false); }}
                            >
                              <span className={styles.osNro}>{row.codigos}</span>
                              <span className={styles.osNombre}>
                                Hon. A: {moneyFormatter.format(row.honorarios_a)}
                                <span className={styles.dotSep}>·</span>
                                Gastos: {moneyFormatter.format(row.gastos)}
                                {row.fecha_cambio && (
                                  <><span className={styles.dotSep}>·</span>F. cambio: {row.fecha_cambio}</>
                                )}
                              {row.fecha_vigencia && (
                                  <><span className={styles.dotSep}>·</span>F. vigencia: {row.fecha_vigencia}</>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {panicSelectedRow && (
                    <div className={styles.panicSelectedCard}>
                      <div className={styles.panicSelectedHeader}>
                        <div>
                          <span className={styles.editCodeLabel}>Código seleccionado</span>
                          <span className={styles.editCodeBadge} style={{ marginLeft: 8 }}>{panicSelectedRow.codigos}</span>
                        </div>
                        <button className={styles.clearBtn} onClick={() => { setPanicSelectedRow(null); setPanicConfirmed(false); }}>
                          <XIcon size={15} />
                        </button>
                      </div>
                      <div className={styles.panicSelectedDetails}>
                        <span>Hon. A: <strong>{moneyFormatter.format(panicSelectedRow.honorarios_a)}</strong></span>
                        <span>Gastos: <strong>{moneyFormatter.format(panicSelectedRow.gastos)}</strong></span>
                        <span>Ayud. A: <strong>{moneyFormatter.format(panicSelectedRow.ayudante_a)}</strong></span>
                        {panicSelectedRow.fecha_cambio && (
                          <span>F. cambio: <strong>{panicSelectedRow.fecha_cambio}</strong></span>
                        )}
                        {panicSelectedRow.fecha_vigencia && (
                          <span>F. vigencia: <strong>{panicSelectedRow.fecha_vigencia}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {panicTargets.length > 0 && !panicConfirmed && (
                <button className={styles.panicShowConfirmBtn} onClick={() => setPanicConfirmed(true)}>
                  <Trash2 size={14} />
                  Eliminar {panicTargets.length === 1 ? "este registro" : `estos ${panicTargets.length} registros`}
                </button>
              )}

              {panicTargets.length > 0 && panicConfirmed && (
                <div className={styles.panicConfirmBox}>
                  <div className={styles.panicConfirmWarning}>
                    <AlertTriangle size={16} />
                    <span>
                      {panicTab === "date"
                        ? <>Se eliminarán <strong>{panicTargets.length} registros</strong> con fecha <strong>{panicDate}</strong> de <strong>{selectedOSName}</strong>.</>
                        : <>Se eliminará el registro del código <strong>{panicSelectedRow?.codigos}</strong> de <strong>{selectedOSName}</strong>.</>
                      }
                      {" "}Esta acción no se puede deshacer.
                    </span>
                  </div>
                  <div className={styles.panicConfirmActions}>
                    <button className={styles.deleteCancelBtn} onClick={() => setPanicConfirmed(false)}>Cancelar</button>
                    <button
                      className={styles.deleteConfirmBtn}
                      disabled={panicMutation.isPending}
                      onClick={() => void panicMutation.mutate()}
                    >
                      <Trash2 size={14} />
                      {panicMutation.isPending ? "Eliminando..." : "Sí, eliminar definitivamente"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Pop-up ──────────────────────────────────────────────────────── */}
      {popup && (
        <div className={styles.popupOverlay} onClick={() => setPopup(null)}>
          <div
            className={`${styles.popupBox} ${
              popup.type === "success" ? styles.popupSuccess
              : popup.type === "warn" ? styles.popupWarn
              : styles.popupError
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.popupMessage}>{popup.message}</p>
            <button className={styles.popupClose} onClick={() => setPopup(null)}>
              <XIcon size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
