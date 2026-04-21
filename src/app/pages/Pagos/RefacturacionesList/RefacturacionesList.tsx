import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getJSON, postJSON } from "../../../lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "../../../components/atoms/Button/Button";
import Card from "../../../components/atoms/Card/Card";
import SelectableTable from "../../../components/molecules/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "../../../components/molecules/SelectableTable/types";
import styles from "./RefacturacionesList.module.scss";
import { type ObraSocial, type PeriodoDisp, type LoteAjuste, mesLabel, osId, osNombre, MESES } from "../types";
import AppSearchSelect from "../../../components/atoms/AppSearchSelect/AppSearchSelect";

const LISTA_URL = (params: Record<string, string>) => {
  const p = new URLSearchParams({ tipo: "refacturacion", ...params });
  return `/api/lotes/snaps/lista?${p}`;
};
const POR_OS_PERIODO_URL = (osId: number, mes: number, anio: number) =>
  `/api/lotes/snaps/por_os_periodo?obra_social_id=${osId}&mes_periodo=${mes}&anio_periodo=${anio}`;
const OBRAS_SOCIALES_URL = "/api/obras_social/";
const PERIODOS_DISP_URL = (id: number) => `/api/periodos/disponibles?obra_social_id=${id}`;
const CREAR_REFAC_URL = "/api/lotes/snaps/crear_refacturacion";
const ESTADO_URL = (id: number) => `/api/lotes/snaps/${id}/estado`;
const DELETE_LOTE_URL = (id: number) => `/api/lotes/snaps/${id}`;

type LoteListItem = {
  id: number;
  tipo: "normal" | "refacturacion";
  estado: "A" | "C" | "L";
  mes_periodo: number;
  anio_periodo: number;
  pago_id: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  snap_origen_id: number | null;
  total_debitos: string;
  total_creditos: string;
};

const estadoLabel = (e: string) => ({ A: "Abierto", C: "Cerrado", L: "En Liquidaciones" }[e] ?? e);
const estadoClass = (e: string) => ({ A: styles.estadoA, C: styles.estadoC, L: styles.estadoL }[e] ?? "");

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const RefacturacionesList: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Filters
  const [filterOs, setFilterOs] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [filterAnio, setFilterAnio] = useState("");
  const [filterEstado, setFilterEstado] = useState("A");

  // List
  const [lotes, setLotes] = useState<LoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [addOs, setAddOs] = useState("");
  const [periodos, setPeriodos] = useState<PeriodoDisp[]>([]);
  const [periodosMes, setPeriodosMes] = useState("");
  const [periodosAnio, setPeriodosAnio] = useState("");
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = {};
    if (filterOs) p.obra_social_id = filterOs;
    if (filterMes) p.mes = filterMes;
    if (filterAnio) p.anio = filterAnio;
    if (filterEstado) p.estado = filterEstado;
    return p;
  }, [filterOs, filterMes, filterAnio, filterEstado]);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<LoteListItem[]>(LISTA_URL(buildParams()));
      setLotes(data ?? []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las refacturaciones.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchLotes(); }, [fetchLotes]);

  // Load obras sociales on mount (needed for filter + modal)
  useEffect(() => {
    (async () => {
      setObrasLoading(true);
      try {
        const data = await getJSON<ObraSocial[]>(OBRAS_SOCIALES_URL);
        setObras(data ?? []);
      } finally {
        setObrasLoading(false);
      }
    })();
  }, []);

  const openAddModal = () => {
    setAddOpen(true);
    setAddOs("");
    setPeriodos([]);
    setPeriodosMes("");
    setPeriodosAnio("");
  };

  const handleAddOsChange = async (val: string) => {
    setAddOs(val);
    setPeriodos([]);
    setPeriodosMes("");
    setPeriodosAnio("");
    if (!val) return;
    setPeriodosLoading(true);
    try {
      const data = await getJSON<PeriodoDisp[]>(PERIODOS_DISP_URL(Number(val)));
      setPeriodos(data ?? []);
    } catch {
      setPeriodos([]);
    } finally {
      setPeriodosLoading(false);
    }
  };

  const handlePeriodoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) { setPeriodosMes(""); setPeriodosAnio(""); return; }
    const [anio, mes] = val.split("-");
    setPeriodosAnio(anio);
    setPeriodosMes(mes);
  };

  const handleAdd = async () => {
    if (!addOs || !periodosMes || !periodosAnio) return;
    setAdding(true);
    try {
      // Resolve snap_origen_id: latest refac or normal lote for this OS+period
      let snapOrigenId: number | null = null;
      try {
        const existing = await getJSON<LoteAjuste[]>(
          POR_OS_PERIODO_URL(Number(addOs), Number(periodosMes), Number(periodosAnio))
        );
        const refacs = (existing ?? []).filter((l) => l.tipo === "refacturacion");
        const normal = (existing ?? []).find((l) => l.tipo === "normal");
        snapOrigenId = refacs.length > 0
          ? refacs[refacs.length - 1].id
          : normal?.id ?? null;
      } catch { /* proceed without snap */ }

      const lote = await postJSON<LoteAjuste>(CREAR_REFAC_URL, {
        obra_social_id: Number(addOs),
        mes_periodo: Number(periodosMes),
        anio_periodo: Number(periodosAnio),
        snap_origen_id: snapOrigenId,
      });
      navigate(`/panel/refacturaciones/${lote.id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(typeof detail === "string" ? detail : e?.message ?? "Error al crear refacturación.", "error");
    } finally {
      setAdding(false);
    }
  };

  const columns: ColumnDef<LoteListItem>[] = [
    {
      key: "obra_social_nombre",
      header: "Obra Social",
      render: (l) => (
        <div>
          <div style={{ fontWeight: 500 }}>{l.obra_social_nombre}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>#{l.obra_social_id}</div>
        </div>
      ),
    },
    {
      key: "nro_factura",
      header: "Nro. Factura",
      render: (l) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{l.nro_factura ?? "—"}</span>,
    },
    {
      key: "periodo",
      header: "Período",
      render: (l) => <span style={{ whiteSpace: "nowrap" }}>{mesLabel(l.mes_periodo)} {l.anio_periodo}</span>,
    },
    {
      key: "snap_origen_id",
      header: "Corrige",
      render: (l) => l.snap_origen_id ? (
        <button
          className={styles.loteLink}
          onClick={(e) => { e.stopPropagation(); navigate(`/panel/debitos-creditos/${l.snap_origen_id}`); }}
        >
          Lote #{l.snap_origen_id}
        </button>
      ) : <span style={{ color: "#94a3b8" }}>—</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (l) => (
        <span className={`${styles.estadoBadge} ${estadoClass(l.estado)}`}>{estadoLabel(l.estado)}</span>
      ),
    },
    {
      key: "pago_id",
      header: "Pago",
      render: (l) => l.pago_id ? `#${l.pago_id}` : <span style={{ color: "#94a3b8" }}>—</span>,
    },
    {
      key: "total_debitos",
      header: "Débitos",
      alignRight: true,
      render: (l) => <span className={styles.negative}>-${Number(l.total_debitos).toLocaleString("es-AR")}</span>,
    },
    {
      key: "total_creditos",
      header: "Créditos",
      alignRight: true,
      render: (l) => <span className={styles.positive}>+${Number(l.total_creditos).toLocaleString("es-AR")}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (l) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => { e.stopPropagation(); navigate(`/panel/refacturaciones/${l.id}`); }}
        >
          Ver
        </Button>
      ),
    },
  ];

  const bulkActions: ActionDef<LoteListItem>[] = [
    {
      label: "Pasar al pago",
      method: "PATCH",
      endpoint: (l) => ESTADO_URL(l.id),
      payload: () => ({ estado: "L" }),
      restrictions: [
        {
          message: "Solo se pueden pasar al pago refacturaciones con estado Cerrado.",
          isAllowed: (rows) => rows.every((r) => r.estado === "C"),
        },
      ],
      confirmMessage: (n) => `¿Pasar ${n} refacturación${n !== 1 ? "es" : ""} al pago?`,
      onSuccess: (ok, fail) => {
        if (ok) notify(`${ok} refacturación${ok !== 1 ? "es pasadas" : " pasada"} al pago.`);
        if (fail) notify(`${fail} no pudo${fail !== 1 ? "ron" : ""} pasarse al pago.`, "error");
      },
    },
    {
      label: "Eliminar",
      method: "DELETE",
      endpoint: (l) => DELETE_LOTE_URL(l.id),
      restrictions: [
        {
          message: "Solo se pueden eliminar refacturaciones con estado Abierto.",
          isAllowed: (rows) => rows.every((r) => r.estado === "A"),
        },
      ],
      confirmMessage: (n) => `¿Eliminar ${n} refacturación${n !== 1 ? "es" : ""}? Esta acción no se puede deshacer.`,
      onSuccess: (ok, fail) => {
        if (ok) notify(`${ok} refacturación${ok !== 1 ? "es eliminadas" : " eliminada"}.`);
        if (fail) notify(`${fail} no pudo${fail !== 1 ? "ron" : ""} eliminarse.`, "error");
      },
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.breadcrumb}>LIQUIDACIÓN / REFACTURACIONES</div>
              <h1 className={styles.title}>Refacturaciones</h1>
            </div>
            <Button variant="primary" onClick={openAddModal}>+ Nueva Refacturación</Button>
          </div>

          {/* Filtros */}
          <Card className={styles.filterCard}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup} style={{ minWidth: 300 }}>
                <label className={styles.filterLabel}>Obra Social</label>
                <AppSearchSelect
                  options={obras.map((o) => ({ id: String(osId(o)), label: `${osId(o)} — ${osNombre(o)}` }))}
                  value={filterOs || null}
                  onChange={(val) => setFilterOs(val ? String(val) : "")}
                />
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Mes</label>
                <select className={styles.filterSelect} value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
                  <option value="">Todos</option>
                  {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Año</label>
                <select className={styles.filterSelect} value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
                  <option value="">Todos</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Estado</label>
                <select className={styles.filterSelect} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="A">Abierto</option>
                  <option value="C">Cerrado</option>
                  <option value="L">En Liquidaciones</option>
                </select>
              </div>
              <div className={styles.filterActions}>
                <Button variant="secondary" onClick={fetchLotes} disabled={loading}>
                  {loading ? "Buscando…" : "Buscar"}
                </Button>
              </div>
            </div>
          </Card>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <SelectableTable
            rows={lotes}
            columns={columns}
            actions={bulkActions}
            isSelectable={(r) => r.estado === "A" || r.estado === "C"}
            emptyMessage="Sin refacturaciones que coincidan con los filtros."
            loading={loading}
            onActionComplete={fetchLotes}
          />
        </motion.div>
      </div>

      {/* Modal agregar */}
      {addOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" onClick={() => !adding && setAddOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Nueva Refacturación</h3>
              <button className={styles.modalClose} onClick={() => setAddOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Obra Social</label>
                <AppSearchSelect
                  options={obras.map((o) => ({ id: String(osId(o)), label: `${osId(o)} — ${osNombre(o)}` }))}
                  value={addOs || null}
                  onChange={(val) => handleAddOsChange(val ? String(val) : "")}
                  disabled={obrasLoading || adding}
                  loading={obrasLoading}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Período disponible</label>
                {!addOs ? (
                  <span className={styles.hintText}>Seleccioná una obra social primero.</span>
                ) : periodosLoading ? (
                  <span className={styles.hintText}>Cargando períodos…</span>
                ) : (
                  <select
                    className={styles.formSelect}
                    value={periodosAnio && periodosMes ? `${periodosAnio}-${periodosMes}` : ""}
                    onChange={handlePeriodoChange}
                    disabled={adding}
                  >
                    <option value="">Seleccioná un período…</option>
                    {periodos.map((p) => (
                      <option key={`${p.ANIO}-${p.MES}`} value={`${p.ANIO}-${p.MES}`}>
                        {mesLabel(p.MES)} {p.ANIO}
                        {p.NRO_FACT_1 ? ` — ${p.NRO_FACT_1}${p.NRO_FACT_2 ? `-${p.NRO_FACT_2}` : ""}` : ""}
                      </option>
                    ))}
                    {periodos.length === 0 && <option disabled>Sin períodos disponibles</option>}
                  </select>
                )}
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={adding}>Cancelar</Button>
              <Button variant="primary" onClick={handleAdd} disabled={adding || !addOs || !periodosMes || !periodosAnio}>
                {adding ? "Creando…" : "Crear Refacturación"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefacturacionesList;
