import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import {
  getJSON,
  patchJSON,
  postJSON,
  putJSON,
} from "../../../lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import BackButton from "../../../components/atoms/BackButton/BackButton";
import Button from "../../../components/atoms/Button/Button";
import Card from "../../../components/atoms/Card/Card";
import SelectableTable from "../../../components/molecules/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "../../../components/molecules/SelectableTable/types";
import styles from "./LoteDetalle.module.scss";
import {
  type LoteAjuste,
  type Ajuste,
  type AtencionSearchRow,
  fmt,
  mesLabel,
} from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const OBSERVACION_OPTIONS = [
  "Falta firma",
  "Falta sello",
  "Diferencia de valores",
  "Falta datos",
  "Otro",
];

const LOTE_URL = (id: string | number) => `/api/lotes/snaps/${id}`;
const ITEMS_URL = (id: string | number) => `/api/lotes/snaps/${id}/items`;
const ITEM_URL = (loteId: string | number, ajusteId: number) =>
  `/api/lotes/snaps/${loteId}/items/${ajusteId}`;
const ESTADO_URL = (id: string | number) => `/api/lotes/snaps/${id}/estado`;
const BUSCAR_ATENCIONES_URL = "/api/lotes/snaps/buscar_atenciones";

type EditForm = { tipo: "d" | "c"; honorarios: string; gastos: string; observacion: string };

const estadoLabel = (e: string) => {
  if (e === "A") return "Abierto";
  if (e === "C") return "Cerrado";
  if (e === "L") return "En Liquidaciones";
  if (e === "AP") return "Aplicado";
  return e;
};

const transitionLabels: Record<string, string> = {
  cerrar: "Cerrar Lote",
  reabrir: "Reabrir Lote",
  en_liquidaciones: "Pasar a Liquidaciones",
  quitar: "Quitar del Pago",
};

const transitionDescriptions: Record<string, string> = {
  cerrar:
    "¿Cerrar este lote? No se podrán agregar, editar ni eliminar ajustes.",
  reabrir: "¿Reabrir este lote? Volverá al estado Abierto para editar ajustes.",
  en_liquidaciones:
    "¿Asignar este lote al pago abierto? Se vinculará al pago actual.",
  quitar: "¿Quitar este lote del pago? Volverá al estado Cerrado.",
};

const LoteDetalle: React.FC = () => {
  const { pagoId, loteId } = useParams<{ pagoId: string; loteId: string }>();
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const [searchParams] = useSearchParams();
  const backTab = searchParams.get("from") ?? "lotes";

  const [lote, setLote] = useState<LoteAjuste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search panel (only when open)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AtencionSearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAtencion, setSelectedAtencion] =
    useState<AtencionSearchRow | null>(null);
  const [newTipo, setNewTipo] = useState<"d" | "c">("d");
  const [newHonorarios, setNewHonorarios] = useState("");
  const [newGastos, setNewGastos] = useState("");
  const [newObservacion, setNewObservacion] = useState("");
  const [newObsIsOtro, setNewObsIsOtro] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const atencionesCacheRef = useRef<Map<number, AtencionSearchRow>>(new Map());
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Ajuste | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    tipo: "d",
    honorarios: "",
    gastos: "",
    observacion: "",
  });
  const [editSaving, setEditSaving] = useState(false);


  // State transition
  const [transitionModal, setTransitionModal] = useState<
    "cerrar" | "reabrir" | "en_liquidaciones" | "quitar" | null
  >(null);
  const [transitioning, setTransitioning] = useState(false);

  const loadLote = useCallback(async () => {
    if (!loteId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<LoteAjuste>(LOTE_URL(loteId));
      setLote(data);
      console.log(data);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el lote.");
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    loadLote();
  }, [loadLote]);

  // Debounced search
  useEffect(() => {
    if (!lote || !searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const qs = new URLSearchParams({
          obra_social_id: String(lote.obra_social_id),
          mes_periodo: String(lote.mes_periodo),
          anio_periodo: String(lote.anio_periodo),
          q: searchQuery,
          limit: "50",
        });
        const data = await getJSON<AtencionSearchRow[]>(
          `${BUSCAR_ATENCIONES_URL}?${qs}`,
        );
        setSearchResults(data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, lote]);

  const handleSelectAtencion = (row: AtencionSearchRow) => {
    setSelectedAtencion(row);
    setNewHonorarios(String(row.valor_cirujia));
    setNewGastos("0");
    atencionesCacheRef.current.set(row.id, row);
  };

  const handleConfirm = async () => {
    if (!loteId) return;
    if (!selectedAtencion) {
      notify("Seleccioná una prestación de la tabla.", "error");
      return;
    }
    if (!newHonorarios || isNaN(Number(newHonorarios)) || Number(newHonorarios) < 0) {
      notify("Los honorarios deben ser un valor válido.", "error");
      return;
    }
    if (!newGastos || isNaN(Number(newGastos)) || Number(newGastos) < 0) {
      notify("Los gastos deben ser un valor válido.", "error");
      return;
    }
    if (Number(newHonorarios) === 0 && Number(newGastos) === 0) {
      notify("Honorarios y gastos no pueden ser ambos 0.", "error");
      return;
    }
    setConfirming(true);
    try {
      await postJSON(ITEMS_URL(loteId), {
        tipo: newTipo,
        id_atencion: selectedAtencion.id,
        honorarios: Number(newHonorarios),
        gastos: Number(newGastos),
        observacion: newObservacion.trim() || null,
      });
      await loadLote();
      setSelectedAtencion(null);
      setSearchQuery("");
      setSearchResults([]);
      setNewHonorarios("");
      setNewGastos("");
      setNewObservacion("");
      setNewObsIsOtro(false);
      setNewTipo("d");
      notify("Ajuste agregado correctamente.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al agregar ajuste."),
        "error",
      );
    } finally {
      setConfirming(false);
    }
  };

  const openEdit = (a: Ajuste) => {
    setEditTarget(a);
    setEditForm({
      tipo: a.tipo as "d" | "c",
      honorarios: String(a.honorarios),
      gastos: String(a.gastos),
      observacion: a.observacion ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!loteId || !editTarget) return;
    if (!editForm.honorarios || isNaN(Number(editForm.honorarios)) || Number(editForm.honorarios) < 0) {
      notify("Los honorarios deben ser un valor válido.", "error");
      return;
    }
    if (!editForm.gastos || isNaN(Number(editForm.gastos)) || Number(editForm.gastos) < 0) {
      notify("Los gastos deben ser un valor válido.", "error");
      return;
    }
    if (Number(editForm.honorarios) === 0 && Number(editForm.gastos) === 0) {
      notify("Honorarios y gastos no pueden ser ambos 0.", "error");
      return;
    }
    setEditSaving(true);
    try {
      await putJSON(ITEM_URL(loteId, editTarget.id), {
        tipo: editForm.tipo,
        honorarios: Number(editForm.honorarios),
        gastos: Number(editForm.gastos),
        observacion: editForm.observacion.trim() || null,
      });
      setEditTarget(null);
      await loadLote();
      notify("Ajuste actualizado.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al guardar."),
        "error",
      );
    } finally {
      setEditSaving(false);
    }
  };


  const handleTransition = async () => {
    if (!loteId || !transitionModal) return;
    setTransitioning(true);
    const estadoMap: Record<string, "A" | "C" | "L"> = {
      cerrar: "C",
      reabrir: "A",
      en_liquidaciones: "L",
      quitar: "C",
    };
    try {
      const res = await patchJSON<LoteAjuste>(ESTADO_URL(loteId), {
        estado: estadoMap[transitionModal],
      });
      setLote(res);
      setTransitionModal(null);
      notify(
        `Lote ${transitionLabels[transitionModal].toLowerCase()} correctamente.`,
      );
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string" ? detail : (e?.message ?? "Error."),
        "error",
      );
    } finally {
      setTransitioning(false);
    }
  };

  const exportExcel = async () => {
    if (!lote) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ajustes");
    ws.columns = [
      { header: "Tipo", key: "tipo", width: 10 },
      { header: "Nro Orden", key: "nro_consulta", width: 14 },
      { header: "Socio", key: "socio", width: 30 },
      { header: "Código Prest.", key: "codigo_prestacion", width: 16 },
      { header: "Fecha", key: "fecha_prestacion", width: 14 },
      { header: "Afiliado", key: "nombre_afiliado", width: 26 },
      { header: "Honorarios", key: "honorarios", width: 14 },
      { header: "Gastos", key: "gastos", width: 14 },
      { header: "Total", key: "total", width: 14 },
      { header: "Observación", key: "observacion", width: 30 },
    ] as ExcelJS.Column[];
    (lote.ajustes ?? []).forEach((a) => {
      const cached = a.id_atencion
        ? atencionesCacheRef.current.get(a.id_atencion)
        : null;
      const nroConsulta = a.nro_consulta ?? cached?.nro_consulta;
      const nombrePrestador = a.nombre_prestador ?? cached?.nombre_prestador;
      const nroSocio = a.nro_socio ?? cached?.nro_socio;
      ws.addRow({
        tipo: a.tipo === "d" ? "Débito" : "Crédito",
        nro_consulta: nroConsulta ?? a.id_atencion ?? "—",
        socio: nombrePrestador
          ? `${nroSocio ?? ""} ${nombrePrestador}`.trim()
          : `Médico ${a.medico_id}`,
        codigo_prestacion:
          a.codigo_prestacion ?? cached?.codigo_prestacion ?? "—",
        fecha_prestacion: a.fecha_prestacion ?? cached?.fecha_prestacion ?? "—",
        nombre_afiliado: a.nombre_afiliado ?? cached?.nombre_afiliado ?? "—",
        honorarios: Number(a.honorarios),
        gastos: Number(a.gastos),
        total: Number(a.total),
        observacion: a.observacion ?? "",
      });
    });
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `lote_${loteId}_ajustes.xlsx`,
    );
  };

  const exportPDF = () => {
    if (!lote) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    doc.text(`Lote ${loteId} — OS ${lote.obra_social_id} · ${periodo}`, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [
        [
          "Tipo",
          "Nro Orden",
          "Socio",
          "Código",
          "Fecha",
          "Honorarios",
          "Gastos",
          "Total",
          "Observación",
        ],
      ],
      body: (lote.ajustes ?? []).map((a) => {
        const cached = a.id_atencion
          ? atencionesCacheRef.current.get(a.id_atencion)
          : null;
        const nroConsulta = a.nro_consulta ?? cached?.nro_consulta;
        const nombrePrestador = a.nombre_prestador ?? cached?.nombre_prestador;
        const nroSocio = a.nro_socio ?? cached?.nro_socio;
        return [
          a.tipo === "d" ? "Débito" : "Crédito",
          nroConsulta ?? a.id_atencion ?? "—",
          nombrePrestador
            ? `${nroSocio ?? ""} ${nombrePrestador}`.trim()
            : `Médico ${a.medico_id}`,
          a.codigo_prestacion ?? cached?.codigo_prestacion ?? "—",
          a.fecha_prestacion ?? cached?.fecha_prestacion ?? "—",
          `$${fmt(a.honorarios)}`,
          `$${fmt(a.gastos)}`,
          `$${fmt(a.total)}`,
          a.observacion ?? "—",
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 86, 255] },
    });
    doc.save(`lote_${loteId}_ajustes.pdf`);
  };

  const isOpen = lote?.estado === "A";
  const isClosed = lote?.estado === "C";
  const isInLiq = lote?.estado === "L";
  const isApplied = lote?.estado === "AP";
  const ajustes = lote?.ajustes ?? [];
  const periodo = lote
    ? `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`
    : "—";

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <BackButton />
              <div className={styles.breadcrumb}>
                LIQUIDACIÓN{pagoId ? ` / PAGO ${pagoId}` : ""} /{" "}
                {lote?.tipo === "refacturacion" ? "REFACTURACIONES" : "LOTES"} /
                LOTE {loteId}
              </div>
              <h1 className={styles.title}>
                Lote {loteId} — OS {lote?.obra_social_id ?? "…"} · {periodo}
              </h1>
              {lote && (
                <div className={styles.chips}>
                  <span
                    className={`${styles.chip} ${lote.tipo === "refacturacion" ? styles.chipRefac : ""}`}
                  >
                    {lote.tipo === "refacturacion" ? "Refacturación" : "Normal"}
                  </span>
                  {lote.snap_origen_id && (
                    <span
                      className={styles.chip}
                      style={{ fontSize: 11, color: "#64748b" }}
                    >
                      Corrige lote #{lote.snap_origen_id}
                    </span>
                  )}
                  <span
                    className={`${styles.estadoBadge} ${styles[`estado${lote.estado}`]}`}
                  >
                    {estadoLabel(lote.estado)}
                  </span>
                  {lote.pago_id && (
                    <span className={styles.chip} style={{ fontSize: 11 }}>
                      Pago #{lote.pago_id}
                    </span>
                  )}
                  <span className={`${styles.chip} ${styles.chipRed}`}>
                    Débitos: -${fmt(lote.total_debitos)}
                  </span>
                  <span className={`${styles.chip} ${styles.chipGreen}`}>
                    Créditos: +${fmt(lote.total_creditos)}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.headerActions}>
              {!isApplied && isOpen && (
                <Button
                  variant="secondary"
                  onClick={() => setTransitionModal("cerrar")}
                >
                  Cerrar Lote
                </Button>
              )}
              {!isApplied && isClosed && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setTransitionModal("reabrir")}
                  >
                    Reabrir
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setTransitionModal("en_liquidaciones")}
                  >
                    Pasar a Liquidaciones
                  </Button>
                </>
              )}
              {!isApplied && isInLiq && (
                <Button
                  variant="secondary"
                  onClick={() => setTransitionModal("quitar")}
                >
                  Quitar del Pago
                </Button>
              )}
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Panel 1: Search + Form (only when open and not applied) */}
          {isOpen && !isApplied && !loading && (
            <Card className={styles.searchPanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Buscar prestación</span>
              </div>

              {/* Search input */}
              <div className={styles.searchRow}>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Buscar por Nro de orden, Nro de socio o nombre del socio…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedAtencion(null);
                  }}
                />
              </div>

              {/* Results table */}
              <div className={styles.resultsWrap}>
                <table className={`${styles.table} ${styles.tableSearch}`}>
                  <thead>
                    <tr>
                      <th>Nro Orden</th>
                      <th>Socio</th>
                      <th>Código</th>
                      <th>Fecha</th>
                      <th>Afiliado</th>
                      <th className={styles.numCell}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchLoading && (
                      <tr>
                        <td colSpan={6} className={styles.emptyCell}>
                          Buscando…
                        </td>
                      </tr>
                    )}
                    {!searchLoading &&
                      searchQuery.length >= 2 &&
                      searchResults.length === 0 && (
                        <tr>
                          <td colSpan={6} className={styles.emptyCell}>
                            Sin resultados para "{searchQuery}".
                          </td>
                        </tr>
                      )}
                    {!searchLoading && searchQuery.length < 2 && (
                      <tr>
                        <td colSpan={6} className={styles.emptyCell}>
                          Ingresá al menos 2 caracteres para buscar.
                        </td>
                      </tr>
                    )}
                    {!searchLoading &&
                      searchResults.map((row) => (
                        <tr
                          key={row.id}
                          className={`${styles.clickableRow} ${selectedAtencion?.id === row.id ? styles.selectedRow : ""}`}
                          onClick={() => handleSelectAtencion(row)}
                        >
                          <td>{row.nro_consulta}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>
                              {row.nombre_prestador}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              #{row.nro_socio}
                            </div>
                          </td>
                          <td>{row.codigo_prestacion}</td>
                          <td>{row.fecha_prestacion}</td>
                          <td>{row.nombre_afiliado}</td>
                          <td className={styles.numCell}>
                            ${fmt(row.valor_cirujia)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Inline form */}
              <div className={styles.formInline}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Honorarios</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newHonorarios}
                    onChange={(e) => setNewHonorarios(e.target.value)}
                    disabled={confirming}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Gastos</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newGastos}
                    onChange={(e) => setNewGastos(e.target.value)}
                    disabled={confirming}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipo</label>
                  <div className={styles.tipoToggle}>
                    <button
                      type="button"
                      className={`${styles.tipoBtn} ${newTipo === "d" ? styles.tipoBtnActive : ""}`}
                      onClick={() => setNewTipo("d")}
                      disabled={confirming}
                    >
                      Débito
                    </button>
                    <button
                      type="button"
                      className={`${styles.tipoBtn} ${newTipo === "c" ? styles.tipoBtnActiveC : ""}`}
                      onClick={() => setNewTipo("c")}
                      disabled={confirming}
                    >
                      Crédito
                    </button>
                  </div>
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupGrow}`}>
                  <label className={styles.formLabel}>Observación</label>
                  {newObsIsOtro ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className={styles.formInput}
                        type="text"
                        placeholder="Escribí el motivo…"
                        value={newObservacion}
                        onChange={(e) => setNewObservacion(e.target.value)}
                        disabled={confirming}
                        autoFocus
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewObsIsOtro(false);
                          setNewObservacion("");
                        }}
                        disabled={confirming}
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ← Volver
                      </button>
                    </div>
                  ) : (
                    <Autocomplete
                      options={OBSERVACION_OPTIONS}
                      value={newObservacion || null}
                      onChange={(_, val) => {
                        if (val === "Otro") {
                          setNewObsIsOtro(true);
                          setNewObservacion("");
                        } else {
                          setNewObservacion(val ?? "");
                        }
                      }}
                      disabled={confirming}
                      noOptionsText="Sin resultados"
                      slotProps={{ popper: { style: { zIndex: 10000 } } }}
                      sx={{ width: "100%" }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Seleccioná un motivo… (opcional)"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: 13,
                              borderRadius: "6px",
                              backgroundColor: "#fff",
                              padding: "1px 8px 1px 4px !important",
                              "& fieldset": { borderColor: "#cbd5e1" },
                              "&:hover fieldset": { borderColor: "#94a3b8" },
                              "&.Mui-focused fieldset": {
                                borderColor: "#1b56ff",
                                borderWidth: "1px",
                                boxShadow: "0 0 0 3px rgba(27,86,255,0.1)",
                              },
                            },
                            "& .MuiAutocomplete-input": {
                              padding: "6px 4px !important",
                              fontSize: "13px",
                            },
                          }}
                        />
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Submit row */}
              <div className={styles.submitRow}>
                {selectedAtencion && (
                  <span className={styles.selectedBadge}>
                    ✓ Seleccionado: {selectedAtencion.nro_consulta} —{" "}
                    {selectedAtencion.nombre_prestador}
                  </span>
                )}
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={confirming || !selectedAtencion}
                >
                  {confirming ? "Guardando…" : "Confirmar"}
                </Button>
              </div>
            </Card>
          )}

          {/* Panel 2: Ajustes table */}
          <Card className={styles.tableCard}>
            <div className={styles.panelToolbar}>
              <span className={styles.panelTitle}>
                Ajustes del lote
                {ajustes.length > 0 && (
                  <span className={styles.countBadge}>{ajustes.length}</span>
                )}
              </span>
              <div className={styles.exportActions}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportPDF}
                  disabled={ajustes.length === 0}
                >
                  Exportar PDF
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={exportExcel}
                  disabled={ajustes.length === 0}
                >
                  Exportar Excel
                </Button>
              </div>
            </div>
            <SelectableTable
              rows={ajustes}
              columns={[
                {
                  key: "tipo",
                  header: "Tipo",
                  render: (a) => (
                    <span className={`${styles.tipoBadge} ${a.tipo === "d" ? styles.tipoD : styles.tipoC}`}>
                      {a.tipo === "d" ? "Débito" : "Crédito"}
                    </span>
                  ),
                },
                {
                  key: "nro_consulta",
                  header: "Nro Orden",
                  render: (a) => {
                    const cached = a.id_atencion ? atencionesCacheRef.current.get(a.id_atencion) : null;
                    const nroConsulta = a.nro_consulta ?? cached?.nro_consulta ?? null;
                    return nroConsulta ?? a.id_atencion ?? <span style={{ color: "#94a3b8" }}>—</span>;
                  },
                },
                {
                  key: "nombre_prestador",
                  header: "Socio",
                  render: (a) => {
                    const cached = a.id_atencion ? atencionesCacheRef.current.get(a.id_atencion) : null;
                    const nombrePrestador = a.nombre_prestador ?? cached?.nombre_prestador ?? null;
                    const nroSocio = a.nro_socio ?? cached?.nro_socio ?? null;
                    return nombrePrestador ? (
                      <>
                        <div style={{ fontWeight: 500 }}>{nombrePrestador}</div>
                        {nroSocio && <div style={{ fontSize: 11, color: "#64748b" }}>#{nroSocio}</div>}
                      </>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>Médico {a.medico_id}</span>
                    );
                  },
                },
                {
                  key: "codigo_prestacion",
                  header: "Código",
                  render: (a) => {
                    const cached = a.id_atencion ? atencionesCacheRef.current.get(a.id_atencion) : null;
                    return (a.codigo_prestacion ?? cached?.codigo_prestacion) ?? <span style={{ color: "#94a3b8" }}>—</span>;
                  },
                },
                {
                  key: "fecha_prestacion",
                  header: "Fecha",
                  render: (a) => {
                    const cached = a.id_atencion ? atencionesCacheRef.current.get(a.id_atencion) : null;
                    return (a.fecha_prestacion ?? cached?.fecha_prestacion) ?? <span style={{ color: "#94a3b8" }}>—</span>;
                  },
                },
                {
                  key: "nombre_afiliado",
                  header: "Afiliado",
                  render: (a) => {
                    const cached = a.id_atencion ? atencionesCacheRef.current.get(a.id_atencion) : null;
                    return (a.nombre_afiliado ?? cached?.nombre_afiliado) ?? <span style={{ color: "#94a3b8" }}>—</span>;
                  },
                },
                {
                  key: "honorarios",
                  header: "Honorarios",
                  alignRight: true,
                  render: (a) => <span>${fmt(a.honorarios)}</span>,
                },
                {
                  key: "gastos",
                  header: "Gastos",
                  alignRight: true,
                  render: (a) => <span>${fmt(a.gastos)}</span>,
                },
                {
                  key: "total",
                  header: "Total",
                  alignRight: true,
                  render: (a) => (
                    <span className={a.tipo === "d" ? styles.negative : styles.positive}>
                      {a.tipo === "d" ? "-" : "+"}${fmt(a.total)}
                    </span>
                  ),
                },
                {
                  key: "observacion",
                  header: "Observación",
                  render: (a) => (
                    <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {a.observacion ?? <span style={{ color: "#94a3b8" }}>—</span>}
                    </span>
                  ),
                },
                ...(isOpen && !isApplied ? [{
                  key: "acciones",
                  header: "Acciones",
                  render: (a: Ajuste) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(a); }}
                    >
                      Editar
                    </Button>
                  ),
                }] : []),
              ]}
              actions={isOpen && !isApplied ? [
                {
                  label: "Eliminar",
                  method: "DELETE" as const,
                  endpoint: (a: Ajuste) => ITEM_URL(loteId!, a.id),
                  confirmMessage: (n: number) => `¿Eliminar ${n} ajuste${n !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
                  onSuccess: (ok: number, fail: number) => {
                    if (ok) notify(`${ok} ajuste${ok !== 1 ? "s eliminados" : " eliminado"}.`);
                    if (fail) notify(`${fail} no pudo${fail !== 1 ? "ron" : ""} eliminarse.`, "error");
                  },
                },
              ] : []}
              isSelectable={() => isOpen && !isApplied}
              emptyMessage="Sin ajustes en este lote."
              loading={loading}
              onActionComplete={loadLote}
            />
            {ajustes.length > 0 && lote && (
              <div className={styles.totalsRow}>
                <span>TOTAL ({ajustes.length} ajustes)</span>
                <span>
                  <span className={styles.negative}>-${fmt(lote.total_debitos)}</span>
                  {" / "}
                  <span className={styles.positive}>+${fmt(lote.total_creditos)}</span>
                </span>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Editar Ajuste #{editTarget.id}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setEditTarget(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Tipo</label>
                <div className={styles.tipoToggle}>
                  <button
                    type="button"
                    className={`${styles.tipoBtn} ${editForm.tipo === "d" ? styles.tipoBtnActive : ""}`}
                    onClick={() => setEditForm((f) => ({ ...f, tipo: "d" }))}
                    disabled={editSaving}
                  >
                    Débito
                  </button>
                  <button
                    type="button"
                    className={`${styles.tipoBtn} ${editForm.tipo === "c" ? styles.tipoBtnActiveC : ""}`}
                    onClick={() => setEditForm((f) => ({ ...f, tipo: "c" }))}
                    disabled={editSaving}
                  >
                    Crédito
                  </button>
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Honorarios</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.honorarios}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, honorarios: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Gastos</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.gastos}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, gastos: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Observación</label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="Motivo del ajuste…"
                  value={editForm.observacion}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, observacion: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setEditTarget(null)}
                disabled={editSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleEditSave}
                disabled={editSaving}
              >
                {editSaving ? "Guardando…" : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transition modal */}
      {transitionModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>{transitionLabels[transitionModal]}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setTransitionModal(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {!transitioning && (
                <p>{transitionDescriptions[transitionModal]}</p>
              )}
              {transitioning && <p style={{ color: "#64748b" }}>Procesando…</p>}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setTransitionModal(null)}
                disabled={transitioning}
              >
                Cancelar
              </Button>
              <Button
                variant={transitionModal === "quitar" ? "danger" : "primary"}
                onClick={handleTransition}
                disabled={transitioning}
              >
                {transitioning ? "Procesando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoteDetalle;
