import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  fmt,
  mesLabel,
} from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const LOTE_URL = (id: string | number) => `/api/lotes/snaps/${id}`;
const ITEMS_URL = (id: string | number) => `/api/lotes/snaps/${id}/items`;
const ITEM_URL = (loteId: string | number, ajusteId: number) =>
  `/api/lotes/snaps/${loteId}/items/${ajusteId}`;
const ESTADO_URL = (id: string | number) => `/api/lotes/snaps/${id}/estado`;
const MEDICOS_SEARCH_URL = (q: string) =>
  `/api/medicos?q=${encodeURIComponent(q)}&limit=20&skip=0`;

type MedicoResult = {
  id: number;
  nro_socio: number | null;
  nombre: string;
};

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
  cerrar: "¿Cerrar este lote? No se podrán agregar, editar ni eliminar ajustes.",
  reabrir: "¿Reabrir este lote? Volverá al estado Abierto para editar ajustes.",
  en_liquidaciones: "¿Asignar este lote al pago abierto? Se vinculará al pago actual.",
  quitar: "¿Quitar este lote del pago? Volverá al estado Cerrado.",
};

const LoteDetalleSinFactura: React.FC = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [lote, setLote] = useState<LoteAjuste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [medicoQuery, setMedicoQuery] = useState("");
  const [medicoResults, setMedicoResults] = useState<MedicoResult[]>([]);
  const [medicoLoading, setMedicoLoading] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState<MedicoResult | null>(null);
  const [showMedicoDropdown, setShowMedicoDropdown] = useState(false);
  const [newTipo, setNewTipo] = useState<"d" | "c">("d");
  const [newHonorarios, setNewHonorarios] = useState("");
  const [newGastos, setNewGastos] = useState("");
  const [newObservacion, setNewObservacion] = useState("");
  const [confirming, setConfirming] = useState(false);
  const medicoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medicoInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Ajuste | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ tipo: "d", honorarios: "", gastos: "", observacion: "" });
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
      console.log("[LoteDetalleSinFactura] lote:", data);
      console.log("[LoteDetalleSinFactura] ajustes:", data.ajustes);
      setLote(data);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el lote.");
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    loadLote();
  }, [loadLote]);

  // Debounced medico search
  useEffect(() => {
    if (!medicoQuery.trim() || medicoQuery.length < 2) {
      setMedicoResults([]);
      setShowMedicoDropdown(false);
      return;
    }
    if (medicoDebounceRef.current) clearTimeout(medicoDebounceRef.current);
    medicoDebounceRef.current = setTimeout(async () => {
      setMedicoLoading(true);
      try {
        const data = await getJSON<MedicoResult[]>(MEDICOS_SEARCH_URL(medicoQuery));
        setMedicoResults(data ?? []);
        setShowMedicoDropdown(true);
      } catch {
        setMedicoResults([]);
      } finally {
        setMedicoLoading(false);
      }
    }, 300);
    return () => {
      if (medicoDebounceRef.current) clearTimeout(medicoDebounceRef.current);
    };
  }, [medicoQuery]);

  const handleSelectMedico = (m: MedicoResult) => {
    setSelectedMedico(m);
    setMedicoQuery(m.nro_socio != null ? `${m.nro_socio} — ${m.nombre}` : m.nombre);
    setShowMedicoDropdown(false);
  };

  const handleConfirm = async () => {
    if (!loteId) return;
    if (!selectedMedico) {
      notify("Seleccioná un socio.", "error");
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
        medico_id: selectedMedico.id,
        honorarios: Number(newHonorarios),
        gastos: Number(newGastos),
        observacion: newObservacion.trim() || null,
      });
      await loadLote();
      setSelectedMedico(null);
      setMedicoQuery("");
      setMedicoResults([]);
      setNewHonorarios("");
      setNewGastos("");
      setNewObservacion("");
      setNewTipo("d");
      notify("Ajuste agregado correctamente.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string" ? detail : (e?.message ?? "Error al agregar ajuste."),
        "error",
      );
    } finally {
      setConfirming(false);
    }
  };

  const openEdit = (a: Ajuste) => {
    setEditTarget(a);
    setEditForm({ tipo: a.tipo as "d" | "c", honorarios: String(a.honorarios), gastos: String(a.gastos), observacion: a.observacion ?? "" });
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
        typeof detail === "string" ? detail : (e?.message ?? "Error al guardar."),
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
      notify(`Lote ${transitionLabels[transitionModal].toLowerCase()} correctamente.`);
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
      { header: "Médico ID", key: "medico_id", width: 12 },
      { header: "Honorarios", key: "honorarios", width: 14 },
      { header: "Gastos", key: "gastos", width: 14 },
      { header: "Total", key: "total", width: 14 },
      { header: "Observación", key: "observacion", width: 30 },
    ] as ExcelJS.Column[];
    (lote.ajustes ?? []).forEach((a) => {
      ws.addRow({
        tipo: a.tipo === "d" ? "Débito" : "Crédito",
        medico_id: a.medico_id,
        honorarios: Number(a.honorarios),
        gastos: Number(a.gastos),
        total: Number(a.total),
        observacion: a.observacion ?? "",
      });
    });
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `lote_sf_${loteId}_ajustes.xlsx`,
    );
  };

  const exportPDF = () => {
    if (!lote) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    doc.text(`Lote Sin Factura ${loteId} — OS ${lote.obra_social_id} · ${periodo}`, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Tipo", "Médico ID", "Honorarios", "Gastos", "Total", "Observación"]],
      body: (lote.ajustes ?? []).map((a) => [
        a.tipo === "d" ? "Débito" : "Crédito",
        String(a.medico_id),
        `$${fmt(a.honorarios)}`,
        `$${fmt(a.gastos)}`,
        `$${fmt(a.total)}`,
        a.observacion ?? "—",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 86, 255] },
    });
    doc.save(`lote_sf_${loteId}_ajustes.pdf`);
  };

  const isOpen = lote?.estado === "A";
  const isClosed = lote?.estado === "C";
  const isInLiq = lote?.estado === "L";
  const isApplied = lote?.estado === "AP";
  const ajustes = lote?.ajustes ?? [];
  const periodo = lote ? `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}` : "—";

  const columns: ColumnDef<Ajuste>[] = [
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
      key: "medico_id",
      header: "Socio",
      render: (a) => (
        a.nombre_prestador ? (
          <>
            <div style={{ fontWeight: 500 }}>{a.nombre_prestador}</div>
            {a.nro_socio != null && <div style={{ fontSize: 11, color: "#64748b" }}>#{a.nro_socio}</div>}
          </>
        ) : (
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>#{a.nro_socio ?? a.medico_id}</span>
        )
      ),
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
        <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
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
  ];

  const actions: ActionDef<Ajuste>[] = isOpen && !isApplied ? [
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
  ] : [];

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
                LIQUIDACIÓN / DÉBITOS Y CRÉDITOS / LOTE SIN FACTURA {loteId}
              </div>
              <h1 className={styles.title}>
                Lote {loteId} — OS {lote?.obra_social_id ?? "…"} · {periodo}
              </h1>
              {lote && (
                <div className={styles.chips}>
                  <span className={`${styles.chip}`} style={{ background: "#f3e8ff", color: "#6d28d9", borderColor: "#ddd6fe" }}>
                    Sin Factura
                  </span>
                  <span className={`${styles.estadoBadge} ${styles[`estado${lote.estado}`]}`}>
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
                <Button variant="secondary" onClick={() => setTransitionModal("cerrar")}>
                  Cerrar Lote
                </Button>
              )}
              {!isApplied && isClosed && (
                <>
                  <Button variant="secondary" onClick={() => setTransitionModal("reabrir")}>
                    Reabrir
                  </Button>
                  <Button variant="primary" onClick={() => setTransitionModal("en_liquidaciones")}>
                    Pasar a Liquidaciones
                  </Button>
                </>
              )}
              {!isApplied && isInLiq && (
                <Button variant="secondary" onClick={() => setTransitionModal("quitar")}>
                  Quitar del Pago
                </Button>
              )}
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Panel: Add form (only when open) */}
          {isOpen && !isApplied && !loading && (
            <Card className={styles.searchPanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Agregar ajuste</span>
              </div>

              <div className={styles.formInline}>
                {/* Socio search */}
                <div className={`${styles.formGroup} ${styles.formGroupGrow}`} style={{ position: "relative" }}>
                  <label className={styles.formLabel}>Socio</label>
                  <input
                    ref={medicoInputRef}
                    className={styles.formInput}
                    type="text"
                    placeholder="Buscar por nro. socio o nombre…"
                    value={medicoQuery}
                    onChange={(e) => {
                      setMedicoQuery(e.target.value);
                      setSelectedMedico(null);
                    }}
                    disabled={confirming}
                    autoComplete="off"
                  />
                  {showMedicoDropdown && (
                    <div className={styles.autocompleteDropdown}>
                      {medicoLoading && (
                        <div className={styles.acItem} style={{ color: "#94a3b8" }}>
                          Buscando…
                        </div>
                      )}
                      {!medicoLoading && medicoResults.length === 0 && (
                        <div className={styles.acItem} style={{ color: "#94a3b8" }}>
                          Sin resultados.
                        </div>
                      )}
                      {!medicoLoading &&
                        medicoResults.map((m) => (
                          <div
                            key={m.id}
                            className={styles.acItem}
                            onMouseDown={() => handleSelectMedico(m)}
                          >
                            <span style={{ fontWeight: 500 }}>
                              {m.nro_socio != null ? `#${m.nro_socio}` : `ID ${m.id}`}
                            </span>{" "}
                            — {m.nombre}
                          </div>
                        ))}
                    </div>
                  )}
                  {selectedMedico && (
                    <div className={styles.medicoSelected}>
                      ✓ Socio seleccionado
                    </div>
                  )}
                </div>

                {/* Tipo */}
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

                {/* Honorarios */}
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

                {/* Gastos */}
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

                {/* Observacion */}
                <div className={`${styles.formGroup} ${styles.formGroupGrow}`}>
                  <label className={styles.formLabel}>Observación</label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Motivo del ajuste… (opcional)"
                    value={newObservacion}
                    onChange={(e) => setNewObservacion(e.target.value)}
                    disabled={confirming}
                  />
                </div>
              </div>

              <div className={styles.submitRow}>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={confirming || !selectedMedico}
                >
                  {confirming ? "Guardando…" : "Confirmar"}
                </Button>
              </div>
            </Card>
          )}

          {/* Ajustes table */}
          <Card className={styles.tableCard}>
            <div className={styles.panelToolbar}>
              <span className={styles.panelTitle}>
                Ajustes del lote
                {ajustes.length > 0 && (
                  <span className={styles.countBadge}>{ajustes.length}</span>
                )}
              </span>
              <div className={styles.exportActions}>
                <Button variant="secondary" size="sm" onClick={exportPDF} disabled={ajustes.length === 0}>
                  Exportar PDF
                </Button>
                <Button variant="success" size="sm" onClick={exportExcel} disabled={ajustes.length === 0}>
                  Exportar Excel
                </Button>
              </div>
            </div>
            <SelectableTable
              rows={ajustes}
              columns={columns}
              actions={actions}
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
              <button className={styles.modalClose} onClick={() => setEditTarget(null)} aria-label="Cerrar">
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
                  onChange={(e) => setEditForm((f) => ({ ...f, honorarios: e.target.value }))}
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
                  onChange={(e) => setEditForm((f) => ({ ...f, gastos: e.target.value }))}
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
                  onChange={(e) => setEditForm((f) => ({ ...f, observacion: e.target.value }))}
                  disabled={editSaving}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={editSaving}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleEditSave} disabled={editSaving}>
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
              <button className={styles.modalClose} onClick={() => setTransitionModal(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {!transitioning && <p>{transitionDescriptions[transitionModal]}</p>}
              {transitioning && <p style={{ color: "#64748b" }}>Procesando…</p>}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setTransitionModal(null)} disabled={transitioning}>
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

export default LoteDetalleSinFactura;
