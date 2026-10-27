import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { agregarItem, buscarMedicos, cambiarEstadoLote, editarItem, getLote } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import lq from "../Liquidacion.module.scss";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "@/app/components/ui/SelectableTable/types";
import styles from "./LoteDetalle.module.scss";
import {
  type LoteAjuste,
  type Ajuste,
  fmt,
  mesLabel,
  type MedicoResult,
} from "../types";
import type ExcelJS from "exceljs";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { Check, ArrowLeftRight } from "lucide-react";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import { ESTADO_TONO, ITEM_URL, estadoLabel } from "@/app/pages/Pagos/LoteDetalle/utiles";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";
import paleta from "@/app/styles/paleta.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
type EditForm = { tipo: "d" | "c"; honorarios: string; gastos: string; observacion: string };
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
      const data = await getLote(loteId);
      setLote(data);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(err?.message || "No se pudo cargar el lote.");
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
        const data = await buscarMedicos(medicoQuery);
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
      await agregarItem(loteId, {
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
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string" ? detail : (err?.message ?? "Error al agregar ajuste."),
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
      await editarItem(loteId, editTarget.id, {
        tipo: editForm.tipo,
        honorarios: Number(editForm.honorarios),
        gastos: Number(editForm.gastos),
        observacion: editForm.observacion.trim() || null,
      });
      setEditTarget(null);
      await loadLote();
      notify("Ajuste actualizado.");
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string" ? detail : (err?.message ?? "Error al guardar."),
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
      const res = await cambiarEstadoLote(loteId, estadoMap[transitionModal]);
      setLote(res);
      setTransitionModal(null);
      notify(`Lote ${transitionLabels[transitionModal].toLowerCase()} correctamente.`);
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string" ? detail : (err?.message ?? "Error."),
        "error",
      );
    } finally {
      setTransitioning(false);
    }
  };

  const exportExcel = async () => {
    if (!lote) return;
    const ExcelJSLib = (await import("exceljs")).default;
    const wb = new ExcelJSLib.Workbook();
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

  const exportPDF = async () => {
    if (!lote) return;
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
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
            {a.nro_socio != null && <div style={{ fontSize: 11, color: paleta.gray500 }}>#{a.nro_socio}</div>}
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
          {a.observacion ?? <span style={{ color: paleta.gray400 }}>—</span>}
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
    <div className={lq.pagina}>
          <Franja titulo={`Lote ${loteId}`} icono={ArrowLeftRight} lateral={<span className={lq.franjaDato}>{periodo}</span>} />
          <BackButton label="Volver" />

          {lote && (
            <div className={lq.tira}>
              <span className={`${lq.tipo} ${lq.tipoSinFactura}`}>Sin factura</span>
              <span className={`${lq.estado} ${lq[ESTADO_TONO[lote.estado] ?? "cerrado"]}`}>
                {estadoLabel(lote.estado)}
              </span>
              <div className={lq.tiraDato}>
                <span>Obra social</span>
                <b>#{lote.obra_social_id}</b>
              </div>
              {lote.pago_id && (
                <div className={lq.tiraDato}>
                  <span>Pago</span>
                  <b>#{lote.pago_id}</b>
                </div>
              )}
              <div className={lq.tiraDato}>
                <span>Débitos</span>
                <b className={lq.menos}>-${fmt(lote.total_debitos)}</b>
              </div>
              <div className={lq.tiraDato}>
                <span>Créditos</span>
                <b className={lq.mas}>+${fmt(lote.total_creditos)}</b>
              </div>
              <div className={`${lq.tiraAccion} ${lq.acciones}`}>
                {!isApplied && isOpen && (
                  <Button variant="primary" size="md" onClick={() => setTransitionModal("cerrar")}>
                    Cerrar lote
                  </Button>
                )}
                {!isApplied && isClosed && (
                  <>
                    <Button variant="ghost" size="md" onClick={() => setTransitionModal("reabrir")}>
                      Reabrir
                    </Button>
                    <Button variant="primary" size="md" onClick={() => setTransitionModal("en_liquidaciones")}>
                      Pasar a liquidaciones
                    </Button>
                  </>
                )}
                {!isApplied && isInLiq && (
                  <Button variant="danger" size="md" onClick={() => setTransitionModal("quitar")}>
                    Quitar del pago
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Panel: Add form (only when open) */}
          {isOpen && !isApplied && !loading && (
            <section className={styles.searchPanel}>
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
                        <div className={styles.acItem} style={{ color: paleta.gray400 }}>
                          Buscando…
                        </div>
                      )}
                      {!medicoLoading && medicoResults.length === 0 && (
                        <div className={styles.acItem} style={{ color: paleta.gray400 }}>
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
                      <Check size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Socio seleccionado
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
            </section>
          )}

          {/* Ajustes table */}
          <section className={styles.tableCard}>
            <div className={styles.panelToolbar}>
              <span className={styles.panelTitle}>
                Ajustes del lote
                {ajustes.length > 0 && (
                  <span className={styles.countBadge}>{ajustes.length}</span>
                )}
              </span>
              <div className={styles.exportActions}>
                <BotonDescarga formato="pdf" onClick={exportPDF} disabled={ajustes.length === 0} />
                <BotonDescarga formato="excel" onClick={exportExcel} disabled={ajustes.length === 0} />
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
          </section>

      {/* Edit modal */}
      {editTarget && (
        <Dialogo
          titulo={`Editar ajuste #${editTarget.id}`}
          onClose={() => setEditTarget(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={editSaving}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Guardando…" : "Guardar Cambios"}
              </Button>
            </>
          }
        >
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
            </Dialogo>
      )}

      {/* Transition modal */}
      {transitionModal && (
        <Dialogo
          titulo={transitionLabels[transitionModal]}
          onClose={() => setTransitionModal(null)}
          acciones={
            <>
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
            </>
          }
        >
              {!transitioning && <p>{transitionDescriptions[transitionModal]}</p>}
              {transitioning && <p style={{ color: paleta.gray500 }}>Procesando…</p>}
            </Dialogo>
      )}
    </div>
  );
};

export default LoteDetalleSinFactura;
