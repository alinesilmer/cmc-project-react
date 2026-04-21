import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getJSON, postJSON, delJSON } from "../../../lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "../../../components/atoms/Button/Button";
import Card from "../../../components/atoms/Card/Card";
import SelectableTable from "../../../components/molecules/SelectableTable/SelectableTable";
import type {
  ActionDef,
  ColumnDef,
} from "../../../components/molecules/SelectableTable/types";
import styles from "./DebitosCreditos.module.scss";
import {
  type ObraSocial,
  type PeriodoDisp,
  type LoteAjuste,
  mesLabel,
  osId,
  osNombre,
  MESES,
} from "../types";
import AppSearchSelect from "../../../components/atoms/AppSearchSelect/AppSearchSelect";

const LISTA_URL = (params: Record<string, string>) => {
  const p = new URLSearchParams(params);
  return `/api/lotes/snaps/lista?${p}`;
};
const OBRAS_SOCIALES_URL = "/api/obras_social/";
const PERIODOS_DISP_URL = (id: number) =>
  `/api/periodos/disponibles_lotes_ajustes?obra_social_id=${id}`;
const OBTENER_O_CREAR_URL = "/api/lotes/snaps/obtener_o_crear";
const CREAR_SF_URL = "/api/lotes/snaps/crear_sin_factura";
const ESTADO_URL = (id: number) => `/api/lotes/snaps/${id}/estado`;
const DELETE_LOTE_URL = (id: number) => `/api/lotes/snaps/${id}`;

type LoteListItem = {
  id: number;
  tipo: "normal" | "refacturacion" | "sin_factura";
  estado: "A" | "C" | "L" | "AP";
  mes_periodo: number;
  anio_periodo: number;
  pago_id: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  total_debitos: string;
  total_creditos: string;
};

const estadoLabel = (e: string) =>
  ({ A: "Abierto", C: "Cerrado", L: "En Liquidaciones", AP: "Aplicado" })[e] ??
  e;
const estadoClass = (e: string) =>
  ({
    A: styles.estadoA,
    C: styles.estadoC,
    L: styles.estadoL,
    AP: styles.estadoAP,
  })[e] ?? "";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const DebitosCreditos: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Filters
  const [filterOs, setFilterOs] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [filterAnio, setFilterAnio] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

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

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<LoteListItem | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (lote: LoteListItem) => {
    setDeleteTarget(lote);
    setDeleteStep(1);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await delJSON(DELETE_LOTE_URL(deleteTarget.id));
      notify("Lote eliminado correctamente.");
      setDeleteTarget(null);
      fetchLotes();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al eliminar el lote."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Sin factura modal
  const [addSfOpen, setAddSfOpen] = useState(false);
  const [addSfOs, setAddSfOs] = useState("");
  const [addSfMes, setAddSfMes] = useState("");
  const [addSfAnio, setAddSfAnio] = useState("");
  const [addingSf, setAddingSf] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = {};
    if (filterOs) p.obra_social_id = filterOs;
    if (filterMes) p.mes = filterMes;
    if (filterAnio) p.anio = filterAnio;
    if (filterEstado) p.estado = filterEstado;
    if (filterTipo) p.tipo = filterTipo;
    return p;
  }, [filterOs, filterMes, filterAnio, filterEstado, filterTipo]);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<LoteListItem[]>(LISTA_URL(buildParams()));
      setLotes(data ?? []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los lotes.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

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
    if (!val) {
      setPeriodosMes("");
      setPeriodosAnio("");
      return;
    }
    const [anio, mes] = val.split("-");
    setPeriodosAnio(anio);
    setPeriodosMes(mes);
  };

  const handleAdd = async () => {
    if (!addOs || !periodosMes || !periodosAnio) return;
    setAdding(true);
    try {
      const lote = await postJSON<LoteAjuste>(OBTENER_O_CREAR_URL, {
        obra_social_id: Number(addOs),
        mes_periodo: Number(periodosMes),
        anio_periodo: Number(periodosAnio),
      });
      navigate(`/panel/debitos-creditos/${lote.id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al crear el lote."),
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const openAddSfModal = () => {
    setAddSfOpen(true);
    setAddSfOs("");
    setAddSfMes("");
    setAddSfAnio(String(currentYear));
  };

  const handleAddSinFactura = async () => {
    if (!addSfOs || !addSfMes || !addSfAnio) return;
    setAddingSf(true);
    try {
      const lote = await postJSON<LoteAjuste>(CREAR_SF_URL, {
        obra_social_id: Number(addSfOs),
        mes_periodo: Number(addSfMes),
        anio_periodo: Number(addSfAnio),
      });
      navigate(`/panel/debitos-creditos-sin-factura/${lote.id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al crear el lote."),
        "error",
      );
    } finally {
      setAddingSf(false);
    }
  };

  const columns: ColumnDef<LoteListItem>[] = [
    {
      key: "tipo",
      header: "Tipo",
      render: (l) => (
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
            background: l.tipo === "sin_factura" ? "#f3e8ff" : "#dbeafe",
            color: l.tipo === "sin_factura" ? "#6d28d9" : "#1e40af",
          }}
        >
          {l.tipo === "sin_factura" ? "Sin Factura" : "Normal"}
        </span>
      ),
    },
    {
      key: "obra_social_nombre",
      header: "Obra Social",
      render: (l) => (
        <div>
          <div style={{ fontWeight: 500 }}>{l.obra_social_nombre}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            #{l.obra_social_id}
          </div>
        </div>
      ),
    },
    {
      key: "nro_factura",
      header: "Nro. Factura",
      render: (l) => (
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
          {l.nro_factura ?? "—"}
        </span>
      ),
    },
    {
      key: "periodo",
      header: "Período",
      render: (l) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {mesLabel(l.mes_periodo)} {l.anio_periodo}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (l) => (
        <span className={`${styles.estadoBadge} ${estadoClass(l.estado)}`}>
          {estadoLabel(l.estado)}
        </span>
      ),
    },
    {
      key: "pago_id",
      header: "Pago",
      render: (l) =>
        l.pago_id ? (
          `#${l.pago_id}`
        ) : (
          <span style={{ color: "#94a3b8" }}>—</span>
        ),
    },
    {
      key: "total_debitos",
      header: "Débitos",
      alignRight: true,
      render: (l) => (
        <span className={styles.negative}>
          -${Number(l.total_debitos).toLocaleString("es-AR")}
        </span>
      ),
    },
    {
      key: "total_creditos",
      header: "Créditos",
      alignRight: true,
      render: (l) => (
        <span className={styles.positive}>
          +${Number(l.total_creditos).toLocaleString("es-AR")}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (l) => (
        <div className={styles.rowActions}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              const base =
                l.tipo === "sin_factura"
                  ? "/panel/debitos-creditos-sin-factura"
                  : "/panel/debitos-creditos";
              navigate(`${base}/${l.id}`);
            }}
          >
            Ver
          </Button>
          {l.estado !== "L" && l.estado !== "AP" && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(l);
              }}
            >
              Eliminar
            </Button>
          )}
        </div>
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
          message: "Solo se pueden pasar al pago lotes con estado Cerrado.",
          isAllowed: (rows) => rows.every((r) => r.estado === "C"),
        },
      ],
      confirmMessage: (n) => `¿Pasar ${n} lote${n !== 1 ? "s" : ""} al pago?`,
      onSuccess: (ok, fail) => {
        if (ok)
          notify(`${ok} lote${ok !== 1 ? "s pasados" : " pasado"} al pago.`);
        if (fail)
          notify(
            `${fail} no pudo${fail !== 1 ? "ron" : ""} pasarse al pago.`,
            "error",
          );
      },
    },
    {
      label: "Eliminar",
      method: "DELETE",
      endpoint: (l) => DELETE_LOTE_URL(l.id),
      restrictions: [
        {
          message: "Solo se pueden eliminar lotes con estado Abierto.",
          isAllowed: (rows) => rows.every((r) => r.estado === "A"),
        },
      ],
      confirmMessage: (n) =>
        `¿Eliminar ${n} lote${n !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
      onSuccess: (ok, fail) => {
        if (ok)
          notify(`${ok} lote${ok !== 1 ? "s eliminados" : " eliminado"}.`);
        if (fail)
          notify(
            `${fail} no pudo${fail !== 1 ? "ron" : ""} eliminarse.`,
            "error",
          );
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
              <div className={styles.breadcrumb}>
                LIQUIDACIÓN / DÉBITOS Y CRÉDITOS
              </div>
              <h1 className={styles.title}>Débitos y Créditos</h1>
            </div>
            <Button variant="primary" onClick={openAddModal}>
              + Nuevo Lote
            </Button>
            <Button variant="secondary" onClick={openAddSfModal}>
              + Nuevo Lote sin factura
            </Button>
          </div>

          {/* Filtros */}
          <Card className={styles.filterCard}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup} style={{ minWidth: 300 }}>
                <label className={styles.filterLabel}>Obra Social</label>
                <AppSearchSelect
                  options={obras.map((o) => ({
                    id: String(osId(o)),
                    label: `${osId(o)} — ${osNombre(o)}`,
                  }))}
                  value={filterOs || null}
                  onChange={(val) => setFilterOs(val ? String(val) : "")}
                />
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Mes</label>
                <select
                  className={styles.filterSelect}
                  value={filterMes}
                  onChange={(e) => setFilterMes(e.target.value)}
                >
                  <option value="">Todos</option>
                  {MESES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Año</label>
                <select
                  className={styles.filterSelect}
                  value={filterAnio}
                  onChange={(e) => setFilterAnio(e.target.value)}
                >
                  <option value="">Todos</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Estado</label>
                <select
                  className={styles.filterSelect}
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="A">Abierto</option>
                  <option value="C">Cerrado</option>
                  <option value="L">En Liquidaciones</option>
                  <option value="AP">Aplicado</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Tipo</label>
                <select
                  className={styles.filterSelect}
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="normal">Normal</option>
                  <option value="sin_factura">Sin factura</option>
                </select>
              </div>
              {/* <div className={styles.filterActions}>
                <Button
                  variant="secondary"
                  onClick={fetchLotes}
                  disabled={loading}
                >
                  {loading ? "Buscando…" : "Buscar"}
                </Button>
              </div> */}
            </div>
          </Card>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <SelectableTable
            rows={lotes}
            columns={columns}
            actions={bulkActions}
            isSelectable={(r) => r.estado === "A" || r.estado === "C"}
            emptyMessage="Sin lotes que coincidan con los filtros."
            loading={loading}
            onActionComplete={fetchLotes}
          />
        </motion.div>
      </div>

      {/* Modal sin factura */}
      {addSfOpen && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          onClick={() => !addingSf && setAddSfOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Nuevo Lote Sin Factura</h3>
              <button
                className={styles.modalClose}
                onClick={() => setAddSfOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Obra Social</label>
                <AppSearchSelect
                  options={obras.map((o) => ({
                    id: String(osId(o)),
                    label: `${osId(o)} — ${osNombre(o)}`,
                  }))}
                  value={addSfOs || null}
                  onChange={(val) => setAddSfOs(val ? String(val) : "")}
                  disabled={obrasLoading || addingSf}
                  loading={obrasLoading}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Mes</label>
                <select
                  className={styles.formSelect}
                  value={addSfMes}
                  onChange={(e) => setAddSfMes(e.target.value)}
                  disabled={addingSf}
                >
                  <option value="">Seleccioná un mes…</option>
                  {MESES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Año</label>
                <select
                  className={styles.formSelect}
                  value={addSfAnio}
                  onChange={(e) => setAddSfAnio(e.target.value)}
                  disabled={addingSf}
                >
                  <option value="">Seleccioná un año…</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setAddSfOpen(false)}
                disabled={addingSf}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAddSinFactura}
                disabled={addingSf || !addSfOs || !addSfMes || !addSfAnio}
              >
                {addingSf ? "Creando…" : "Crear Lote"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar lote */}
      {deleteTarget && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          onClick={closeDeleteModal}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                {deleteStep === 1 ? "Eliminar Lote" : "Confirmar eliminación"}
              </h3>
              <button
                className={styles.modalClose}
                onClick={closeDeleteModal}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {deleteStep === 1 && (
              <>
                <div className={styles.modalBody}>
                  <p style={{ margin: 0 }}>
                    Estás por eliminar el siguiente lote:
                  </p>
                  <div className={styles.deleteInfoBox}>
                    <div className={styles.deleteInfoRow}>
                      <span className={styles.deleteInfoLabel}>Obra Social</span>
                      <span>{deleteTarget.obra_social_nombre} (#{deleteTarget.obra_social_id})</span>
                    </div>
                    <div className={styles.deleteInfoRow}>
                      <span className={styles.deleteInfoLabel}>Período</span>
                      <span>{mesLabel(deleteTarget.mes_periodo)} {deleteTarget.anio_periodo}</span>
                    </div>
                    <div className={styles.deleteInfoRow}>
                      <span className={styles.deleteInfoLabel}>Tipo</span>
                      <span>{deleteTarget.tipo === "sin_factura" ? "Sin Factura" : "Normal"}</span>
                    </div>
                    {deleteTarget.nro_factura && (
                      <div className={styles.deleteInfoRow}>
                        <span className={styles.deleteInfoLabel}>Nro. Factura</span>
                        <span style={{ fontFamily: "monospace" }}>{deleteTarget.nro_factura}</span>
                      </div>
                    )}
                    <div className={styles.deleteInfoRow}>
                      <span className={styles.deleteInfoLabel}>Estado</span>
                      <span className={`${styles.estadoBadge} ${estadoClass(deleteTarget.estado)}`}>
                        {estadoLabel(deleteTarget.estado)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.deleteWarning}>
                    <strong>⚠ Atención:</strong> todos los ajustes (débitos y créditos) asociados a este lote serán eliminados de forma permanente y no podrán recuperarse.
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <Button variant="secondary" onClick={closeDeleteModal}>
                    Cancelar
                  </Button>
                  <Button variant="danger" onClick={() => setDeleteStep(2)}>
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <div className={styles.modalBody}>
                  <p style={{ margin: 0 }}>
                    ¿Confirmás que querés eliminar definitivamente el lote de{" "}
                    <strong>{deleteTarget.obra_social_nombre}</strong> —{" "}
                    <strong>{mesLabel(deleteTarget.mes_periodo)} {deleteTarget.anio_periodo}</strong>?
                  </p>
                  <div className={styles.deleteWarning}>
                    Esta acción <strong>no se puede deshacer</strong>. Todos los ajustes asociados a este lote se eliminarán permanentemente.
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleteStep(1)}
                    disabled={deleting}
                  >
                    Volver
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                  >
                    {deleting ? "Eliminando…" : "Eliminar definitivamente"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal agregar */}
      {addOpen && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          onClick={() => !adding && setAddOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Nuevo Lote D/C</h3>
              <button
                className={styles.modalClose}
                onClick={() => setAddOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Obra Social</label>
                <AppSearchSelect
                  options={obras.map((o) => ({
                    id: String(osId(o)),
                    label: `${osId(o)} — ${osNombre(o)}`,
                  }))}
                  value={addOs || null}
                  onChange={(val) => handleAddOsChange(val ? String(val) : "")}
                  disabled={obrasLoading || adding}
                  loading={obrasLoading}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Período disponible</label>
                {!addOs ? (
                  <span className={styles.hintText}>
                    Seleccioná una obra social primero.
                  </span>
                ) : periodosLoading ? (
                  <span className={styles.hintText}>Cargando períodos…</span>
                ) : (
                  <select
                    className={styles.formSelect}
                    value={
                      periodosAnio && periodosMes
                        ? `${periodosAnio}-${periodosMes}`
                        : ""
                    }
                    onChange={handlePeriodoChange}
                    disabled={adding}
                  >
                    <option value="">Seleccioná un período…</option>
                    {periodos.map((p) => (
                      <option
                        key={`${p.ANIO}-${p.MES}`}
                        value={`${p.ANIO}-${p.MES}`}
                      >
                        {mesLabel(p.MES)} {p.ANIO}
                        {p.NRO_FACT_1
                          ? ` — ${p.NRO_FACT_1}${p.NRO_FACT_2 ? `-${p.NRO_FACT_2}` : ""}`
                          : ""}
                      </option>
                    ))}
                    {periodos.length === 0 && (
                      <option disabled>Sin períodos disponibles</option>
                    )}
                  </select>
                )}
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setAddOpen(false)}
                disabled={adding}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={adding || !addOs || !periodosMes || !periodosAnio}
              >
                {adding ? "Creando…" : "Crear / Abrir Lote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebitosCreditos;
