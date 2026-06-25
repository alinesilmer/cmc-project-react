import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

import Button from "../../../components/atoms/Button/Button";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { listarPrestaciones, anularPrestacion } from "../api";
import type { ListarPrestacionesParams, ObraSocialOption, PrestacionRead } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import { FACTURACION_FILTROS_KEY } from "../constants";
import PeriodoBadge from "../components/PeriodoBadge";
import PrestacionStateChip from "../components/PrestacionStateChip";
import ImporteDisplay from "../components/ImporteDisplay";
import FiltrosPanel from "./FiltrosPanel";
import EditarPrestacionModal from "./EditarPrestacionModal";
import MoverPeriodoModal from "./MoverPeriodoModal";
import styles from "./ListadoPrestaciones.module.scss";

const PAGE_SIZES = [25, 50, 100, 200];
const DEFAULT_LIMIT = 50;

const loadFiltros = (): ListarPrestacionesParams => {
  try {
    const raw = sessionStorage.getItem(FACTURACION_FILTROS_KEY);
    return raw ? JSON.parse(raw) : { limit: DEFAULT_LIMIT, offset: 0 };
  } catch {
    return { limit: DEFAULT_LIMIT, offset: 0 };
  }
};

const ListadoPrestaciones: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [filtros, setFiltros] = useState<ListarPrestacionesParams>(loadFiltros);
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [rows, setRows] = useState<PrestacionRead[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editando, setEditando] = useState<PrestacionRead | null>(null);
  const [moviendoPeriodo, setMoviendoPeriodo] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: ListarPrestacionesParams) => {
    setLoading(true);
    try {
      const { data, totalCount: tc } = await listarPrestaciones(f);
      setRows(data);
      setTotalCount(tc);
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al cargar", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    sessionStorage.setItem(FACTURACION_FILTROS_KEY, JSON.stringify(filtros));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filtros), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filtros, fetchData]);

  const handleObraSocialChange = (nro: number | null, os: ObraSocialOption | null) => {
    setObraSocial(os);
    setFiltros((f) => ({ ...f, cod_obra: nro ? String(nro) : undefined, offset: 0 }));
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const selectableIds = rows.filter((r) => r.estado === "A").map((r) => r.id);
    if (selectableIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const handleAnular = async (row: PrestacionRead) => {
    if (!confirm(`¿Anular la prestación #${row.nro_orden ?? row.id}?`)) return;
    try {
      await anularPrestacion(row.id);
      notify("Prestación anulada.");
      fetchData(filtros);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) {
        notify("Solo podés anular tus propias prestaciones.", "error");
      } else {
        notify(detailMessage(e?.response?.data?.detail) || "No se pudo anular.", "error");
      }
    }
  };

  const limit = filtros.limit ?? DEFAULT_LIMIT;
  const offset = filtros.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = totalCount !== undefined ? Math.ceil(totalCount / limit) : undefined;

  const seleccionadas = rows.filter((r) => selected.has(r.id));
  const periodo = filtros.periodo;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Listado de prestaciones</h1>
        {periodo && <PeriodoBadge label={periodo} />}
        {obraSocial && (
          <span style={{ fontSize: 13, background: "rgba(255,255,255,0.15)", padding: "2px 10px", borderRadius: 12 }}>
            OS: {obraSocial.nro_obra_social} · {obraSocial.nombre}
          </span>
        )}
        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/panel/facturacion")}>
            ← Volver
          </Button>
        </div>
      </header>

      <FiltrosPanel
        filtros={filtros}
        onFiltrosChange={setFiltros}
        obraSocial={obraSocial}
        onObraSocialChange={handleObraSocialChange}
        disabled={loading}
      />

      <motion.div
        className={styles.body}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {selected.size > 0 && (
          <div className={styles.bulkBar}>
            <span>{selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMoviendoPeriodo(true)}
            >
              Mover período
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Deseleccionar
            </Button>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={rows.filter((r) => r.estado === "A").length > 0 &&
                      rows.filter((r) => r.estado === "A").every((r) => selected.has(r.id))}
                    disabled={loading}
                  />
                </th>
                <th>Período</th>
                <th>Médico</th>
                <th>OS</th>
                <th>Código</th>
                <th>Paciente</th>
                <th>Tipo</th>
                <th>Importe</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className={styles.emptyCell}>Cargando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className={styles.emptyCell}>Sin resultados.</td></tr>
              )}
              {!loading && rows.map((row) => {
                const editable = row.estado === "A";
                const isChecked = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={editable ? undefined : styles.rowDisabled}
                    onClick={() => editable && toggleRow(row.id)}
                    style={editable ? { cursor: "pointer" } : undefined}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(row.id)}
                        disabled={!editable}
                      />
                    </td>
                    <td>{row.periodo}</td>
                    <td>{row.cod_medico}</td>
                    <td>{row.cod_obra_social}</td>
                    <td>{row.cod_nomenclador}</td>
                    <td>{row.nombre_paciente ?? row.dni_paciente ?? "—"}</td>
                    <td>{row.tipo ?? "—"}</td>
                    <td><ImporteDisplay value={row.importe_total} /></td>
                    <td>{row.estado ? <PrestacionStateChip estado={row.estado} /> : "—"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className={styles.actionCell}>
                        <button
                          title="Editar"
                          disabled={!editable}
                          onClick={() => setEditando(row)}
                          style={{
                            background: "none", border: "none", cursor: editable ? "pointer" : "not-allowed",
                            opacity: editable ? 1 : 0.4, color: "#0c2a52", padding: "2px 4px",
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Anular"
                          disabled={!editable}
                          onClick={() => handleAnular(row)}
                          style={{
                            background: "none", border: "none", cursor: editable ? "pointer" : "not-allowed",
                            opacity: editable ? 1 : 0.4, color: "#cc2a2a", padding: "2px 4px",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          {totalCount !== undefined && (
            <span>{totalCount} resultado{totalCount !== 1 ? "s" : ""}</span>
          )}
          <select
            value={limit}
            onChange={(e) => setFiltros((f) => ({ ...f, limit: Number(e.target.value), offset: 0 }))}
            style={{ fontSize: 12 }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} por página</option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setFiltros((f) => ({ ...f, offset: Math.max(0, offset - limit) }))}
          >
            ◀
          </Button>
          <span>{page}{totalPages ? ` / ${totalPages}` : ""}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={(totalCount !== undefined && offset + limit >= totalCount) || rows.length < limit || loading}
            onClick={() => setFiltros((f) => ({ ...f, offset: offset + limit }))}
          >
            ▶
          </Button>
        </div>
      </motion.div>

      <EditarPrestacionModal
        prestacion={editando}
        onClose={() => setEditando(null)}
        onSaved={(updated) => {
          setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r));
          notify("Prestación actualizada.");
        }}
      />

      <MoverPeriodoModal
        isOpen={moviendoPeriodo}
        seleccionadas={seleccionadas}
        onClose={() => setMoviendoPeriodo(false)}
        onMoved={(_, periodoDestino) => {
          notify(`Prestaciones movidas al período ${periodoDestino}.`);
          setSelected(new Set());
          setMoviendoPeriodo(false);
          fetchData(filtros);
        }}
      />
    </div>
  );
};

export default ListadoPrestaciones;
