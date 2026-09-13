import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  Landmark,
  Layers,
  Loader2,
  Search,
  SearchX,
  Users,
  Wallet,
} from "lucide-react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import Button from "../../components/atoms/Button/Button";
import Card from "../../components/atoms/Card/Card";
import { useAppSnackbar } from "../../hooks/useAppSnackbar";
import {
  fetchDetalleMedico,
  fetchExport,
  fetchMedicosPorConcepto,
  fetchPorConcepto,
  fetchPorSocio,
  fetchResumen,
  type CobranzasFiltrosParams,
} from "./api";
import type {
  CobranzaMedicoDetalle,
  CobranzaMedicosPage,
  CobranzaPorConceptoItem,
  CobranzaSociosPage,
  CobranzasResumen,
} from "./types";
import { formatMoney, monthLabel } from "./types";
import styles from "./CobranzasPage.module.scss";

const PAGE_SIZE = 25;

/** Las dos entradas al mismo universo de deuda: agrupada por concepto o por socio. */
type TabKey = "concepto" | "socio";

/** Profundidad del drill-down dentro de cada pestaña. */
type NivelConcepto = "lista" | "socios" | "detalle";
type NivelSocio = "lista" | "detalle";

const getErrorMessage = (e: any, fallback: string) => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof detail?.message === "string" && detail.message.trim()) return detail.message;
  return e?.message ?? fallback;
};

const CobranzasPage: React.FC = () => {
  const notify = useAppSnackbar();

  const [tab, setTab] = useState<TabKey>("concepto");

  // ── Filtros comunes a las dos pestañas ───────────────────────────────
  const [origen, setOrigen] = useState<"" | "liquidacion" | "caja">("");
  const [desde, setDesde] = useState<Date | null>(null);
  const [hasta, setHasta] = useState<Date | null>(null);
  const [incluirFuturos, setIncluirFuturos] = useState(false);

  // Un buscador por nivel: buscar un concepto, buscar un socio dentro de ese
  // concepto y buscar un socio en la pestaña "Por socio" son tres búsquedas
  // distintas; compartir el texto entre ellas confunde más de lo que ahorra.
  const [qConcepto, setQConcepto] = useState("");
  const [qMedicosDelConcepto, setQMedicosDelConcepto] = useState("");
  const [qSocio, setQSocio] = useState("");

  const filtrosBase = useMemo<CobranzasFiltrosParams>(
    () => ({
      mes_desde: desde ? desde.getMonth() + 1 : undefined,
      anio_desde: desde ? desde.getFullYear() : undefined,
      mes_hasta: hasta ? hasta.getMonth() + 1 : undefined,
      anio_hasta: hasta ? hasta.getFullYear() : undefined,
      paga_por_caja: origen === "caja" ? true : origen === "liquidacion" ? false : undefined,
      incluir_futuros: incluirFuturos,
    }),
    [desde, hasta, origen, incluirFuturos],
  );

  // ── Navegación interna ────────────────────────────────────────────────
  const [nivelConcepto, setNivelConcepto] = useState<NivelConcepto>("lista");
  const [conceptoSel, setConceptoSel] = useState<CobranzaPorConceptoItem | null>(null);
  const [nivelSocio, setNivelSocio] = useState<NivelSocio>("lista");

  // El detalle es la misma vista para las dos pestañas: cambia sólo si viene
  // acotado a un concepto (flujo "Por concepto") o completo (flujo "Por socio").
  const [detalleMedicoId, setDetalleMedicoId] = useState<number | null>(null);
  const [detalleMedicoNombre, setDetalleMedicoNombre] = useState("");
  const [detalleConceptoId, setDetalleConceptoId] = useState<number | undefined>(undefined);

  const enDetalle =
    (tab === "concepto" && nivelConcepto === "detalle") ||
    (tab === "socio" && nivelSocio === "detalle");
  const enLista =
    (tab === "concepto" && nivelConcepto === "lista") ||
    (tab === "socio" && nivelSocio === "lista");

  const qActivo = tab === "concepto" ? qConcepto : qSocio;

  // ── Resumen (KPIs) ────────────────────────────────────────────────────
  const [resumen, setResumen] = useState<CobranzasResumen | null>(null);

  useEffect(() => {
    if (!enLista) return;
    let vivo = true;
    fetchResumen({ ...filtrosBase, q: qActivo.trim() || undefined })
      .then((r) => vivo && setResumen(r))
      .catch(() => vivo && setResumen(null));
    return () => {
      vivo = false;
    };
  }, [enLista, filtrosBase, qActivo]);

  // ── Pestaña 1, nivel 1: lista de conceptos ────────────────────────────
  const [conceptosLoading, setConceptosLoading] = useState(true);
  const [conceptosError, setConceptosError] = useState<string | null>(null);
  const [porConcepto, setPorConcepto] = useState<CobranzaPorConceptoItem[]>([]);

  const loadConceptos = useCallback(async () => {
    setConceptosLoading(true);
    setConceptosError(null);
    try {
      setPorConcepto(await fetchPorConcepto({ ...filtrosBase, q: qConcepto.trim() || undefined }));
    } catch (e: any) {
      setConceptosError(getErrorMessage(e, "No se pudieron cargar los conceptos."));
    } finally {
      setConceptosLoading(false);
    }
  }, [filtrosBase, qConcepto]);

  useEffect(() => {
    if (tab === "concepto" && nivelConcepto === "lista") void loadConceptos();
  }, [tab, nivelConcepto, loadConceptos]);

  // ── Pestaña 1, nivel 2: socios adheridos al concepto ──────────────────
  const [medicosLoading, setMedicosLoading] = useState(false);
  const [medicosError, setMedicosError] = useState<string | null>(null);
  const [medicosPage, setMedicosPage] = useState<CobranzaMedicosPage | null>(null);
  const [medicosPageNum, setMedicosPageNum] = useState(1);

  const loadMedicos = useCallback(async () => {
    if (!conceptoSel) return;
    setMedicosLoading(true);
    setMedicosError(null);
    try {
      setMedicosPage(
        await fetchMedicosPorConcepto(conceptoSel.descuento_id, {
          ...filtrosBase,
          q: qMedicosDelConcepto.trim() || undefined,
          page: medicosPageNum,
          size: PAGE_SIZE,
        }),
      );
    } catch (e: any) {
      setMedicosError(getErrorMessage(e, "No se pudieron cargar los socios del concepto."));
    } finally {
      setMedicosLoading(false);
    }
  }, [conceptoSel, filtrosBase, qMedicosDelConcepto, medicosPageNum]);

  useEffect(() => {
    if (tab === "concepto" && nivelConcepto === "socios") void loadMedicos();
  }, [tab, nivelConcepto, loadMedicos]);

  // ── Pestaña 2, nivel 1: lista de socios ───────────────────────────────
  const [sociosLoading, setSociosLoading] = useState(false);
  const [sociosError, setSociosError] = useState<string | null>(null);
  const [sociosPage, setSociosPage] = useState<CobranzaSociosPage | null>(null);
  const [sociosPageNum, setSociosPageNum] = useState(1);

  const loadSocios = useCallback(async () => {
    setSociosLoading(true);
    setSociosError(null);
    try {
      setSociosPage(
        await fetchPorSocio({
          ...filtrosBase,
          q: qSocio.trim() || undefined,
          page: sociosPageNum,
          size: PAGE_SIZE,
        }),
      );
    } catch (e: any) {
      setSociosError(getErrorMessage(e, "No se pudieron cargar los socios deudores."));
    } finally {
      setSociosLoading(false);
    }
  }, [filtrosBase, qSocio, sociosPageNum]);

  useEffect(() => {
    if (tab === "socio" && nivelSocio === "lista") void loadSocios();
  }, [tab, nivelSocio, loadSocios]);

  // Volver a la primera página cuando cambia lo que se busca o se filtra.
  useEffect(() => setSociosPageNum(1), [qSocio, filtrosBase]);
  useEffect(() => setMedicosPageNum(1), [qMedicosDelConcepto, filtrosBase]);

  // ── Detalle de un socio (compartido por las dos pestañas) ─────────────
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<CobranzaMedicoDetalle | null>(null);

  const loadDetalle = useCallback(async () => {
    if (detalleMedicoId == null) return;
    setDetalleLoading(true);
    setDetalleError(null);
    try {
      setDetalle(
        await fetchDetalleMedico(detalleMedicoId, {
          ...filtrosBase,
          concepto_id: detalleConceptoId,
        }),
      );
    } catch (e: any) {
      setDetalleError(getErrorMessage(e, "No se pudo cargar el detalle del socio."));
    } finally {
      setDetalleLoading(false);
    }
  }, [detalleMedicoId, detalleConceptoId, filtrosBase]);

  useEffect(() => {
    if (enDetalle) void loadDetalle();
  }, [enDetalle, loadDetalle]);

  // ── Navegación ────────────────────────────────────────────────────────
  const cambiarTab = (k: TabKey) => {
    // Volver a tocar la pestaña activa sirve de escape: resetea el drill-down.
    if (k === "concepto") setNivelConcepto("lista");
    else setNivelSocio("lista");
    setTab(k);
  };

  const abrirConcepto = (item: CobranzaPorConceptoItem) => {
    setConceptoSel(item);
    setQMedicosDelConcepto("");
    setMedicosPageNum(1);
    setMedicosPage(null);
    setNivelConcepto("socios");
  };

  const abrirSocioDelConcepto = (medicoId: number, nombre: string) => {
    setDetalleMedicoId(medicoId);
    setDetalleMedicoNombre(nombre);
    setDetalleConceptoId(conceptoSel?.descuento_id);
    setDetalle(null);
    setNivelConcepto("detalle");
  };

  const abrirSocio = (medicoId: number, nombre: string) => {
    setDetalleMedicoId(medicoId);
    setDetalleMedicoNombre(nombre);
    setDetalleConceptoId(undefined); // deuda completa, cruzando conceptos
    setDetalle(null);
    setNivelSocio("detalle");
  };

  // ── Exportación (usa los filtros del nivel de lista activo) ───────────
  const filtrosExport = useMemo<CobranzasFiltrosParams>(
    () => ({ ...filtrosBase, q: qActivo.trim() || undefined }),
    [filtrosBase, qActivo],
  );

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = await fetchExport(filtrosExport);
      const data = rows.map((r) => ({
        Socio: r.medico_nombre,
        "Nro Socio": r.nro_socio,
        Concepto: `${r.nro_colegio} - ${r.descuento_nombre}`,
        Periodo: monthLabel(r.mes_aplicar, r.anio_aplicar),
        Monto: Number(r.calculado_total),
        Aplicado: Number(r.monto_aplicado),
        Saldo: Number(r.saldo),
        Origen: r.paga_por_caja ? "Caja" : "Liquidación",
        Estado: r.estado,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cobranzas");
      XLSX.writeFile(wb, "cobranzas.xlsx");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo exportar a Excel."), "error");
    }
  };

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const rows = await fetchExport(filtrosExport);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("Cobranzas", 40, 32);
      autoTable(doc, {
        startY: 48,
        head: [["Socio", "Nro Socio", "Concepto", "Período", "Saldo", "Origen", "Estado"]],
        body: rows.map((r) => [
          r.medico_nombre,
          String(r.nro_socio),
          `${r.nro_colegio} - ${r.descuento_nombre}`,
          monthLabel(r.mes_aplicar, r.anio_aplicar),
          formatMoney(r.saldo),
          r.paga_por_caja ? "Caja" : "Liquidación",
          r.estado,
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [27, 86, 255], textColor: 255 },
      });
      doc.save("cobranzas.pdf");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo exportar a PDF."), "error");
    }
  };

  // ── Derivados de presentación ─────────────────────────────────────────
  const medicosLastPage = medicosPage ? Math.max(1, Math.ceil(medicosPage.total / PAGE_SIZE)) : 1;
  const sociosLastPage = sociosPage ? Math.max(1, Math.ceil(sociosPage.total / PAGE_SIZE)) : 1;

  const subtitulo = enDetalle
    ? detalleConceptoId && conceptoSel
      ? `${detalleMedicoNombre} · ${conceptoSel.nombre}`
      : `Deuda completa de ${detalleMedicoNombre}`
    : tab === "concepto" && nivelConcepto === "socios" && conceptoSel
      ? `Socios con deuda en ${conceptoSel.nombre}`
      : tab === "concepto"
        ? "Deuda agrupada por concepto de descuento"
        : "Deuda de cada socio, cruzando todos los conceptos";

  // El buscador cambia de significado según el nivel en el que se esté.
  const buscador =
    tab === "concepto" && nivelConcepto === "socios"
      ? {
          valor: qMedicosDelConcepto,
          set: setQMedicosDelConcepto,
          placeholder: "Buscar socio en este concepto...",
          label: "Buscar socio",
        }
      : tab === "concepto"
        ? {
            valor: qConcepto,
            set: setQConcepto,
            placeholder: "Nombre o número de concepto...",
            label: "Buscar concepto",
          }
        : {
            valor: qSocio,
            set: setQSocio,
            placeholder: "Nombre o número de socio...",
            label: "Buscar socio",
          };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.header}>
            <div>
              <h1>Cobranzas</h1>
              <p className={styles.subtitle}>{subtitulo}</p>
            </div>
            {enLista && (
              <div className={styles.headerActions}>
                <Button variant="secondary" leftIcon={<FileText size={14} />} onClick={exportPdf}>
                  PDF
                </Button>
                <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportExcel}>
                  Excel
                </Button>
              </div>
            )}
          </div>

          {/* ── Pestañas ─────────────────────────────────────────────── */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "concepto" ? styles.tabActive : ""}`}
              onClick={() => cambiarTab("concepto")}
            >
              <Layers size={15} /> Por concepto
              {tab === "concepto" && (
                <motion.span layoutId="cobranzas-tab-underline" className={styles.tabUnderline} />
              )}
            </button>
            <button
              className={`${styles.tab} ${tab === "socio" ? styles.tabActive : ""}`}
              onClick={() => cambiarTab("socio")}
            >
              <Users size={15} /> Por socio
              {tab === "socio" && (
                <motion.span layoutId="cobranzas-tab-underline" className={styles.tabUnderline} />
              )}
            </button>
          </div>

          {/* ── Breadcrumb del drill-down ────────────────────────────── */}
          {!enLista && (
            <div className={styles.breadcrumb}>
              <button onClick={() => cambiarTab(tab)}>
                <ChevronLeft size={15} />
                {tab === "concepto" ? "Conceptos" : "Socios"}
              </button>
              {tab === "concepto" && conceptoSel && (
                <>
                  <span>/</span>
                  {nivelConcepto === "socios" ? (
                    <span className={styles.current}>
                      {conceptoSel.nro_colegio} · {conceptoSel.nombre}
                    </span>
                  ) : (
                    <button onClick={() => setNivelConcepto("socios")}>
                      {conceptoSel.nro_colegio} · {conceptoSel.nombre}
                    </button>
                  )}
                </>
              )}
              {enDetalle && (
                <>
                  <span>/</span>
                  <span className={styles.current}>{detalleMedicoNombre}</span>
                </>
              )}
            </div>
          )}

          {/* ── KPIs (sólo en las listas) ─────────────────────────────── */}
          {enLista && (
            <div className={styles.kpiRow}>
              <div className={styles.kpiCard}>
                <CircleDollarSign size={20} color="#3455c1" />
                <div className={styles.kpiValue}>{formatMoney(resumen?.saldo_total)}</div>
                <div className={styles.kpiLabel}>Saldo total</div>
              </div>
              <div className={styles.kpiCard}>
                <Landmark size={20} color="#3455c1" />
                <div className={styles.kpiValue}>{formatMoney(resumen?.saldo_liquidacion)}</div>
                <div className={styles.kpiLabel}>Saldo por liquidación</div>
              </div>
              <div className={`${styles.kpiCard} ${styles.kpiCardCaja}`}>
                <Wallet size={20} color="#f59e0b" />
                <div className={styles.kpiValue}>{formatMoney(resumen?.saldo_caja)}</div>
                <div className={styles.kpiLabel}>Saldo por caja (ventanilla)</div>
              </div>
              <div className={styles.kpiCard}>
                {tab === "concepto" ? (
                  <Users size={20} color="#3455c1" />
                ) : (
                  <Layers size={20} color="#3455c1" />
                )}
                <div className={styles.kpiValue}>
                  {tab === "concepto"
                    ? (resumen?.medicos_con_deuda ?? "—")
                    : (resumen?.conceptos_con_deuda ?? "—")}
                </div>
                <div className={styles.kpiLabel}>
                  {tab === "concepto" ? "Socios con deuda" : "Conceptos con deuda"}
                </div>
              </div>
            </div>
          )}

          {/* ── Filtros ──────────────────────────────────────────────── */}
          {!enDetalle && (
            <Card className={styles.filtersCard}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <div className={styles.filtersRow}>
                  <div className={`${styles.filterGroup} ${styles.wide}`}>
                    <label>{buscador.label}</label>
                    <div className={styles.searchInputWrap}>
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder={buscador.placeholder}
                        value={buscador.valor}
                        onChange={(e) => buscador.set(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Origen</label>
                    <select value={origen} onChange={(e) => setOrigen(e.target.value as any)}>
                      <option value="">Todos</option>
                      <option value="liquidacion">Solo liquidación</option>
                      <option value="caja">Solo caja</option>
                    </select>
                  </div>
                  <div className={`${styles.filterGroup} ${styles.narrow}`}>
                    <label>Período desde</label>
                    <DatePicker
                      label="MM/YYYY"
                      views={["month", "year"]}
                      openTo="month"
                      value={desde}
                      onChange={setDesde}
                      slotProps={{
                        textField: {
                          size: "small",
                          sx: { "& .MuiInputBase-root": { height: 37, fontSize: 13 } },
                        },
                      }}
                    />
                  </div>
                  <div className={`${styles.filterGroup} ${styles.narrow}`}>
                    <label>Período hasta</label>
                    <DatePicker
                      label="MM/YYYY"
                      views={["month", "year"]}
                      openTo="month"
                      value={hasta}
                      onChange={setHasta}
                      slotProps={{
                        textField: {
                          size: "small",
                          sx: { "& .MuiInputBase-root": { height: 37, fontSize: 13 } },
                        },
                      }}
                    />
                  </div>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="incluir-futuros"
                      checked={incluirFuturos}
                      onChange={(e) => setIncluirFuturos(e.target.checked)}
                    />
                    <label htmlFor="incluir-futuros">Incluir futuros</label>
                  </div>
                </div>
              </LocalizationProvider>
            </Card>
          )}

          {/* ══ PESTAÑA "POR CONCEPTO" ═══════════════════════════════════ */}

          {/* Nivel 1: conceptos */}
          {tab === "concepto" && nivelConcepto === "lista" && (
            <>
              {conceptosError && <div className={styles.errorBanner}>{conceptosError}</div>}
              <Card className={styles.tableCard}>
                {conceptosLoading ? (
                  <div className={styles.loadingState}>
                    <Loader2 size={18} className={styles.spin} /> Cargando conceptos...
                  </div>
                ) : porConcepto.length === 0 ? (
                  <div className={styles.emptyState}>
                    <SearchX size={32} strokeWidth={1.6} />
                    <div className={styles.emptyTitle}>Sin conceptos con deuda</div>
                    <div className={styles.emptyHint}>
                      Probá ampliar el rango de período o limpiar el buscador.
                    </div>
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th style={{ textAlign: "right" }}>Socios con deuda</th>
                          <th style={{ textAlign: "right" }}>Cuotas impagas</th>
                          <th>Período más antiguo</th>
                          <th style={{ textAlign: "right" }}>Saldo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {porConcepto.map((item) => (
                          <tr key={item.descuento_id} onClick={() => abrirConcepto(item)}>
                            <td>
                              <span className={styles.conceptCode}>{item.nro_colegio}</span>
                              <strong>{item.nombre}</strong>
                            </td>
                            <td className={styles.numCell}>{item.medicos_con_deuda}</td>
                            <td className={styles.numCell}>
                              {item.cuotas_impagas.toLocaleString("es-AR")}
                            </td>
                            <td>{item.periodo_mas_antiguo ?? "—"}</td>
                            <td className={styles.saldoCell}>
                              <div className={styles.saldoValue}>{formatMoney(item.saldo)}</div>
                              {Number(item.saldo_caja) > 0 && (
                                <div className={styles.saldoCajaChip}>
                                  Caja {formatMoney(item.saldo_caja)}
                                </div>
                              )}
                            </td>
                            <td className={styles.rowChevron}>
                              <ChevronRight size={16} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Nivel 2: socios adheridos al concepto */}
          {tab === "concepto" && nivelConcepto === "socios" && conceptoSel && (
            <>
              <div className={styles.miniKpiRow}>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>Saldo del concepto</div>
                  <div className={styles.miniKpiValue}>{formatMoney(conceptoSel.saldo)}</div>
                </div>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>De eso, por caja</div>
                  <div className={`${styles.miniKpiValue} ${styles.miniKpiValueCaja}`}>
                    {formatMoney(conceptoSel.saldo_caja)}
                  </div>
                </div>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>Socios con deuda</div>
                  <div className={styles.miniKpiValue}>{conceptoSel.medicos_con_deuda}</div>
                </div>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>Deuda más antigua</div>
                  <div className={styles.miniKpiValue}>{conceptoSel.periodo_mas_antiguo ?? "—"}</div>
                </div>
              </div>

              {medicosError && <div className={styles.errorBanner}>{medicosError}</div>}

              <Card className={styles.tableCard}>
                {medicosLoading ? (
                  <div className={styles.loadingState}>
                    <Loader2 size={18} className={styles.spin} /> Cargando socios...
                  </div>
                ) : !medicosPage || medicosPage.items.length === 0 ? (
                  <div className={styles.emptyState}>
                    <SearchX size={32} strokeWidth={1.6} />
                    <div className={styles.emptyTitle}>Sin socios deudores para este concepto</div>
                  </div>
                ) : (
                  <>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Nro. socio</th>
                            <th>Socio</th>
                            <th style={{ textAlign: "right" }}>Cuotas impagas</th>
                            <th>Período más antiguo</th>
                            <th style={{ textAlign: "right" }}>Atraso</th>
                            <th style={{ textAlign: "right" }}>Saldo</th>
                            <th>Origen</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicosPage.items.map((m) => (
                            <tr
                              key={m.medico_id}
                              onClick={() => abrirSocioDelConcepto(m.medico_id, m.medico_nombre)}
                            >
                              <td style={{ fontFamily: "ui-monospace, monospace" }}>{m.nro_socio}</td>
                              <td>
                                <strong>{m.medico_nombre}</strong>
                                {m.pagador_nombre && (
                                  <div className={styles.pagadorHint}>Paga: {m.pagador_nombre}</div>
                                )}
                              </td>
                              <td className={styles.numCell}>{m.cuotas_impagas}</td>
                              <td>{m.periodo_mas_antiguo ?? "—"}</td>
                              <td
                                className={styles.numCell}
                                style={{
                                  color: m.meses_atraso >= 12 ? "#b91c1c" : "#b45309",
                                  fontWeight: 600,
                                }}
                              >
                                {m.meses_atraso} meses
                              </td>
                              <td className={styles.numCell} style={{ fontWeight: 700 }}>
                                {formatMoney(m.saldo)}
                              </td>
                              <td>
                                <span
                                  className={`${styles.badge} ${m.paga_por_caja ? styles.badgeCaja : styles.badgeLiquidacion}`}
                                >
                                  {m.paga_por_caja ? "Caja" : "Liquidación"}
                                </span>
                              </td>
                              <td className={styles.rowChevron}>
                                <ChevronRight size={16} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.paginationBar}>
                      <button
                        onClick={() => setMedicosPageNum((p) => Math.max(1, p - 1))}
                        disabled={medicosPageNum <= 1 || medicosLoading}
                      >
                        ← Anterior
                      </button>
                      <span>
                        Página {medicosPageNum} de {medicosLastPage} · {medicosPage.total} socios
                      </span>
                      <button
                        onClick={() => setMedicosPageNum((p) => Math.min(medicosLastPage, p + 1))}
                        disabled={medicosPageNum >= medicosLastPage || medicosLoading}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {/* ══ PESTAÑA "POR SOCIO" ══════════════════════════════════════ */}

          {tab === "socio" && nivelSocio === "lista" && (
            <>
              {sociosError && <div className={styles.errorBanner}>{sociosError}</div>}
              <Card className={styles.tableCard}>
                {sociosLoading ? (
                  <div className={styles.loadingState}>
                    <Loader2 size={18} className={styles.spin} /> Cargando socios...
                  </div>
                ) : !sociosPage || sociosPage.items.length === 0 ? (
                  <div className={styles.emptyState}>
                    <SearchX size={32} strokeWidth={1.6} />
                    <div className={styles.emptyTitle}>Sin socios con deuda</div>
                    <div className={styles.emptyHint}>
                      Probá ampliar el rango de período o limpiar el buscador.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Nro. socio</th>
                            <th>Socio</th>
                            <th style={{ textAlign: "right" }}>Conceptos</th>
                            <th style={{ textAlign: "right" }}>Cuotas impagas</th>
                            <th>Período más antiguo</th>
                            <th style={{ textAlign: "right" }}>Atraso</th>
                            <th style={{ textAlign: "right" }}>Saldo</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sociosPage.items.map((s) => (
                            <tr
                              key={s.medico_id}
                              onClick={() => abrirSocio(s.medico_id, s.medico_nombre)}
                            >
                              <td style={{ fontFamily: "ui-monospace, monospace" }}>{s.nro_socio}</td>
                              <td>
                                <strong>{s.medico_nombre}</strong>
                              </td>
                              <td className={styles.numCell}>{s.conceptos_con_deuda}</td>
                              <td className={styles.numCell}>{s.cuotas_impagas}</td>
                              <td>{s.periodo_mas_antiguo ?? "—"}</td>
                              <td
                                className={styles.numCell}
                                style={{
                                  color: s.meses_atraso >= 12 ? "#b91c1c" : "#b45309",
                                  fontWeight: 600,
                                }}
                              >
                                {s.meses_atraso} meses
                              </td>
                              <td className={styles.saldoCell}>
                                <div className={styles.saldoValue}>{formatMoney(s.saldo)}</div>
                                {Number(s.saldo_caja) > 0 && (
                                  <div className={styles.saldoCajaChip}>
                                    Caja {formatMoney(s.saldo_caja)}
                                  </div>
                                )}
                              </td>
                              <td className={styles.rowChevron}>
                                <ChevronRight size={16} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.paginationBar}>
                      <button
                        onClick={() => setSociosPageNum((p) => Math.max(1, p - 1))}
                        disabled={sociosPageNum <= 1 || sociosLoading}
                      >
                        ← Anterior
                      </button>
                      <span>
                        Página {sociosPageNum} de {sociosLastPage} · {sociosPage.total} socios
                      </span>
                      <button
                        onClick={() => setSociosPageNum((p) => Math.min(sociosLastPage, p + 1))}
                        disabled={sociosPageNum >= sociosLastPage || sociosLoading}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {/* ══ DETALLE DE UN SOCIO (las dos pestañas) ═══════════════════ */}

          {enDetalle && (
            <>
              <div className={styles.miniKpiRow}>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>
                    {detalleConceptoId ? "Saldo en este concepto" : "Saldo total del socio"}
                  </div>
                  <div className={styles.miniKpiValue}>{formatMoney(detalle?.saldo_total)}</div>
                </div>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>Nro. socio</div>
                  <div className={styles.miniKpiValue}>{detalle?.nro_socio ?? "—"}</div>
                </div>
                <div className={styles.miniKpiCard}>
                  <div className={styles.miniKpiLabel}>Cuotas impagas</div>
                  <div className={styles.miniKpiValue}>{detalle?.cuotas.length ?? "—"}</div>
                </div>
              </div>

              {detalleError && <div className={styles.errorBanner}>{detalleError}</div>}

              <Card className={styles.tableCard}>
                {detalleLoading ? (
                  <div className={styles.loadingState}>
                    <Loader2 size={18} className={styles.spin} /> Cargando detalle...
                  </div>
                ) : !detalle || detalle.cuotas.length === 0 ? (
                  <div className={styles.emptyState}>
                    <AlertCircle size={32} strokeWidth={1.6} />
                    <div className={styles.emptyTitle}>Sin cuotas impagas para este socio</div>
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Período</th>
                          <th style={{ textAlign: "right" }}>Monto</th>
                          <th style={{ textAlign: "right" }}>Aplicado</th>
                          <th style={{ textAlign: "right" }}>Saldo</th>
                          <th>Origen</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.cuotas.map((c) => (
                          <tr key={c.deduccion_id} style={{ cursor: "default" }}>
                            <td>
                              <span className={styles.conceptCode}>{c.nro_colegio}</span>
                              {c.descuento_nombre}
                            </td>
                            <td>{monthLabel(c.mes_aplicar, c.anio_aplicar)}</td>
                            <td className={styles.numCell}>{formatMoney(c.calculado_total)}</td>
                            <td className={styles.numCell} style={{ color: "#94a3b8" }}>
                              {formatMoney(c.monto_aplicado)}
                            </td>
                            <td className={styles.numCell} style={{ fontWeight: 700 }}>
                              {formatMoney(c.saldo)}
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${c.paga_por_caja ? styles.badgeCaja : styles.badgeLiquidacion}`}
                              >
                                {c.paga_por_caja ? "Caja" : "Liquidación"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${
                                  c.estado === "en_pago"
                                    ? styles.badgeEnPago
                                    : c.estado === "aplicado"
                                      ? styles.badgeAplicado
                                      : styles.badgePendiente
                                }`}
                              >
                                {c.estado === "en_pago"
                                  ? "En pago"
                                  : c.estado === "aplicado"
                                    ? "Aplicado"
                                    : "Pendiente"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CobranzasPage;
