import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getJSON, postJSON, delJSON } from "../../../lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "../../../components/atoms/Button/Button";
import Card from "../../../components/atoms/Card/Card";
import styles from "./PagosList.module.scss";
import { type Pago, fmt, mesLabel, MESES } from "../types";

const PAGOS_URL = "/api/pagos/";
const now = new Date();
const YEAR_OPTIONS: number[] = Array.from({ length: 8 }, (_, i) => now.getFullYear() + 2 - i);
const MES_OPTIONS = MESES.map((nombre, i) => ({ value: i + 1, label: nombre }));

const PagosList: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [rows, setRows] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert409, setAlert409] = useState<{ pagoId: number; message: string } | null>(null);

  // Filtros
  const [filterAnio, setFilterAnio] = useState<string>("");
  const [filterMes, setFilterMes] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<string>("");

  // Modal crear
  const [openCreate, setOpenCreate] = useState(false);
  const [createAnio, setCreateAnio] = useState<number>(now.getFullYear());
  const [createMes, setCreateMes] = useState<number>(now.getMonth() + 1);
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Modal confirmar eliminar
  const [deleteTarget, setDeleteTarget] = useState<Pago | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasOpenPago = useMemo(() => rows.some((p) => p.estado === "A"), [rows]);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: Record<string, any> = { skip: 0, limit: 200 };
    if (filterAnio) params.anio = Number(filterAnio);
    if (filterMes) params.mes = Number(filterMes);
    if (filterEstado) params.estado = filterEstado;
    try {
      const data = await getJSON<Pago[]>(PAGOS_URL, params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los pagos.");
    } finally {
      setLoading(false);
    }
  }, [filterAnio, filterMes, filterEstado]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const openCreateModal = () => {
    setCreateAnio(now.getFullYear());
    setCreateMes(now.getMonth() + 1);
    setCreateDesc("");
    setAlert409(null);
    setOpenCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const body: Record<string, any> = { anio: createAnio, mes: createMes };
      if (createDesc.trim()) body.descripcion = createDesc.trim();
      const created = await postJSON<Pago>(PAGOS_URL, body);
      setRows((prev) => [created, ...prev].sort((a, b) => {
        if (b.anio !== a.anio) return b.anio - a.anio;
        return b.mes - a.mes;
      }));
      setOpenCreate(false);
      notify("Pago creado correctamente.");
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      if (status === 409) {
        const detail = e?.response?.data?.detail;
        if (detail?.reason === "pago_abierto_existe") {
          setAlert409({ pagoId: detail.pago_id, message: detail.message });
          setOpenCreate(false);
        } else {
          notify(detail?.message ?? "Conflicto al crear el pago.", "error");
        }
      } else {
        notify(e?.response?.data?.detail ?? e?.message ?? "Error al crear el pago.", "error");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await delJSON(`${PAGOS_URL}${deleteTarget.id}`);
      setRows((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify("Pago eliminado correctamente.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(typeof detail === "string" ? detail : e?.message ?? "No se pudo eliminar el pago.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const estadoLabel = (e: string) => e === "A" ? "Abierto" : "Cerrado";
  const estadoClass = (e: string) => e === "A" ? styles.estadoA : styles.estadoC;

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
              <div className={styles.breadcrumb}>LIQUIDACIÓN</div>
              <h1 className={styles.title}>Pagos</h1>
            </div>
            <div className={styles.headerActions}>
              <Button
                variant="primary"
                onClick={openCreateModal}
                disabled={hasOpenPago}
              >
                {hasOpenPago ? "Hay un pago abierto" : "+ Nuevo Pago"}
              </Button>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {alert409 && (
            <div className={styles.alertBox}>
              {alert409.message}{" "}
              <a onClick={() => { setAlert409(null); navigate(`/panel/liquidation/${alert409.pagoId}`); }}>
                Ver pago #{alert409.pagoId}
              </a>
            </div>
          )}

          <div className={styles.filters}>
            <select className={styles.filterSelect} value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
              <option value="">Todos los años</option>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className={styles.filterSelect} value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
              <option value="">Todos los meses</option>
              {MES_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className={styles.filterSelect} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="A">Abierto</option>
              <option value="C">Cerrado</option>
            </select>
          </div>

          <Card className={styles.tableCard}>
            {loading ? (
              <div className={styles.loadingState}>Cargando…</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Mes</th>
                      <th>Descripción</th>
                      <th>Estado</th>
                      <th>Fecha Cierre</th>
                      <th className={styles.numCell}>Bruto</th>
                      <th className={styles.numCell}>Débitos</th>
                      <th className={styles.numCell}>Créditos</th>
                      <th className={`${styles.numCell} ${styles.chipRed}`}>Deducciones</th>
                      <th className={styles.numCell}>Neto</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={11} className={styles.emptyCell}>
                          No hay pagos. Creá el primero.
                        </td>
                      </tr>
                    )}
                    {rows.map((p) => (
                      <tr key={p.id} onClick={() => navigate(`/panel/liquidation/${p.id}`)}>
                        <td>{p.anio}</td>
                        <td>{mesLabel(p.mes)}</td>
                        <td>{p.descripcion ?? "—"}</td>
                        <td>
                          <span className={`${styles.badge} ${estadoClass(p.estado)}`}>
                            {estadoLabel(p.estado)}
                          </span>
                        </td>
                        <td>
                          {p.cierre_timestamp
                            ? new Date(p.cierre_timestamp).toLocaleDateString("es-AR")
                            : "—"}
                        </td>
                        <td className={styles.numCell}>${fmt(p.total_bruto)}</td>
                        <td className={styles.numCell}>-${fmt(p.total_debitos)}</td>
                        <td className={styles.numCell}>+${fmt(p.total_creditos)}</td>
                        <td className={styles.numCell}>-${fmt(p.total_deduccion)}</td>
                        <td className={styles.numCell}>${fmt(p.total_neto)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget(p)}
                          >
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Modal crear */}
      {openCreate && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" onClick={() => !creating && setOpenCreate(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Nuevo Pago</h3>
              <button className={styles.modalClose} onClick={() => setOpenCreate(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.label}>Año</label>
                <select className={styles.select} value={createAnio} onChange={(e) => setCreateAnio(Number(e.target.value))}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>Mes</label>
                <select className={styles.select} value={createMes} onChange={(e) => setCreateMes(Number(e.target.value))}>
                  {MES_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>Descripción <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Ej: Primer pago Marzo 2026"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className={styles.muted}>Se creará el pago en estado Abierto con totales en $0.</div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setOpenCreate(false)} disabled={creating}>Cancelar</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Creando…" : "Crear"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Eliminar Pago</h3>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>¿Seguro que querés eliminar el pago de <strong>{mesLabel(deleteTarget.mes)} {deleteTarget.anio}</strong>?<br />Esta acción no se puede deshacer.</p>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagosList;
