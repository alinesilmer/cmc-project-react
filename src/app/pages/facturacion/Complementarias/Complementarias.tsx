import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layers, Search, Eye, Plus, FilePlus2, FileCheck2 } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { listarFacturas } from "../api";
import type { FacturaRead, ListarFacturasParams, ObraSocialOption } from "../types";
import { detailMessage, versionLabel } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import NuevaComplementariaModal from "./NuevaComplementariaModal";
import styles from "./Complementarias.module.scss";

const PAGE_SIZES = [25, 50, 100, 200];
const DEFAULT_LIMIT = 50;

const ESTADOS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos" },
  { value: "A", label: "Abierta" },
  { value: "C", label: "Cerrada" },
];

const estadoBadgeClass = (estado: string | null): string => {
  switch (estado) {
    case "A": return styles.estadoAbierta;
    case "C": return styles.estadoCerrada;
    default:  return styles.estadoDefault;
  }
};

const estadoLabel = (estado: string | null): string => {
  switch (estado) {
    case "A": return "Abierta";
    case "C": return "Cerrada";
    default:  return estado || "—";
  }
};

const fmtFecha = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const Complementarias: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [filtros, setFiltros] = useState<ListarFacturasParams>({
    limit: DEFAULT_LIMIT,
    offset: 0,
    solo_complementos: true,
  });
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [rows, setRows] = useState<FacturaRead[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: ListarFacturasParams) => {
    setLoading(true);
    try {
      const { data, totalCount: tc } = await listarFacturas(f);
      setRows(data);
      setTotalCount(tc);
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al cargar las facturas complementarias.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filtros), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filtros, fetchData]);

  const set = (patch: Partial<ListarFacturasParams>) =>
    setFiltros((f) => ({ ...f, ...patch, offset: 0 }));

  const handleObraSocialChange = (nro: number | null, os: ObraSocialOption | null) => {
    setObraSocial(os);
    set({ cod_obra: nro ? String(nro) : undefined });
  };

  const handleLimpiar = () => {
    setObraSocial(null);
    setFiltros({ limit: filtros.limit ?? DEFAULT_LIMIT, offset: 0, solo_complementos: true });
  };

  const handleCreated = (factura: FacturaRead) => {
    setModalOpen(false);
    notify(`Complemento abierto — ${versionLabel(factura.version)} de ${factura.periodo_label || factura.periodo}`);
    navigate(`/panel/facturacion/complementarias/${factura.id_prestaciones}/cargar`);
  };

  const limit = filtros.limit ?? DEFAULT_LIMIT;
  const offset = filtros.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = totalCount !== undefined ? Math.max(1, Math.ceil(totalCount / limit)) : undefined;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <Layers size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Lista de facturas complementarias</h1>
          <p className={styles.subtitle}>Facturas adicionales para períodos ya cerrados y enviados.</p>
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.btnPrimary} onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Nueva complementaria
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
            <label className={styles.filterLabel}>Obra social</label>
            <ObraSocialAutocomplete
              value={obraSocial?.nro_obra_social ?? null}
              onChange={handleObraSocialChange}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Período</label>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Ej. 202607"
              value={filtros.periodo ?? ""}
              onChange={(e) => set({ periodo: e.target.value || undefined })}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Operador</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Usuario"
              value={filtros.usuario ?? ""}
              onChange={(e) => set({ usuario: e.target.value || undefined })}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estado</label>
            <select
              className={styles.select}
              value={filtros.estado ?? ""}
              onChange={(e) => set({ estado: e.target.value || undefined })}
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
            <label className={styles.filterLabel}>Nº de factura</label>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={16} />
              <input
                className={`${styles.input} ${styles.searchInput}`}
                type="text"
                placeholder="Buscar por número de factura…"
                value={filtros.q ?? ""}
                onChange={(e) => set({ q: e.target.value || undefined })}
              />
            </div>
          </div>

          <button type="button" className={styles.clearBtn} onClick={handleLimpiar} disabled={loading}>
            Limpiar filtros
          </button>
        </div>

        <motion.div
          className={styles.tableWrap}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Obra social</th>
                <th>Período</th>
                <th>Versión</th>
                <th>Operador</th>
                <th>Estado</th>
                <th>Fecha de cierre</th>
                <th>Factura</th>
                <th>Nº Exp.</th>
                <th>Total</th>
                <th className={styles.thActions}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className={styles.loadingCell}>Cargando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    No hay facturas complementarias.
                  </td>
                </tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id_prestaciones}>
                  <td><span className={styles.osCell}>{row.cod_obr || "—"}</span></td>
                  <td>
                    <span className={styles.periodoLabel}>{row.periodo_label || row.periodo}</span>
                    {row.periodo_label && <span className={styles.periodoCode}>{row.periodo}</span>}
                  </td>
                  <td>
                    <span className={styles.versionBadge}>{versionLabel(row.version)}</span>
                  </td>
                  <td>{row.usuario || <span className={styles.mutedText}>—</span>}</td>
                  <td>
                    <span className={`${styles.estadoBadge} ${estadoBadgeClass(row.estado)}`}>
                      {estadoLabel(row.estado)}
                    </span>
                  </td>
                  <td>{fmtFecha(row.fecha)}</td>
                  <td>
                    {row.nro_factura ? (
                      <span className={styles.facturaCell}>
                        <span className={styles.facturaNro}>{row.nro_factura}</span>
                        {row.tipo_factura && (
                          <span className={styles.versionBadge}>{row.tipo_factura}</span>
                        )}
                      </span>
                    ) : (
                      <span className={styles.mutedText}>Sin factura</span>
                    )}
                  </td>
                  <td><span className={styles.facturaNro}>{row.id_prestaciones}</span></td>
                  <td><span className={styles.totalCell}>{formatMoney(row.importe)}</span></td>
                  <td>
                    <div className={styles.actionsCell}>
                      {row.estado === "A" && (
                        <>
                          <button
                            type="button"
                            className={styles.btnGhostAction}
                            onClick={() => navigate(`/panel/facturacion/complementarias/${row.id_prestaciones}/cargar`)}
                          >
                            <FilePlus2 size={14} /> Cargar
                          </button>
                          <button
                            type="button"
                            className={styles.btnGhostAction}
                            onClick={() => navigate("/panel/facturacion/cierre")}
                          >
                            <FileCheck2 size={14} /> Cerrar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={styles.btnView}
                        onClick={() => navigate(`/panel/facturacion/periodos/${row.id_prestaciones}`)}
                      >
                        <Eye size={14} /> Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {totalCount !== undefined
              ? `${totalCount} complementaria${totalCount !== 1 ? "s" : ""}`
              : "—"}
          </span>
          <div className={styles.pageControls}>
            <select
              className={styles.pageSelect}
              value={limit}
              onChange={(e) => setFiltros((f) => ({ ...f, limit: Number(e.target.value), offset: 0 }))}
              disabled={loading}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} por página</option>
              ))}
            </select>
            <div className={styles.pageBtns}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={offset === 0 || loading}
                onClick={() => setFiltros((f) => ({ ...f, offset: Math.max(0, offset - limit) }))}
              >
                ◀ Anterior
              </button>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={
                  (totalCount !== undefined && offset + limit >= totalCount) ||
                  rows.length < limit ||
                  loading
                }
                onClick={() => setFiltros((f) => ({ ...f, offset: offset + limit }))}
              >
                Siguiente ▶
              </button>
            </div>
            <span className={styles.pageInfo}>
              Página {page}{totalPages ? ` / ${totalPages}` : ""}
            </span>
          </div>
        </div>
      </div>

      <NuevaComplementariaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default Complementarias;
